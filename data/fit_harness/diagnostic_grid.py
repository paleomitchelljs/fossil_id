#!/usr/bin/env python3
"""Diagnostic grid with shell-extent scaling and fit metrics.

For each brach (side + anterior views):
  1. Load pre-sliced view from per-brach subfolder
  2. Detect shell extent (non-white pixel bbox)
  3. Scale PARAM silhouette bbox → shell bbox (not crop rectangle)
  4. Overlay red PARAM outline on photo
  5. Compute three fit indices:
       - WHITE INSIDE OUTLINE: PARAM area that's empty (overstep)
       - NONWHITE OUTSIDE OUTLINE: shell area that's outside PARAM (undersht)
       - COMMISSURE MATCH: distance between PARAM's cy line and the
         photo's estimated commissure (widest cross-section in side view)

Output: data/fit_harness/diagnostic_grid_all.png
"""
import os, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "visualizer_test"))
from render import path_to_polylines
from diagnostic_overlay import SPECIMENS, gen_svgs, IMG_DIR
import xml.etree.ElementTree as ET
import re

NS = "{http://www.w3.org/2000/svg}"
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))


# ---------- Shell + PARAM silhouette extraction ----------

REF_DIR = os.path.join(HERE, "reference_outlines")


def reference_outline_path(brach_name, view):
    """Try to find a hand-drawn reference outline for this brach+view.
    Returns path if exists, else None."""
    candidates = [
        f"{brach_name}_*_{view}.png",
    ]
    import glob
    for pat in candidates:
        hits = glob.glob(os.path.join(REF_DIR, pat))
        if hits:
            return hits[0]
    return None


def nonwhite_mask(pil_img, threshold=235):
    """Binary mask of non-white pixels (the shell)."""
    arr = np.asarray(pil_img.convert("L"))
    return arr < threshold


def red_outline_mask(pil_img):
    """Binary mask of red pixels (the hand-drawn reference outline).
    Reference outlines have a thick red stroke around the silhouette;
    we fill the interior to get a solid mask comparable to the
    nonwhite_mask used for photos.
    """
    arr = np.asarray(pil_img.convert("RGB"))
    R, G, B = arr[..., 0], arr[..., 1], arr[..., 2]
    # Red stroke: R high, G/B low
    red_stroke = (R > 180) & (G < 130) & (B < 130)
    # Flood-fill the interior of the red outline. Quick way: combine
    # red stroke + non-white interior. Anything inside the red ring
    # is also part of the silhouette.
    nonwhite = nonwhite_mask(pil_img, threshold=245)
    return nonwhite | red_stroke


def bbox_of_mask(mask):
    """(x0, y0, x1, y1) of True pixels in mask. Returns None if empty."""
    if not mask.any():
        return None
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    y0, y1 = np.where(rows)[0][[0, -1]]
    x0, x1 = np.where(cols)[0][[0, -1]]
    return (int(x0), int(y0), int(x1) + 1, int(y1) + 1)


def parse_svg_paths(svg_path):
    """Return list of (polylines, stroke, sw, fill, dashed) for every <path>."""
    tree = ET.parse(svg_path)
    root = tree.getroot()
    out = []

    def walk(elem):
        if elem.tag.endswith("defs"):
            return
        for child in elem:
            tag = child.tag.replace(NS, "")
            if tag == "g":
                walk(child)
            elif tag == "path":
                d = child.get("d", "")
                if not d:
                    continue
                stroke = child.get("stroke", "none")
                sw = float(child.get("stroke-width", "1"))
                fill = child.get("fill", "none")
                dashed = bool(child.get("stroke-dasharray", ""))
                out.append((path_to_polylines(d), stroke, sw, fill, dashed))

    walk(root)
    return out


