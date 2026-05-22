"""Fit `Params` against a target mesh's three silhouettes.

Distance: rasterise each silhouette to a 96x96 grid and compute
(1 - IoU). Total loss is the sum over the three views.

Optimiser: random search + coordinate descent (no scipy). Fixed budget;
not super clever but the search space is only 8 dimensions and the
analytical evaluation is fast.
"""
from __future__ import annotations
import os
import sys
import json
import time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from model import Params, model_silhouettes


RASTER = 96


def rasterise(poly_x, poly_y, bbox):
    """Rasterise a closed polygon into a (RASTER, RASTER) boolean mask
    inside the bbox = (xmin, xmax, ymin, ymax)."""
    xmin, xmax, ymin, ymax = bbox
    if xmax <= xmin or ymax <= ymin or len(poly_x) < 3:
        return np.zeros((RASTER, RASTER), dtype=bool)
    px = (poly_x - xmin) / (xmax - xmin) * (RASTER - 1)
    py = (poly_y - ymin) / (ymax - ymin) * (RASTER - 1)
    # Even-odd polygon fill via scanline
    mask = np.zeros((RASTER, RASTER), dtype=bool)
    n = len(px)
    px = np.asarray(px); py = np.asarray(py)
    for row in range(RASTER):
        y = row + 0.5
        # Find x-crossings of horizontal line y = row+0.5 with each edge
        xs = []
        for i in range(n):
            j = (i + 1) % n
            y0, y1 = py[i], py[j]
            if (y0 <= y < y1) or (y1 <= y < y0):
                t = (y - y0) / (y1 - y0)
                xs.append(px[i] + t * (px[j] - px[i]))
        xs.sort()
        for a, b in zip(xs[0::2], xs[1::2]):
            lo = max(0, int(np.ceil(a)))
            hi = min(RASTER, int(np.floor(b)) + 1)
            if hi > lo:
                mask[row, lo:hi] = True
    return mask


def iou_distance(poly1, poly2, bbox):
    m1 = rasterise(poly1[0], poly1[1], bbox)
    m2 = rasterise(poly2[0], poly2[1], bbox)
    inter = np.logical_and(m1, m2).sum()
    union = np.logical_or(m1, m2).sum()
    if union == 0:
        return 1.0
    return 1.0 - inter / union


def chamfer_distance(poly1, poly2):
    """Symmetric chamfer distance between two polygon boundary curves.

    Boundary-shape sensitive (unlike IoU which is area-based). Both
    polygons are sampled at ~200 points; for each point of poly1, find
    the nearest in poly2 (and vice versa), average all distances.
    Returns a distance in normalised coords (≈0 for matching curves).
    """
    p1 = np.stack(poly1, axis=1)  # (N1, 2)
    p2 = np.stack(poly2, axis=1)  # (N2, 2)
    if len(p1) == 0 or len(p2) == 0:
        return 1.0
    # Subsample to keep complexity manageable
    if len(p1) > 200:
        p1 = p1[np.linspace(0, len(p1) - 1, 200, dtype=int)]
    if len(p2) > 200:
        p2 = p2[np.linspace(0, len(p2) - 1, 200, dtype=int)]
    # For each point of p1, distance to nearest in p2
    d12 = np.sqrt(((p1[:, None, :] - p2[None, :, :]) ** 2).sum(-1)).min(axis=1)
    d21 = np.sqrt(((p2[:, None, :] - p1[None, :, :]) ** 2).sum(-1)).min(axis=1)
    return 0.5 * (d12.mean() + d21.mean())


def total_loss(params: Params, target_silhouettes, bboxes,
                chamfer_weight: float = 4.0):
    model_sils = model_silhouettes(params)
    total = 0.0
    for view in range(3):
        d_iou = iou_distance(model_sils[view], target_silhouettes[view], bboxes[view])
        d_ch = chamfer_distance(model_sils[view], target_silhouettes[view])
        total += d_iou + chamfer_weight * d_ch
    return total


def target_bboxes(target_sils):
    """Take target silhouettes; return a slightly padded bbox for each view."""
    bboxes = []
    for xs, ys in target_sils:
        if len(xs) == 0:
            bboxes.append((-0.6, 0.6, -0.6, 0.6))
            continue
        xmin, xmax = xs.min(), xs.max()
        ymin, ymax = ys.min(), ys.max()
        cx = 0.5 * (xmin + xmax); cy = 0.5 * (ymin + ymax)
        half_x = max(0.6, 0.6 * (xmax - xmin))
        half_y = max(0.6, 0.6 * (ymax - ymin))
        # Use shared half so aspect ratio is preserved across all 3 views
        # (we'd rather over-bound than under-bound)
        half = max(half_x, half_y, 0.55)
        bboxes.append((cx - half, cx + half, cy - half, cy + half))
    return bboxes


# Parameter bounds for random search — match new Params fields.
BOUNDS = {
    "lat_half":    (0.30, 1.05),
    "p_ant":       (1.5, 5.0),
    "p_post":      (1.5, 10.0),
    "apex_y":      (-0.20, 0.20),
    "dorsal_z":    (0.04, 0.40),
    "ventral_z":   (0.02, 0.30),
    "dome_k":      (1.5, 7.0),
    "sulcus_depth":(0.0, 0.7),
    "sulcus_sigma":(0.18, 0.55),
}
ORDER = list(BOUNDS.keys())


