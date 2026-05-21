#!/usr/bin/env python3
"""Render zigzag inspection at LARGE size so the rib-density gradient is
clearly visible. Each row = one rib density; columns = top / front / side."""
import os, json, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import draw_svg

HERE = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.join(HERE, "svgs_zigzag")

with open(os.path.join(SVG_DIR, "manifest.json")) as f:
    cases = json.load(f)

fig, axes = plt.subplots(len(cases), 3, figsize=(5.5 * 3, 5.0 * len(cases)),
                         gridspec_kw=dict(wspace=0.10, hspace=0.30))
for r, c in enumerate(cases):
    for col, v in enumerate(["top", "front", "side"]):
        ax = axes[r][col]
        ax.set_facecolor("#fffef7")
        draw_svg(ax, os.path.join(SVG_DIR, c["files"][v]))
        ax.set_title(f"{v.upper()}", fontsize=11, color="#6b3410")
    axes[r][0].set_ylabel(c["label"], fontsize=13, fontweight="bold",
                          color="#6b3410", rotation=0, labelpad=110,
                          ha="right", va="center")

out = os.path.join(HERE, "zigzag.png")
fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
print("Wrote", out)
