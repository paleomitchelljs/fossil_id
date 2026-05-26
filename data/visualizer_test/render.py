#!/usr/bin/env python3
"""Render the generated parametric SVGs side-by-side with real photos.

Reads svgs/manifest.json + svgs/<species>_<view>.svg.
Each SVG uses a small subset of SVG: <path d="..."/>, <line>, <circle>.
We parse just those primitives and draw them with matplotlib.

Output: cycle<N>.png — one composite image, rows = species, columns = the
three parametric views followed by three reference photos.
"""

import os
import json
import re
import sys
import xml.etree.ElementTree as ET
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.path import Path
from PIL import Image

NS = "{http://www.w3.org/2000/svg}"
HERE = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.join(HERE, "svgs")
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))


def parse_path_d(d):
    """Parse a path's d='...' attribute into a list of (verb, params).
    Supports M, L, Q, C, Z commands."""
    cmds = []
    pat = re.compile(r"([MLQCZ])\s*([^MLQCZ]*)", re.IGNORECASE)
    for m in pat.finditer(d):
        verb = m.group(1).upper()
        rest = m.group(2).strip()
        nums = []
        if rest:
            nums = [float(x) for x in re.findall(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", rest)]
        cmds.append((verb, nums))
    return cmds


def path_to_polylines(d):
    """Flatten an SVG path d into a list of polylines [(xs, ys), ...].

    Closes the path on Z by appending the start point.
    Quadratic Bezier Q is sampled at 16 points.
    """
    cmds = parse_path_d(d)
    out = []
    cur = None
    start = None
    polyline = []
    for verb, nums in cmds:
        if verb == "M":
            if polyline:
                out.append(polyline)
            polyline = []
            for i in range(0, len(nums), 2):
                polyline.append((nums[i], nums[i + 1]))
            cur = polyline[-1]
            start = polyline[0]
        elif verb == "L":
            for i in range(0, len(nums), 2):
                pt = (nums[i], nums[i + 1])
                polyline.append(pt)
                cur = pt
        elif verb == "Q":
            # Q cx cy x y  (single segment per Q in our output)
            for i in range(0, len(nums), 4):
                cx, cy, x, y = nums[i:i + 4]
                x0, y0 = cur
                for j in range(1, 17):
                    t = j / 16.0
                    bx = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x
                    by = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y
                    polyline.append((bx, by))
                cur = (x, y)
        elif verb == "C":
            # C c1x c1y c2x c2y x y — cubic bezier, sampled at 24 pts
            for i in range(0, len(nums), 6):
                c1x, c1y, c2x, c2y, x, y = nums[i:i + 6]
                x0, y0 = cur
                for j in range(1, 25):
                    t = j / 24.0
                    omt = 1 - t
                    bx = omt**3 * x0 + 3*omt**2 * t * c1x + 3*omt * t**2 * c2x + t**3 * x
                    by = omt**3 * y0 + 3*omt**2 * t * c1y + 3*omt * t**2 * c2y + t**3 * y
                    polyline.append((bx, by))
                cur = (x, y)
        elif verb == "Z":
            if start is not None:
                polyline.append(start)
            cur = start
    if polyline:
        out.append(polyline)
    return out


def draw_svg(ax, svg_path):
    """Draw an SVG file into the given matplotlib axes.

    Coordinates flipped vertically because SVG y-down vs matplotlib y-up.
    """
    tree = ET.parse(svg_path)
    root = tree.getroot()
    viewBox = root.get("viewBox", "0 0 200 200").split()
    vb = [float(x) for x in viewBox]
    ax.set_xlim(vb[0], vb[0] + vb[2])
    ax.set_ylim(vb[1] + vb[3], vb[1])  # flip y
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)

    # Background — main outline fill (first path with a fill ≠ none)
    # We'll just draw each element in document order.
    # Note: SVG <g clip-path="..."> contents would normally be clipped; for
    # simplicity we treat children as if they were directly under svg root.
    def walk(elem):
        # Recurse into <defs>? skip.
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
                fill = child.get("fill", "black")
                stroke = child.get("stroke", "none")
                sw = float(child.get("stroke-width", "1"))
                opacity = float(child.get("opacity", "1"))
                dash_attr = child.get("stroke-dasharray", "")
                polylines = path_to_polylines(d)
                if fill and fill not in ("none", "transparent"):
                    # Draw filled polygon for the first polyline of the path
                    pl = polylines[0]
                    xs = [p[0] for p in pl]
                    ys = [p[1] for p in pl]
                    ax.fill(xs, ys, color=fill, alpha=opacity, zorder=1, linewidth=0)
                if stroke and stroke not in ("none", "transparent"):
                    for pl in polylines:
                        xs = [p[0] for p in pl]
                        ys = [p[1] for p in pl]
                        kwargs = dict(color=stroke, linewidth=sw, alpha=opacity,
                                      zorder=3, solid_capstyle="round",
                                      solid_joinstyle="round")
                        if dash_attr:
                            ds = [float(x) for x in re.findall(r"[\d.]+", dash_attr)]
                            kwargs["dashes"] = ds
                        ax.plot(xs, ys, **kwargs)
            elif tag == "line":
                x1 = float(child.get("x1")); y1 = float(child.get("y1"))
                x2 = float(child.get("x2")); y2 = float(child.get("y2"))
                stroke = child.get("stroke", "black")
                sw = float(child.get("stroke-width", "1"))
                opacity = float(child.get("opacity", "1"))
                dash_attr = child.get("stroke-dasharray", "")
                kwargs = dict(color=stroke, linewidth=sw, alpha=opacity, zorder=3)
                if dash_attr:
                    ds = [float(x) for x in re.findall(r"[\d.]+", dash_attr)]
                    kwargs["dashes"] = ds
                ax.plot([x1, x2], [y1, y2], **kwargs)
            elif tag == "circle":
                cx = float(child.get("cx", "0")); cy = float(child.get("cy", "0"))
                r = float(child.get("r", "1"))
                fill = child.get("fill", "black")
                stroke = child.get("stroke", "none")
                opacity = float(child.get("opacity", "1"))
                kwargs = dict()
                if fill and fill not in ("none", "transparent"):
                    kwargs["facecolor"] = fill
                else:
                    kwargs["facecolor"] = "none"
                if stroke and stroke not in ("none", "transparent"):
                    kwargs["edgecolor"] = stroke
                else:
                    kwargs["edgecolor"] = "none"
                circ = mpatches.Circle((cx, cy), r, alpha=opacity, zorder=4, **kwargs)
                ax.add_patch(circ)

    walk(root)


def draw_svg_overlay(ax, svg_path, color="#e63946", lw=2.0, alpha=0.95,
                      target_w=None, target_h=None):
    """Overlay SVG strokes — recolored, no fills — onto the current axes.

    Use when you've already drawn a photo via ax.imshow() and want the
    parametric outline rendered ON TOP for direct comparison. Skips
    fills, hatching lines, dashed commissure lines, spine circles —
    only the main outline strokes get plotted. The SVG's viewBox is
    scaled to (target_w, target_h); if those are None, uses the
    current axes limits (typically set by imshow).
    """
    tree = ET.parse(svg_path)
    root = tree.getroot()
    viewBox = root.get("viewBox", "0 0 200 200").split()
    vbx, vby, vbw, vbh = [float(x) for x in viewBox]

    if target_w is None or target_h is None:
        x_lim = ax.get_xlim()
        y_lim = ax.get_ylim()
        target_w = abs(x_lim[1] - x_lim[0])
        target_h = abs(y_lim[1] - y_lim[0])
        x0 = min(x_lim)
        y0 = min(y_lim)
    else:
        x0, y0 = 0, 0

    sx = target_w / vbw
    sy = target_h / vbh

    def transform_pts(pts):
        return [(x0 + (px - vbx) * sx, y0 + (py - vby) * sy) for px, py in pts]

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
                # Overlay: only render strokes (drop fills, hatches, etc.)
                if stroke in ("none", "transparent", ""):
                    continue
                # Skip very thin / dashed strokes — those are typically
                # hatching, internal commissure markers, or rib lines.
                # The main body outline is stroked at SK.outlineW=2.2;
                # the internal commissure (frontCommissureLine for strong
                # fold) is sw=1.6 — bump threshold to >=2.0 so the
                # commissure stays out of the overlay (it adds visual
                # noise on top of the main silhouette).
                sw = float(child.get("stroke-width", "1"))
                if sw < 2.0:
                    continue
                if child.get("stroke-dasharray", ""):
                    continue
                polylines = path_to_polylines(d)
                for pl in polylines:
                    pts = transform_pts(pl)
                    xs = [p[0] for p in pts]
                    ys = [p[1] for p in pts]
                    ax.plot(xs, ys, color=color, linewidth=lw, alpha=alpha,
                            zorder=10, solid_capstyle="round",
                            solid_joinstyle="round")
            # line/circle: skip — these are spines, hatching, etc.

    walk(root)


def main():
    cycle = sys.argv[1] if len(sys.argv) > 1 else "1"
    manifest_path = os.path.join(SVG_DIR, "manifest.json")
    with open(manifest_path) as f:
        species = json.load(f)

    PHOTOS = {
        "pseudoatrypa_devoniana": [
            "images/pseudoatrypa/rockford/devoniana_nathan_01.jpg",
            "images/pseudoatrypa/rockford/devoniana_dave_01.jpg",
            "images/pseudoatrypa/rockford/devoniana_daycopper_01.png",
        ],
        "cyrtospirifer_whitneyi": [
            "images/cyrtospirifer/rockford/whitneyi_nathan_01.jpg",
            "images/cyrtospirifer/rockford/whitneyi_dave_01.jpg",
            "images/cyrtospirifer/rockford/whitneyi_jsm_01.png",
        ],
        "schizophoria_iowensis": [
            "images/schizophoria/rockford/iowensis_nathan_01.jpg",
            "images/schizophoria/rockford/iowensis_dave_01.jpg",
            "images/schizophoria/rockford/iowensis_stigallrode_01.png",
        ],
    }

    n_species = len(species)
    n_cols = 6
    fig, axes = plt.subplots(n_species, n_cols, figsize=(3.6 * n_cols, 3.8 * n_species),
                             gridspec_kw=dict(wspace=0.10, hspace=0.30))
    if n_species == 1:
        axes = [axes]

    for r, sp in enumerate(species):
        row = axes[r]
        # Parametric tri-view
        for c, view in enumerate(["top", "front", "side"]):
            ax = row[c]
            ax.set_facecolor("#fffef7")
            svg_path = os.path.join(SVG_DIR, sp["files"][view])
            draw_svg(ax, svg_path)
            ax.set_title(f"PARAM — {view.upper()}", fontsize=8, color="#6b3410")
        # Photos
        for c, photo_rel in enumerate(PHOTOS.get(sp["id"], [])[:3]):
            ax = row[3 + c]
            ax.set_xticks([])
            ax.set_yticks([])
            for spine in ax.spines.values():
                spine.set_visible(False)
            img_path = os.path.join(ROOT, photo_rel)
            if os.path.exists(img_path):
                img = Image.open(img_path)
                ax.imshow(img)
            ax.set_title(f"REAL — {os.path.basename(photo_rel).split('_')[1]}", fontsize=8)
        # Row label
        row[0].set_ylabel(sp["name"], fontsize=11, fontweight="bold", color="#6b3410",
                          rotation=0, labelpad=70, ha="right", va="center")

    out_path = os.path.join(HERE, f"cycle{cycle}.png")
    fig.savefig(out_path, dpi=120, bbox_inches="tight", facecolor="#f5f1e8")
    plt.close(fig)
    print("Wrote", out_path)


if __name__ == "__main__":
    main()
