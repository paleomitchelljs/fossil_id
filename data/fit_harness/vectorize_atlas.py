#!/usr/bin/env python3
"""Vectorize hand-drawn reference brach outlines (PNG with red outlines on white)
into SVG path strings, one per anatomical view (dorsal/ventral/side/anterior/posterior).

Output: data/fit_harness/atlas_vectorized.json

Each reference PNG has 5 views laid out on a single sheet. We extract them
by:
  1. Detecting red-outline pixels
  2. Finding connected components (each component = one view)
  3. Labeling each component by position (top-left=dorsal, etc.)
  4. Tracing the OUTER boundary of each component
  5. Simplifying with Ramer-Douglas-Peucker
  6. Emitting as SVG path string scaled to a 200x200 viewBox

Pure Python — uses only PIL + numpy. No scipy/skimage required.
"""
import os
import sys
import json
import math
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ATLAS_DIR = os.path.join(HERE, "reference_atlas")
OUT_PATH = os.path.join(HERE, "atlas_vectorized.json")


# ---------- Image processing ----------

def red_outline_mask(pil_img):
    """Boolean mask of red outline pixels. References use anti-aliased
    light pink/red — typical sample (199, 176, 177). Detect 'redness'
    as R dominating over G and B by at least a small margin, with R
    bright enough to not be black."""
    arr = np.asarray(pil_img.convert("RGB")).astype(np.int16)
    R, G, B = arr[..., 0], arr[..., 1], arr[..., 2]
    return (R - G >= 8) & (R - B >= 8) & (R > 120) & (R < 252)


def label_components(mask, min_size=200):
    """Connected component labeling (4-connectivity). Returns 2D label
    array (0 = background, 1..N = components) and list of component IDs
    that meet min_size. Pure numpy / iterative flood-fill — no scipy."""
    H, W = mask.shape
    labels = np.zeros((H, W), dtype=np.int32)
    next_label = 0
    sizes = {}
    for sy in range(H):
        for sx in range(W):
            if not mask[sy, sx] or labels[sy, sx] != 0:
                continue
            next_label += 1
            # BFS flood fill
            stack = [(sy, sx)]
            count = 0
            while stack:
                y, x = stack.pop()
                if y < 0 or y >= H or x < 0 or x >= W:
                    continue
                if not mask[y, x] or labels[y, x] != 0:
                    continue
                labels[y, x] = next_label
                count += 1
                stack.extend([(y+1, x), (y-1, x), (y, x+1), (y, x-1)])
            sizes[next_label] = count
    valid = [lab for lab, sz in sizes.items() if sz >= min_size]
    return labels, valid


def bbox_of_label(labels, lab_id):
    ys, xs = np.where(labels == lab_id)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))


# ---------- View labeling by position ----------

def label_views_by_position(labels, valid_ids, img_w, img_h):
    """Assign view names (dorsal/ventral/side/anterior/posterior) to
    connected components based on their position in the image. The
    references use a consistent 5-view layout:
        DORSAL   (top-left)       POSTERIOR (top-right)
                       SIDE (middle)
        VENTRAL  (bottom-left)    ANTERIOR  (bottom-right)
    For references with fewer views, we just use what's available.
    Returns a dict {view_name: lab_id}."""
    # Compute centroid + size for each component
    items = []
    H, W = labels.shape
    for lab in valid_ids:
        ys, xs = np.where(labels == lab)
        size = len(ys)
        cx = xs.mean() / img_w
        cy = ys.mean() / img_h
        items.append((lab, cx, cy, size))
    if not items:
        return {}

    # Keep only the K largest (where K up to 5) — small interior fragments
    # are spurious (text labels inside outlines, etc.)
    items.sort(key=lambda c: -c[3])
    items = items[:5]

    if len(items) == 1:
        return {"side": items[0][0]}

    view_targets = {
        "dorsal":    (0.25, 0.30),
        "posterior": (0.75, 0.30),
        "side":      (0.50, 0.55),
        "ventral":   (0.25, 0.80),
        "anterior":  (0.75, 0.80),
    }
    # Greedy match: for each view target, pick closest unassigned LARGE component
    remaining = list(items)
    by_pos = {}
    for view, (tx, ty) in view_targets.items():
        if not remaining:
            break
        best = min(remaining, key=lambda c: (c[1] - tx)**2 + (c[2] - ty)**2)
        by_pos[view] = best[0]
        remaining.remove(best)
    return by_pos


