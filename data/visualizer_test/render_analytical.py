#!/usr/bin/env python3
"""Render the analytical-vs-parametric comparison for shaped taxa."""
import os, sys, json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import draw_svg

HERE = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.join(HERE, "svgs_analytical")

with open(os.path.join(SVG_DIR, "manifest.json")) as f:
    species = json.load(f)

n = len(species)
fig, axes = plt.subplots(n, 3, figsize=(12, 4 * n),
                          gridspec_kw=dict(wspace=0.08, hspace=0.3))
if n == 1:
    axes = [axes]
for r, sp in enumerate(species):
    for c, v in enumerate(["top", "front", "side"]):
        ax = axes[r][c]
        ax.set_facecolor("#fffef7")
        draw_svg(ax, os.path.join(SVG_DIR, sp["files"][v]))
        ax.set_title(f"{v.upper()}", fontsize=11, color="#6b3410")
    axes[r][0].set_ylabel(sp["name"], fontsize=12, fontweight="bold",
                          color="#6b3410", rotation=0, labelpad=110,
                          ha="right", va="center")
out = os.path.join(HERE, "analytical_compare.png")
fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
print("Wrote", out)
