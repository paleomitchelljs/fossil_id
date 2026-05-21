#!/usr/bin/env python3
"""Render the edge-case SVGs (no real photos)."""
import os, json, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import draw_svg

HERE = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.join(HERE, "svgs")

with open(os.path.join(SVG_DIR, "edge_manifest.json")) as f:
    cases = json.load(f)

fig, axes = plt.subplots(len(cases), 3, figsize=(8, 2.6 * len(cases)),
                         gridspec_kw=dict(wspace=0.10, hspace=0.30))
for r, c in enumerate(cases):
    for col, v in enumerate(["top", "front", "side"]):
        ax = axes[r][col]
        ax.set_facecolor("#fffef7")
        draw_svg(ax, os.path.join(SVG_DIR, c["files"][v]))
        ax.set_title(f"{v.upper()}", fontsize=9, color="#6b3410")
    axes[r][0].set_ylabel(c["name"], fontsize=10, fontweight="bold",
                          color="#6b3410", rotation=0, labelpad=70,
                          ha="right", va="center")

out = os.path.join(HERE, "edge_cases.png")
fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
print("Wrote", out)