# ---------- Boundary tracing ----------

def find_boundary_pixels(labels, lab_id):
    """Return boundary pixels of a component (perimeter only)."""
    mask = labels == lab_id
    # Pad to handle edge pixels
    padded = np.pad(mask, 1, mode="constant", constant_values=False)
    # A pixel is on the boundary if it's in the mask and any of its
    # 4-neighbors is not.
    left = padded[1:-1, :-2]; right = padded[1:-1, 2:]
    up = padded[:-2, 1:-1]; down = padded[2:, 1:-1]
    bdy = mask & ~(left & right & up & down)
    return bdy


def trace_outer_perimeter(boundary_mask):
    """Walk the outer perimeter of a boundary mask as an ordered list
    of (x, y) points. Uses Moore-neighbor tracing from the topmost
    leftmost boundary pixel."""
    ys, xs = np.where(boundary_mask)
    if len(ys) == 0:
        return []
    # Start at topmost-leftmost pixel
    start_y = ys.min()
    candidates = xs[ys == start_y]
    start_x = candidates.min()
    H, W = boundary_mask.shape

    # 8-neighbor offsets in clockwise order starting from "up"
    NEIGHBORS = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]

    path = [(start_x, start_y)]
    cur = (start_y, start_x)
    prev_dir = 6  # came from "left"
    max_iters = boundary_mask.sum() * 8
    iters = 0
    while iters < max_iters:
        iters += 1
        # Start looking from direction prev_dir+5 (rotate CCW by 3)
        start_dir = (prev_dir + 5) % 8
        found = None
        for k in range(8):
            d = (start_dir + k) % 8
            dy, dx = NEIGHBORS[d]
            ny, nx = cur[0] + dy, cur[1] + dx
            if 0 <= ny < H and 0 <= nx < W and boundary_mask[ny, nx]:
                found = (ny, nx, d)
                break
        if found is None:
            break
        ny, nx, d = found
        if (nx, ny) == (start_x, start_y) and len(path) > 2:
            break
        path.append((nx, ny))
        cur = (ny, nx)
        prev_dir = d
    return path


# ---------- Simplification (Ramer-Douglas-Peucker) ----------

def perpendicular_distance(p, a, b):
    """Distance from point p to line ab."""
    ax, ay = a; bx, by = b; px, py = p
    dx = bx - ax; dy = by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx*dx + dy*dy)
    t = max(0, min(1, t))
    proj_x = ax + t * dx; proj_y = ay + t * dy
    return math.hypot(px - proj_x, py - proj_y)


def rdp(points, epsilon):
    """Ramer-Douglas-Peucker line simplification."""
    if len(points) < 3:
        return points[:]
    # Find point with max perpendicular distance from line endpoints[0]-endpoints[-1]
    a, b = points[0], points[-1]
    max_dist = 0
    max_idx = 0
    for i in range(1, len(points) - 1):
        d = perpendicular_distance(points[i], a, b)
        if d > max_dist:
            max_dist = d
            max_idx = i
    if max_dist > epsilon:
        left = rdp(points[:max_idx + 1], epsilon)
        right = rdp(points[max_idx:], epsilon)
        return left[:-1] + right
    else:
        return [a, b]


# ---------- Output SVG path ----------