def param_silhouette_polygons(svg_path):
    """Return list of polygons (list of (x,y) tuples) that constitute the
    PARAM body fill — the main shell silhouette. Skips overlay decorations
    (hatching, interarea trapezoid, etc.) by filtering: only paths whose
    fill is non-none and whose polyline is closed-ish AND large.
    """
    paths = parse_svg_paths(svg_path)
    polys = []
    for polylines, stroke, sw, fill, dashed in paths:
        if fill in ("none", "transparent", ""):
            continue
        # Take first polyline (the main closed shape)
        if not polylines:
            continue
        pl = polylines[0]
        if len(pl) < 6:
            continue
        polys.append(pl)
    return polys


def silhouette_bbox(polys):
    """Bounding box of all polygon points."""
    if not polys:
        return None
    xs = [p[0] for poly in polys for p in poly]
    ys = [p[1] for poly in polys for p in poly]
    return (min(xs), min(ys), max(xs), max(ys))


def stroke_polylines(svg_path):
    """Polylines for the BODY OUTLINE + the internal commissure line.

    The user noted PARAM ignores "critical internal diagnostic lines
    (like the median sulcus/fold lines)" — those lines ARE drawn in
    the SVG (frontCommissureLine, stroke=#333) but the diagnostic
    overlay was filtering them out. Loosening the filter to include
    stroke="#333" (the internal commissure) restores them so students
    see the diagnostic W/V sulcus contour they'd identify by.

    Still excluded: hingeCol "#1a1a1a" (interarea hatching/face),
    ribCol "#5a5a5a" (longitudinal rib stripes). Those are surface
    texture, not diagnostic perimeter.
    """
    paths = parse_svg_paths(svg_path)
    out = []
    for polylines, stroke, sw, fill, dashed in paths:
        s = stroke.lower()
        is_outline = s in ("black", "#000", "#000000")
        is_commissure = s in ("#333", "#333333")
        if not (is_outline or is_commissure):
            continue
        if dashed:
            continue
        out.extend(polylines)
    return out


# ---------- Mask rasterization ----------

def rasterize_param_mask(polys, src_bbox, target_w, target_h, dst_bbox):
    """Rasterize PARAM silhouette polygons into a binary mask using
    ASPECT-PRESERVING scaling: a single uniform scale (= min of the
    width-ratio and height-ratio) is used so the PARAM keeps its native
    aspect ratio. The PARAM is then centered within dst_bbox.

    This eliminates the topology-breaking distortions that bbox-stretch
    introduced (self-intersecting loops, spikes, disconnected tails) and
    means the visualization actually shows what the PARAM looks like.
    The trade-off is that IoU is no longer a fair "shape match" metric —
    a smaller-aspect PARAM in a larger-aspect bbox will have low IoU
    just from area mismatch. That's a feature: IoU now correctly flags
    aspect-ratio mismatches at the PARAM level instead of hiding them
    via stretch.
    """
    img = Image.new("L", (target_w, target_h), 0)
    draw = ImageDraw.Draw(img)
    sx0, sy0, sx1, sy1 = src_bbox
    dx0, dy0, dx1, dy1 = dst_bbox
    sw = max(1e-6, sx1 - sx0)
    sh = max(1e-6, sy1 - sy0)
    dw = dx1 - dx0
    dh = dy1 - dy0
    # Uniform scale — whichever axis is the binding constraint.
    f = min(dw / sw, dh / sh)
    # Center the scaled PARAM within dst_bbox.
    scaled_w = sw * f
    scaled_h = sh * f
    pad_x = (dw - scaled_w) / 2
    pad_y = (dh - scaled_h) / 2

    def transform(p):
        return (dx0 + pad_x + (p[0] - sx0) * f,
                dy0 + pad_y + (p[1] - sy0) * f)

    for poly in polys:
        pts = [transform(p) for p in poly]
        if len(pts) < 3:
            continue
        draw.polygon(pts, fill=255)
    return np.asarray(img) > 127


# ---------- Fit metrics ----------

