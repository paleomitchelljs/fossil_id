"""Canonicalize a brachiopod mesh and extract three silhouettes.

Canonical frame:
  X: lateral (left ↔ right)
  Y: anteroposterior (back/umbo → front/anterior). +Y = anterior.
  Z: dorsoventral (ventral ↔ dorsal). +Z = dorsal.

The mesh comes in with unknown orientation, so we:
  1) Centre on the centroid.
  2) PCA: longest principal axis → Y, medium → X, shortest → Z.
  3) Disambiguate sign of Y (anterior = wider end of the shell).
     Disambiguate sign of Z (dorsal = the more-inflated valve;
     for now we accept either with a flip option).
  4) Scale uniformly so the AP extent = 1 (so all shells live in a
     comparable normalised box). Real-world scale is irrelevant to
     shape fitting.

Silhouettes are extracted by projecting all vertices to each axis-aligned
plane (XY for TOP, XZ for FRONT, YZ for SIDE) and computing the alpha
hull. For simplicity we use a coarse-grid "upper/lower envelope" rather
than a real concave hull.
"""
from __future__ import annotations
import numpy as np


def _cross_section_asymmetry(values: np.ndarray, perp_values: np.ndarray) -> float:
    """Return how much the cross-sectional extent varies along `values`.

    Splits `values` into low (bottom 20%) and high (top 20%) bands and
    computes the std of the perpendicular coords in each band. Returns
    |high_std - low_std| / (high_std + low_std). Symmetric axes
    (lateral, with cardinals at both ends) score near 0. Asymmetric
    axes (AP, with umbo at one end and broad commissure at the other)
    score closer to 1.
    """
    lo_thr = np.percentile(values, 20)
    hi_thr = np.percentile(values, 80)
    lo_perp = perp_values[values <= lo_thr]
    hi_perp = perp_values[values >= hi_thr]
    if lo_perp.size == 0 or hi_perp.size == 0:
        return 0.0
    lo_spread = float(np.linalg.norm(lo_perp - lo_perp.mean(0), axis=1).std())
    hi_spread = float(np.linalg.norm(hi_perp - hi_perp.mean(0), axis=1).std())
    if lo_spread + hi_spread < 1e-9:
        return 0.0
    return abs(hi_spread - lo_spread) / (hi_spread + lo_spread)


def canonicalise(verts: np.ndarray) -> np.ndarray:
    """Centre + orient to canonical (X=lateral, Y=AP, Z=DV) + scale.

    The DV axis is the shortest principal axis — always reliable for
    brachiopods, which are flatter dorsoventrally than they are wide or
    long.

    Distinguishing AP from lateral by axis length FAILS on wide-alate
    shells (Spinocyrtia, Mucrospirifer) whose lateral axis is longer.
    We instead pick the AP axis by CROSS-SECTION ASYMMETRY: at one end
    of the AP axis the shell tapers to the umbo (small cross-section);
    at the other end is the broad anterior commissure (large cross-
    section). The lateral axis has cardinals at both ends with similar
    cross-sections.
    """
    V = verts - verts.mean(axis=0)
    # PCA via SVD — vt rows are principal axes, largest variance first.
    _, _, vt = np.linalg.svd(V, full_matrices=False)
    # Smallest principal axis → DV (Z).
    dv_axis = vt[2]
    # The two remaining principal axes are candidates for AP and lateral.
    cand_axes = [vt[0], vt[1]]

    # Project to each candidate axis; the one with the higher cross-
    # section asymmetry is AP.
    asymmetries = []
    V_dv = V @ dv_axis
    for ax in cand_axes:
        proj = V @ ax
        # perpendicular coords are in the other candidate axis + DV
        other = cand_axes[1] if np.allclose(ax, cand_axes[0]) else cand_axes[0]
        perp_a = V @ other
        perp = np.stack([perp_a, V_dv], axis=1)
        asymmetries.append(_cross_section_asymmetry(proj, perp))
    ap_idx = int(np.argmax(asymmetries))
    ap_axis = cand_axes[ap_idx]
    lat_axis = cand_axes[1 - ap_idx]

    R = np.stack([lat_axis, ap_axis, dv_axis], axis=0)
    if np.linalg.det(R) < 0:
        R[0] = -R[0]
    V2 = V @ R.T

    # Disambiguate sign of Y (anterior = broad cross-section end).
    lo_thr = np.percentile(V2[:, 1], 20)
    hi_thr = np.percentile(V2[:, 1], 80)
    lo = V2[V2[:, 1] <= lo_thr]
    hi = V2[V2[:, 1] >= hi_thr]
    if lo.size and hi.size:
        if lo[:, [0, 2]].std() > hi[:, [0, 2]].std():
            # Broad end is at negative Y — flip Y (and Z to stay right-handed)
            V2[:, 1] *= -1
            V2[:, 2] *= -1

    # Disambiguate sign of Z (dorsal valve = the more inflated one).
    z_pos = V2[V2[:, 2] > 0, 2]
    z_neg = V2[V2[:, 2] < 0, 2]
    if z_pos.size and z_neg.size and z_pos.max() < -z_neg.min():
        V2[:, 2] *= -1
        V2[:, 0] *= -1

    # Scale so AP extent is exactly 1, centred on AP midpoint.
    y_min, y_max = V2[:, 1].min(), V2[:, 1].max()
    y_range = y_max - y_min
    if y_range > 0:
        V2 /= y_range
        V2[:, 1] -= (V2[:, 1].max() + V2[:, 1].min()) * 0.5
    return V2