def points_to_svg(points, bbox, target_size=200, padding=10):
    """Scale points from source bbox to target_size×target_size viewBox
    with padding, return SVG path string starting with M and ending Z."""
    x0, y0, x1, y1 = bbox
    src_w = x1 - x0
    src_h = y1 - y0
    target_inner = target_size - 2 * padding
    f = target_inner / max(src_w, src_h)
    # Centering offsets
    scaled_w = src_w * f
    scaled_h = src_h * f
    pad_x = (target_size - scaled_w) / 2
    pad_y = (target_size - scaled_h) / 2

    def transform(p):
        x, y = p
        return (pad_x + (x - x0) * f, pad_y + (y - y0) * f)

    d = ""
    for i, p in enumerate(points):
        tx, ty = transform(p)
        cmd = "M" if i == 0 else "L"
        d += f"{cmd} {tx:.1f},{ty:.1f} "
    d += "Z"
    return d


# ---------- Main ----------

def vectorize_one(png_path, brach_name):
    print(f"  processing {png_path}")
    img = Image.open(png_path)
    img_w, img_h = img.size
    line_mask = red_outline_mask(img)
    # Adaptively grow dilation until we find 5 silhouettes (or hit cap).
    # Gaps in some outlines need more dilation to seal them.
    labels = None; valid_ids = []
    for d_iter in (3, 4, 5, 6, 8):
        line_dilated = dilate(line_mask, iterations=d_iter)
        outside = flood_fill_from_corner(line_dilated)
        silhouette_mask = ~outside
        labels, valid_ids = label_components(silhouette_mask, min_size=2000)
        if len(valid_ids) >= 5:
            print(f"    found {len(valid_ids)} silhouettes (dilate={d_iter})")
            break
    else:
        print(f"    found {len(valid_ids)} silhouettes (dilate maxed)")
    if not valid_ids:
        return {}

    view_map = label_views_by_position(labels, valid_ids, img_w, img_h)
    print(f"    view assignments: {list(view_map.keys())}")

    out = {}
    for view, lab_id in view_map.items():
        bdy = find_boundary_pixels(labels, lab_id)
        trace = trace_outer_perimeter(bdy)
        method = "trace"
        if len(trace) < 20:
            # Fallback: hull of all boundary pixels — reliable but loses concavity.
            ys, xs = np.where(bdy)
            pts = list(zip(xs.tolist(), ys.tolist()))
            trace = convex_hull(pts)
            method = "hull"
            if len(trace) < 4:
                print(f"    {view}: too few points even after hull ({len(trace)}), skipping")
                continue
        simplified = rdp(trace, epsilon=1.2)
        bbox = bbox_of_label(labels, lab_id)
        svg_path = points_to_svg(simplified, bbox, target_size=200, padding=12)
        out[view] = svg_path
        print(f"    {view}: {len(trace)} → {len(simplified)} points ({method})")
    return out


def convex_hull(points):
    """Andrew's monotone chain. Returns hull points in CCW order."""
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts
    def cross(o, a, b):
        return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def dilate(mask, iterations=1):
    """Binary dilation (4-connected) by N iterations."""
    out = mask.copy()
    for _ in range(iterations):
        padded = np.pad(out, 1, mode="constant", constant_values=False)
        out = (padded[1:-1, :-2] | padded[1:-1, 2:] |
               padded[:-2, 1:-1] | padded[2:, 1:-1] | out)
    return out


def flood_fill_from_corner(blocked):
    """Flood fill from (0,0), treating `blocked` pixels as walls.
    Returns mask of all reachable pixels (the OUTSIDE region)."""
    H, W = blocked.shape
    visited = np.zeros((H, W), dtype=bool)
    if blocked[0, 0]:
        # Corner is blocked — try other corners
        starts = [(0, 0), (0, W-1), (H-1, 0), (H-1, W-1)]
        start = None
        for y, x in starts:
            if not blocked[y, x]:
                start = (y, x); break
        if start is None:
            return visited
    else:
        start = (0, 0)
    stack = [start]
    while stack:
        y, x = stack.pop()
        if y < 0 or y >= H or x < 0 or x >= W:
            continue
        if blocked[y, x] or visited[y, x]:
            continue
        visited[y, x] = True
        stack.extend([(y+1, x), (y-1, x), (y, x+1), (y, x-1)])
    return visited