def compute_fit(param_mask, shell_mask):
    """Three indices, all expressed as fractions of shell area.

      white_inside_outline  = (PARAM ∧ ¬SHELL) / SHELL_area
        — fraction of shell area that PARAM covers but where the photo
          has only background (PARAM overshoots).
      nonwhite_outside_outline = (SHELL ∧ ¬PARAM) / SHELL_area
        — fraction of shell area not covered by PARAM (PARAM undershoot).
      iou = (PARAM ∧ SHELL) / (PARAM ∨ SHELL)
        — overall agreement, 1.0 = perfect.
    """
    P = param_mask.astype(bool)
    S = shell_mask.astype(bool)
    inter = (P & S).sum()
    union = (P | S).sum()
    shell_area = S.sum()
    return dict(
        white_inside=(P & ~S).sum() / max(1, shell_area),
        nonwhite_outside=(S & ~P).sum() / max(1, shell_area),
        iou=inter / max(1, union),
    )


def perimeter_pixels(mask):
    """Boundary pixels of a binary mask. A pixel is on the perimeter if
    it is True AND at least one of its 4-neighbors is False."""
    if not mask.any():
        return np.zeros((0, 2), dtype=int)
    # Pad the mask so edge pixels are properly detected
    padded = np.pad(mask, 1, mode="constant", constant_values=False)
    # Neighbor: shifted left, right, up, down — wherever the center is
    # True but a neighbor is False, that's a perimeter pixel.
    left = padded[1:-1, :-2]
    right = padded[1:-1, 2:]
    up = padded[:-2, 1:-1]
    down = padded[2:, 1:-1]
    is_perim = mask & ~(left & right & up & down)
    ys, xs = np.where(is_perim)
    return np.column_stack([xs, ys])


def hausdorff(perim_a, perim_b):
    """Symmetric Hausdorff distance between two perimeter point sets.
    Returns max over both directions of (max over a of (min over b of
    dist(a, b))). Captures worst-case shape mismatch — small Hausdorff
    means every point on each perimeter is close to some point on the
    other.

    For speed: uses chunked broadcast for ~1000-point sets. For larger
    masks we sub-sample to 500 pts per side."""
    if perim_a.size == 0 or perim_b.size == 0:
        return None
    # Sub-sample if huge
    def sub(p, n=500):
        if len(p) <= n:
            return p
        idx = np.linspace(0, len(p) - 1, n).astype(int)
        return p[idx]
    a = sub(perim_a); b = sub(perim_b)
    # Distance matrix in chunks to avoid OOM
    def directed(p, q):
        max_min = 0.0
        chunk = 200
        for i in range(0, len(p), chunk):
            pc = p[i:i + chunk]
            d2 = ((pc[:, None, 0] - q[None, :, 0]) ** 2 +
                  (pc[:, None, 1] - q[None, :, 1]) ** 2)
            mins = np.sqrt(d2.min(axis=1))
            max_min = max(max_min, float(mins.max()))
        return max_min
    h_ab = directed(a, b)
    h_ba = directed(b, a)
    return max(h_ab, h_ba)


def zonal_iou(param_mask, shell_mask, n_radial=8):
    """Divide the bbox into N angular zones (pie-slices from centroid).
    Compute IoU within each zone. Returns list of (zone_label, iou)
    plus the worst zone (lowest IoU).

    Zone naming uses brachiopod-anatomical compass: back (umbo/hinge),
    front (commissure), top (dorsal), bottom (ventral)."""
    if not shell_mask.any():
        return None
    ys, xs = np.where(shell_mask)
    cx, cy = xs.mean(), ys.mean()
    h, w = shell_mask.shape

    # Brachiopod-anatomical zone labels — for SIDE views, posterior is
    # left, anterior is right.
    labels = [
        "back-up",      # 0
        "top-back",     # 1
        "top-front",    # 2
        "front-up",     # 3
        "front-down",   # 4
        "bottom-front", # 5
        "bottom-back",  # 6
        "back-down",    # 7
    ]

    # For each pixel, compute its angle around centroid and bucket
    # into one of N zones (each π/4 wide for N=8).
    Y, X = np.indices((h, w))
    dx = X - cx
    dy = Y - cy
    # Angle from centroid: 0 = right (anterior), π/2 = down (ventral)
    ang = np.arctan2(dy, dx)
    # Shift so 0 = back (left = posterior)
    ang_shifted = (ang + np.pi) % (2 * np.pi)
    zone = (ang_shifted / (2 * np.pi / n_radial)).astype(int)
    zone = np.clip(zone, 0, n_radial - 1)

    out = []
    for z in range(n_radial):
        mask_z = (zone == z)
        s = shell_mask & mask_z
        p = param_mask & mask_z
        inter = (s & p).sum()
        union = (s | p).sum()
        iou = inter / max(1, union)
        out.append((labels[z] if z < len(labels) else f"z{z}", iou))
    worst = min(out, key=lambda t: t[1])
    return dict(zones=out, worst=worst)