def silhouette_envelope(points: np.ndarray, axis_a: int, axis_b: int,
                        n_bins: int = 200):
    """Project (x_a, x_b) and return (a, b) of the closed silhouette polygon.

    Bins along axis_a; for each bin, takes the min and max of axis_b.
    Returns (xs, ys) of the closed polygon traversed forward along the
    upper envelope and back along the lower envelope.
    """
    a = points[:, axis_a]
    b = points[:, axis_b]
    a_min, a_max = a.min(), a.max()
    if a_max <= a_min:
        return np.array([]), np.array([])
    edges = np.linspace(a_min, a_max, n_bins + 1)
    centres = 0.5 * (edges[:-1] + edges[1:])
    upper = np.full(n_bins, -np.inf)
    lower = np.full(n_bins, np.inf)
    idx = np.clip(np.searchsorted(edges[1:-1], a), 0, n_bins - 1)
    # Vectorised reduce: use np.maximum.at / np.minimum.at
    np.maximum.at(upper, idx, b)
    np.minimum.at(lower, idx, b)
    valid = np.isfinite(upper) & np.isfinite(lower)
    centres = centres[valid]
    upper = upper[valid]
    lower = lower[valid]
    xs = np.concatenate([centres, centres[::-1]])
    ys = np.concatenate([upper, lower[::-1]])
    return xs, ys


def mesh_silhouettes(verts_canon: np.ndarray):
    """Return (top, front, side) silhouettes, each a tuple of arrays
    (poly_x, poly_y) for the closed silhouette polygon.

    TOP   = (X, Y) projection — looking down the Z axis (full envelope)
    FRONT = (X, Z) projection — cross-section near the anterior margin
            (only verts with y > 0.25; matches what an anterior photo shows)
    SIDE  = (Y, Z) projection — full lateral envelope
    """
    top = silhouette_envelope(verts_canon, 0, 1)   # X, Y
    # FRONT: anterior cross-section
    anterior = verts_canon[verts_canon[:, 1] > 0.25]
    front = silhouette_envelope(anterior, 0, 2) if len(anterior) else ([], [])
    side = silhouette_envelope(verts_canon, 1, 2)  # Y, Z
    return top, front, side


if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from glb_loader import load_glb
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    if len(sys.argv) < 2:
        print("Usage: silhouette.py <path-to-glb> [...]")
        sys.exit(1)

    n = len(sys.argv) - 1
    fig, axes = plt.subplots(n, 3, figsize=(9, 3 * n))
    if n == 1:
        axes = [axes]

    for r, path in enumerate(sys.argv[1:]):
        V, T = load_glb(path)
        Vc = canonicalise(V)
        top, front, side = mesh_silhouettes(Vc)
        for c, (sil, label) in enumerate(zip([top, front, side],
                                              ["TOP (XY)", "FRONT (XZ)", "SIDE (YZ)"])):
            ax = axes[r][c]
            xs, ys = sil
            ax.fill(xs, ys, facecolor="#fffef7", edgecolor="black", linewidth=1.6)
            ax.set_aspect("equal")
            ax.set_xticks([]); ax.set_yticks([])
            for s in ax.spines.values(): s.set_visible(False)
            if r == 0:
                ax.set_title(label, fontsize=10, color="#6b3410")
        name = path.split("/")[-1].replace(".glb", "")
        axes[r][0].set_ylabel(name, fontsize=8, color="#6b3410",
                              rotation=0, labelpad=80, ha="right", va="center")

    import os
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "silhouette_test.png")
    fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    print("Wrote", out)