def flip_path_y(d, viewbox_h=200):
    """Replace every Y in an 'M x,y L x,y ... Z' path with (viewbox_h - y),
    flipping the path vertically around the viewbox midline."""
    tokens = d.replace(",", " ").split()
    out = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t in ("M", "L"):
            x = tokens[i+1]; y = float(tokens[i+2])
            new_y = viewbox_h - y
            out.append(f"{t} {x},{new_y:.1f}")
            i += 3
        else:
            out.append(t)
            i += 1
    return " ".join(out)


REFERENCE_TO_ARCHETYPE = {
    "brach1_pseudoatrypa":   "atrypid-dome",
    "brach2_schizophoria":   "orthid",
    "brach3_conispirifer":   "spiriferid-cone",
    "brach4_cyrtospirifer":  "spiriferid-wing",
    "brach5_spinatrypa":     "atrypid-dome",         # same outline; spines are decoration
    "brach6_theodossia":     "atrypid-globose",
    "brach7_douvillina":     "strophomenid-geniculate",
}

# Map vectorized view name -> render.js view key
VIEW_ALIAS = {"dorsal": "top", "anterior": "front", "side": "side"}


def main():
    atlas = {}
    for fname in sorted(os.listdir(ATLAS_DIR)):
        if not fname.endswith("_5view.png"):
            continue
        brach_name = fname.replace("_5view.png", "")
        atlas[brach_name] = vectorize_one(os.path.join(ATLAS_DIR, fname), brach_name)
    with open(OUT_PATH, "w") as f:
        json.dump(atlas, f, indent=2)
    print(f"\nWrote {OUT_PATH}")
    print(f"Atlas keys: {list(atlas.keys())}")

    # Build archetype -> { top/front/side } map for render.js. Pseudoatrypa
    # is canonical for atrypid-dome (brach5 spines are decoration, not outline).
    archetype_atlas = {}
    seen = set()
    for brach, archetype in REFERENCE_TO_ARCHETYPE.items():
        if archetype in seen:
            continue
        views = atlas.get(brach, {})
        mapped = {}
        for src, dst in VIEW_ALIAS.items():
            if src in views:
                mapped[dst] = views[src]
        if mapped:
            archetype_atlas[archetype] = mapped
            seen.add(archetype)

    # FRONT view: render.js applies a `scale(1,-1)` flip when foldInvert is
    # true (default for sulcus-down convention). Pre-flip the path so that
    # after that render-time flip, the V-DIP sits on the TOP of the figure
    # (matching real-specimen photos with dorsal valve on top).
    js_out = os.path.join(os.path.dirname(HERE), "..", "vectorized_atlas.js")
    js_out = os.path.abspath(js_out)
    lines = ["// AUTO-GENERATED by data/fit_harness/vectorize_atlas.py. Do not edit.",
             "// Vectorized outlines from reference_atlas/brach{N}_*_5view.png.",
             "const VECTORIZED_ATLAS = {"]
    for arch in sorted(archetype_atlas.keys()):
        lines.append(f'  "{arch}": {{')
        for view in ("top", "front", "side"):
            d = archetype_atlas[arch].get(view)
            if not d:
                continue
            if view == "front":
                d = flip_path_y(d, 200)
            # The strophomenid reference sheet draws the TOP view
            # upside-down: beak/hinge at the top but the silhouette
            # widening DOWNWARD to a broad anterior. In a real
            # strophomenid (Douvillina) the straight hinge IS the widest
            # part and sits at the top, where svgTopView draws the hinge
            # bar + umbo + rib origin. Flip the traced top vertically so
            # the widest edge lands at the top under those decorations.
            if view == "top" and arch == "strophomenid-geniculate":
                d = flip_path_y(d, 200)
            lines.append(f'    "{view}": "{d}",')
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("if (typeof module !== 'undefined') module.exports = { VECTORIZED_ATLAS };")
    with open(js_out, "w") as f:
        f.write("\n".join(lines))
    print(f"Wrote {js_out}  ({len(archetype_atlas)} archetypes)")


if __name__ == "__main__":
    main()