def commissure_match_side(shell_mask, param_cy_in_target):
    """For side views: find the y where the shell is widest (the
    estimated commissure plane in the photo) and compare to the PARAM's
    commissure y. Returns absolute distance in pixels."""
    widths = shell_mask.sum(axis=1)  # row sums = shell width at each y
    if widths.max() == 0:
        return None
    photo_commissure_y = int(np.argmax(widths))
    return abs(photo_commissure_y - param_cy_in_target)


def edge_arrays(mask):
    """For each column x of mask, return top_y[x] and bottom_y[x]:
    the smallest and largest y where mask is True. -1 if column empty.
    Top edge = small y (upper screen); bottom edge = large y."""
    h, w = mask.shape
    top = np.full(w, -1, dtype=int)
    bot = np.full(w, -1, dtype=int)
    for x in range(w):
        col = np.where(mask[:, x])[0]
        if col.size > 0:
            top[x] = col[0]
            bot[x] = col[-1]
    return top, bot


def tangent_angle_at_x(edge, x, window=6):
    """Local slope of the edge at x via linear fit over ±window
    samples. Returns angle in degrees (atan of slope) or None if too
    few valid samples nearby."""
    xs, ys = [], []
    for dx in range(-window, window + 1):
        xi = x + dx
        if 0 <= xi < len(edge) and edge[xi] >= 0:
            xs.append(xi)
            ys.append(edge[xi])
    if len(xs) < 3:
        return None
    xs = np.array(xs, dtype=float)
    ys = np.array(ys, dtype=float)
    slope = np.polyfit(xs, ys, 1)[0]
    return float(np.degrees(np.arctan(slope)))


def tangent_alignment(ref_mask, param_mask):
    """Tangent Alignment Test (per pipeline overhaul proposal §4):
    compare local tangent slopes of PARAM vs reference at 5 landmark
    x-positions, separately for top and bottom edges. Returns a list
    of (landmark_label, ref_deg, param_deg, abs_diff_deg) entries,
    plus mean and max difference summaries."""
    ref_top, ref_bot = edge_arrays(ref_mask)
    par_top, par_bot = edge_arrays(param_mask)
    rb = bbox_of_mask(ref_mask)
    if rb is None:
        return None
    x0, _, x1, _ = rb
    fractions = [(0.10, "post"), (0.30, "p-mid"), (0.50, "center"),
                  (0.70, "a-mid"), (0.90, "ant")]
    landmarks = [(int(x0 + (x1 - x0) * f), label) for f, label in fractions]

    entries = []
    for x, label in landmarks:
        for edge_label, ref_edge, par_edge in (("top", ref_top, par_top),
                                                  ("bot", ref_bot, par_bot)):
            ra = tangent_angle_at_x(ref_edge, x)
            pa = tangent_angle_at_x(par_edge, x)
            if ra is None or pa is None:
                continue
            diff = abs(ra - pa)
            # Wrap large differences: tangent is undirected (a line at
            # +85° is essentially the same as -85°), so wrap to [0, 90].
            if diff > 90:
                diff = 180 - diff
            entries.append((f"{label}-{edge_label}", ra, pa, diff))
    if not entries:
        return None
    diffs = [e[3] for e in entries]
    return dict(entries=entries, mean=np.mean(diffs), max=np.max(diffs))


# ---------- Panel rendering ----------