def random_search(target_sils, bboxes, n_iter=120, rng=None):
    if rng is None:
        rng = np.random.default_rng(42)
    best_arr = None
    best_loss = float("inf")
    for _ in range(n_iter):
        a = np.array([rng.uniform(*BOUNDS[k]) for k in ORDER])
        p = Params.from_array(a)
        loss = total_loss(p, target_sils, bboxes)
        if loss < best_loss:
            best_loss = loss
            best_arr = a
    return best_arr, best_loss


def coordinate_descent(start, target_sils, bboxes, sweeps=2):
    arr = start.copy()
    best_loss = total_loss(Params.from_array(arr), target_sils, bboxes)
    for _ in range(sweeps):
        for i, k in enumerate(ORDER):
            lo, hi = BOUNDS[k]
            cur = arr[i]
            candidates = np.linspace(max(lo, cur - 0.30 * (hi - lo)),
                                       min(hi, cur + 0.30 * (hi - lo)), 11)
            for c in candidates:
                arr[i] = c
                loss = total_loss(Params.from_array(arr), target_sils, bboxes)
                if loss < best_loss:
                    best_loss = loss
                    cur = c
            arr[i] = cur
    return arr, best_loss


def fit_species(target_sils, n_random=400, sweeps=4, n_restarts=4):
    """Multi-restart fit, where each restart does random search + full
    coordinate descent, and we keep the best across restarts."""
    bboxes = target_bboxes(target_sils)
    best_arr = None
    best_loss = float("inf")
    for restart in range(n_restarts):
        rng = np.random.default_rng(13 + restart * 999)
        arr, loss = random_search(target_sils, bboxes, n_iter=n_random // n_restarts,
                                    rng=rng)
        arr, loss = coordinate_descent(arr, target_sils, bboxes, sweeps=sweeps)
        if loss < best_loss:
            best_loss = loss
            best_arr = arr
    return Params.from_array(best_arr), best_loss


# -----------------------------------------------------------------------
# Driver
# -----------------------------------------------------------------------

SPECIES = [
    ("brachiopod_atrypa_devoniana_pri_70763.glb", "Atrypa devoniana"),
    ("brachiopod_spinocyrtia_iowensis_pri_70766.glb", "Spinocyrtia iowensis"),
    ("brachiopod_pentamerus_oblongus_pri_42138.glb", "Pentamerus oblongus"),
    ("brachiopod_mucrospirifer_arkonensis_pri_76891.glb", "Mucrospirifer arkonensis"),
    ("hebertella_occidentalis_pri_70759.glb", "Hebertella occidentalis"),
]


def main():
    from glb_loader import load_glb
    from silhouette import canonicalise, mesh_silhouettes
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    glb_dir = os.path.abspath(os.path.join(HERE, "..", "3d_models"))
    n = len(SPECIES)
    fig, axes = plt.subplots(n, 6, figsize=(24, 4.0 * n),
                             gridspec_kw=dict(wspace=0.06, hspace=0.25))
    results = []
    t0 = time.time()
    for r, (fname, label) in enumerate(SPECIES):
        path = os.path.join(glb_dir, fname)
        print(f"  loading {fname}...", end=" ", flush=True)
        V, T = load_glb(path)
        Vc = canonicalise(V)
        target_sils = mesh_silhouettes(Vc)
        print(f"fitting...", end=" ", flush=True)
        params, loss = fit_species(target_sils, n_random=120, sweeps=2)
        print(f"loss={loss:.3f}, params={asdict_compact(params)}")
        results.append((label, params, loss))

        model_sils = model_silhouettes(params)
        view_titles = ["TOP", "FRONT", "SIDE"]
        for c in range(3):
            # Mesh silhouette
            ax_m = axes[r][c]
            xs, ys = target_sils[c]
            ax_m.fill(xs, ys, facecolor="#e8e3d4", edgecolor="black", linewidth=1.2)
            ax_m.set_aspect("equal")
            ax_m.set_xticks([]); ax_m.set_yticks([])
            for s in ax_m.spines.values(): s.set_visible(False)
            if r == 0:
                ax_m.set_title(f"MESH {view_titles[c]}", fontsize=9, color="#6b3410")

            # Model silhouette
            ax_f = axes[r][c + 3]
            xs, ys = model_sils[c]
            ax_f.fill(xs, ys, facecolor="#fffef7", edgecolor="black", linewidth=1.2)
            ax_f.set_aspect("equal")
            ax_f.set_xticks([]); ax_f.set_yticks([])
            for s in ax_f.spines.values(): s.set_visible(False)
            if r == 0:
                ax_f.set_title(f"FIT {view_titles[c]}", fontsize=9, color="#6b3410")
        axes[r][0].set_ylabel(f"{label}\nloss={loss:.2f}", fontsize=8, color="#6b3410",
                              rotation=0, labelpad=70, ha="right", va="center")

    round_tag = os.environ.get("ROUND_TAG", "round1")
    out = os.path.join(HERE, f"fit_{round_tag}.png")
    fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    print(f"\nWrote {out} in {time.time() - t0:.1f}s")
    # Save results
    out_json = os.path.join(HERE, f"fit_{round_tag}.json")
    with open(out_json, "w") as f:
        json.dump([dict(name=lbl, loss=loss, params=asdict_full(p))
                    for lbl, p, loss in results], f, indent=2)


def asdict_full(p: Params):
    from dataclasses import asdict
    return asdict(p)


def asdict_compact(p: Params):
    return {k: round(v, 3) if isinstance(v, float) else v
            for k, v in asdict_full(p).items()}


if __name__ == "__main__":
    main()
