#!/usr/bin/env python3
"""Render the vectorized atlas SVG paths as a grid for visual QA.

Each row = one reference brach, columns = 5 views (dorsal/posterior/side/
ventral/anterior). Output: atlas_vectorized_qa.png
"""
import os, json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.path import Path
from matplotlib.patches import PathPatch

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, "atlas_vectorized.json")) as f:
    atlas = json.load(f)


def svg_path_to_mpl(d):
    """Parse a simple M ... L ... Z SVG path into matplotlib Path."""
    verts, codes = [], []
    tokens = d.replace(",", " ").split()
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t in ("M", "L"):
            x = float(tokens[i+1]); y = float(tokens[i+2])
            verts.append((x, y))
            codes.append(Path.MOVETO if t == "M" else Path.LINETO)
            i += 3
        elif t == "Z":
            verts.append((0, 0))  # placeholder
            codes.append(Path.CLOSEPOLY)
            i += 1
        else:
            i += 1
    return Path(verts, codes)


VIEWS = ["dorsal", "posterior", "side", "ventral", "anterior"]
brachs = sorted(atlas.keys())
fig, axes = plt.subplots(len(brachs), 5, figsize=(15, 3 * len(brachs)),
                          gridspec_kw=dict(wspace=0.05, hspace=0.2))

for r, brach in enumerate(brachs):
    for c, view in enumerate(VIEWS):
        ax = axes[r][c]
        ax.set_xlim(0, 200); ax.set_ylim(200, 0)  # flip Y for image coords
        ax.set_aspect("equal")
        ax.set_xticks([]); ax.set_yticks([])
        d = atlas[brach].get(view)
        if d:
            path = svg_path_to_mpl(d)
            patch = PathPatch(path, facecolor="#fce4dc", edgecolor="#c12c1a", lw=1.5)
            ax.add_patch(patch)
        else:
            ax.text(100, 100, "—", ha="center", va="center", fontsize=24, color="#aaa")
        if r == 0:
            ax.set_title(view, fontsize=11)
        if c == 0:
            ax.set_ylabel(brach.replace("_", "\n"), fontsize=8, rotation=0,
                           ha="right", va="center")

fig.suptitle("Vectorized reference atlas — QA grid", fontsize=14, y=0.995)
out = os.path.join(HERE, "atlas_vectorized_qa.png")
fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="white")
print("Wrote", out)