def overlay_panel(ax, pil_photo, svg_path, view_kind, show_metrics=True,
                   mask_fn=None):
    """Show photo + red PARAM outline scaled to shell extent. Returns
    metrics dict for the panel."""
    photo_arr = np.asarray(pil_photo.convert("RGB"))
    h, w = photo_arr.shape[:2]
    ax.imshow(photo_arr)
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)

    if mask_fn is None:
        mask_fn = nonwhite_mask
    shell_mask = mask_fn(pil_photo)
    shell_bbox = bbox_of_mask(shell_mask)
    if shell_bbox is None:
        ax.set_title("(no shell detected)", fontsize=8, color="red")
        return None

    polys = param_silhouette_polygons(svg_path)
    if not polys:
        return None
    src_bbox = silhouette_bbox(polys)

    # Scale PARAM bbox → shell bbox
    param_mask = rasterize_param_mask(polys, src_bbox, w, h, shell_bbox)

    # Compute metrics
    metrics = compute_fit(param_mask, shell_mask)

    # For side views: also compute commissure match. PARAM commissure
    # in SVG is at y=100 (cy). In the scaled target, this maps to:
    if view_kind == "side":
        sx0, sy0, sx1, sy1 = src_bbox
        dx0, dy0, dx1, dy1 = shell_bbox
        param_cy_target = dy0 + (100 - sy0) * (dy1 - dy0) / max(1, sy1 - sy0)
        cm_dist = commissure_match_side(shell_mask, param_cy_target)
        # Draw the two commissure lines for visual reference
        ax.axhline(y=param_cy_target, color="#1e6fd9", linewidth=0.8,
                    linestyle=":", alpha=0.7)
        if cm_dist is not None:
            metrics["commissure_dist_px"] = int(cm_dist)

    # Tangent alignment test (per pipeline overhaul proposal §4).
    ta = tangent_alignment(shell_mask, param_mask)
    if ta is not None:
        metrics["tangent_mean_deg"] = float(ta["mean"])
        metrics["tangent_max_deg"] = float(ta["max"])
        metrics["tangent_entries"] = ta["entries"]

    # Hausdorff distance — worst-case perimeter mismatch. Surfaces
    # large local deviations that bulk IoU hides. Lower = better.
    perim_shell = perimeter_pixels(shell_mask)
    perim_param = perimeter_pixels(param_mask)
    hd = hausdorff(perim_shell, perim_param)
    if hd is not None:
        # Normalize by bbox diagonal so it's comparable across panels
        bbox_diag = np.hypot(w, h)
        metrics["hausdorff_px"] = float(hd)
        metrics["hausdorff_frac"] = float(hd / bbox_diag)

    # Zonal IoU — IoU per anatomical zone. Identifies which regions
    # are wildly wrong even when bulk IoU passes.
    zi = zonal_iou(param_mask, shell_mask, n_radial=8)
    if zi is not None:
        metrics["zonal_iou"] = zi["zones"]
        metrics["worst_zone"] = zi["worst"]

    # Overlay BLUE PARAM — ASPECT-PRESERVING uniform scale.
    #
    # The fill polygons include the horizontal commissure walk (each
    # valve closes through commissure to start point), so drawing them
    # as closed-outline strokes shows a "T-bar through the middle".
    # Instead we draw the fill polygons as a TRANSLUCENT BLUE REGION
    # — gives a clean shape view that students can compare to the RED
    # reference outline without spurious internal lines. The stroke
    # paths and #333 commissure are then drawn on top as thinner blue
    # lines for diagnostic interior detail.
    sx0, sy0, sx1, sy1 = src_bbox
    dx0, dy0, dx1, dy1 = shell_bbox
    sw = max(1e-6, sx1 - sx0); sh = max(1e-6, sy1 - sy0)
    dw = dx1 - dx0; dh = dy1 - dy0
    f = min(dw / sw, dh / sh)
    pad_x = (dw - sw * f) / 2
    pad_y = (dh - sh * f) / 2

    def to_dst(p):
        return (dx0 + pad_x + (p[0] - sx0) * f,
                dy0 + pad_y + (p[1] - sy0) * f)

    # Filled translucent BLUE region per valve (shows shape coverage)
    for poly in polys:
        xs = [to_dst(p)[0] for p in poly]
        ys = [to_dst(p)[1] for p in poly]
        ax.fill(xs, ys, color="#1e6fd9", alpha=0.15, zorder=9, linewidth=0)

    # Body outline strokes (solid BLUE) and internal commissure (thin
    # dashed faded BLUE) drawn separately so they're visually distinct.
    # Combined-blue rendering made the commissure look like a second
    # outline crossing the body — students would read this as a self-
    # intersecting tangle. Now the commissure clearly reads as an
    # INTERIOR feature.
    for polylines_, stroke_, sw_, fill_, dashed_ in parse_svg_paths(svg_path):
        s_low = stroke_.lower()
        is_outline = s_low in ("black", "#000", "#000000")
        is_commissure = s_low in ("#333", "#333333")
        if not (is_outline or is_commissure) or dashed_:
            continue
        for pl in polylines_:
            xs = [to_dst(p)[0] for p in pl]
            ys = [to_dst(p)[1] for p in pl]
            if is_outline:
                ax.plot(xs, ys, color="#1e6fd9", linewidth=1.8, alpha=0.95,
                        zorder=10, solid_capstyle="round", solid_joinstyle="round")
            else:  # commissure
                ax.plot(xs, ys, color="#1e6fd9", linewidth=0.9, alpha=0.55,
                        zorder=11, linestyle="--", dashes=(4, 2))

    # Fitted-shape (green) overlay REMOVED. The fitted shapes are based
    # on stand-in taxa (e.g., Cyrtospirifer's "fitted" is actually fit
    # to Spinocyrtia iowensis) and produce smooth bulk shapes that lose
    # all diagnostic features — a near-circle for what should be a
    # wing-spiriferid diamond. IoU rewards bulk overlap so the metric
    # was misleading; visually the fitted is worse. Focus is entirely
    # on improving the BLUE categorical PARAM.

    # Shell bbox rectangle (faint, for reference)
    ax.plot([dx0, dx1, dx1, dx0, dx0],
            [dy0, dy0, dy1, dy1, dy0],
            color="#7a7a7a", linewidth=0.5, linestyle=":", alpha=0.5)

    # Metrics text box suppressed — visual assessment focused on shape.
    # (Numbers still printed to stdout by main() for reference.)
    return metrics


# ---------- Main ----------

def main():
    svg_dir = os.path.join(HERE, "_diagnostic_svgs")
    gen_svgs([
        dict(id=sp["name"], answers=sp["answers"],
             taxon_key=sp.get("taxon_key"))
        for sp in SPECIMENS
    ], svg_dir)

    n = len(SPECIMENS)
    fig, axes = plt.subplots(n, 2, figsize=(14, 5.0 * n),
                              gridspec_kw=dict(wspace=0.10, hspace=0.30))
    if n == 1:
        axes = [axes]

    results = []   # collect per-specimen metrics for stdout summary

    for r, sp in enumerate(SPECIMENS):
        bdir = os.path.join(IMG_DIR, sp["dir"])
        row = dict(name=sp["name"])

        # SIDE: prefer reference outline if available, else use photo
        side_ref = reference_outline_path(sp["name"], "side")
        side_photo = os.path.join(bdir, "side.png")
        side_src = side_ref if side_ref else side_photo
        side_kind = "ref" if side_ref else "photo"
        if os.path.exists(side_src):
            pil = Image.open(side_src)
            mask_fn = red_outline_mask if side_ref else nonwhite_mask
            m = overlay_panel(axes[r][0], pil,
                           os.path.join(svg_dir, f"{sp['name']}_side.svg"),
                           view_kind="side", mask_fn=mask_fn)
            row["side"] = m
            row["side_kind"] = side_kind
            if not side_ref:
                # Mark photo-based comparison — the nonwhite_mask bbox
                # is approximate (picks up background brightness too).
                # Hand-drawn reference outline gives a fairer comparison.
                axes[r][0].text(0.02, 0.02, "no ref outline — photo-based bbox",
                                 transform=axes[r][0].transAxes, fontsize=8,
                                 color="#a04020", style="italic",
                                 bbox=dict(facecolor="#fffef7", alpha=0.7, edgecolor="none"))
        if r == 0:
            axes[r][0].set_title("SIDE", fontsize=14, color="#6b3410")

        # ANTERIOR: same — prefer reference outline if available
        ant_ref = reference_outline_path(sp["name"], "anterior")
        ant_photo = os.path.join(bdir, "anterior.png")
        ant_src = ant_ref if ant_ref else ant_photo
        ant_kind = "ref" if ant_ref else "photo"
        if os.path.exists(ant_src):
            pil = Image.open(ant_src)
            mask_fn = red_outline_mask if ant_ref else nonwhite_mask
            m = overlay_panel(axes[r][1], pil,
                           os.path.join(svg_dir, f"{sp['name']}_front.svg"),
                           view_kind="anterior", mask_fn=mask_fn)
            row["anterior"] = m
            row["anterior_kind"] = ant_kind
        if r == 0:
            axes[r][1].set_title("ANTERIOR", fontsize=14, color="#6b3410")

        results.append(row)

        axes[r][0].set_ylabel(sp["name"], rotation=0, ha="right",
                               va="center", fontsize=11, color="#6b3410",
                               labelpad=10)

    fig.suptitle("PARAM (red) overlaid on photos — scaled to shell extent",
                  fontsize=13, color="#6b3410", fontweight="bold", y=0.995)
    out = os.path.join(HERE, "diagnostic_grid_all.png")
    fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    plt.close(fig)
    print("Wrote", out)

    # Print a metrics summary so we can read out fit quality without
    # squinting at the PNG.
    print()
    print("Fit metrics — categorical PARAM vs reference/photo:")
    print(f"  {'name':<8} {'view':<10} {'IoU':>6} {'tan-mean°':>10} "
          f"{'Hausdorff%':>11} {'worst-zone (IoU)':>22}")
    for row in results:
        for view in ("side", "anterior"):
            m = row.get(view)
            if not m: continue
            tm = m.get("tangent_mean_deg")
            tm_s = f"{tm:.1f}°" if tm is not None else "—"
            hd_f = m.get("hausdorff_frac")
            hd_s = f"{hd_f*100:>5.1f}%" if hd_f is not None else "—"
            wz = m.get("worst_zone")
            wz_s = f"{wz[0]} ({wz[1]:.2f})" if wz is not None else "—"
            print(f"  {row['name']:<8} {view:<10} {m['iou']:>6.2f} "
                  f"{tm_s:>10} {hd_s:>11} {wz_s:>22}")

    # Per-panel zonal IoU breakdown
    print()
    print("Per-zone IoU (lowest = where PARAM most wildly mismatches reference):")
    for row in results:
        for view in ("side", "anterior"):
            m = row.get(view)
            if not m or "zonal_iou" not in m: continue
            zs = sorted(m["zonal_iou"], key=lambda t: t[1])
            print(f"  {row['name']} {view}: " +
                  ", ".join(f"{z}={i:.2f}" for z, i in zs[:4]) +
                  f"  (worst 4 of 8)")

    # Tangent alignment per-landmark detail — useful for pinpointing
    # WHERE the silhouette enters/exits the bbox wrong.
    print()
    print("Tangent alignment detail (degrees, per landmark; |diff| = absolute):")
    for row in results:
        for view in ("side", "anterior"):
            m = row.get(view)
            if not m or "tangent_entries" not in m:
                continue
            print(f"  {row['name']} {view}:")
            for lm, ra, pa, diff in m["tangent_entries"]:
                flag = " ⚠" if diff > 25 else ""
                print(f"    {lm:<12} ref={ra:>+6.1f}° par={pa:>+6.1f}° |diff|={diff:>5.1f}°{flag}")


if __name__ == "__main__":
    main()
