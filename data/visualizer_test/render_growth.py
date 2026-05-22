#!/usr/bin/env python3
"""Render the three growth-lines-only views side by side."""
import os, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import draw_svg

HERE = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.join(HERE, "svgs_growth")

fig, axes = plt.subplots(1, 3, figsize=(15, 5),
                         gridspec_kw=dict(wspace=0.08))
for ax, view in zip(axes, ["top", "front", "side"]):
    ax.set_facecolor("#fffef7")
    draw_svg(ax, os.path.join(SVG_DIR, f"{view}.svg"))
    ax.set_title(view.upper(), fontsize=14, color="#6b3410")

out = os.path.join(HERE, "growth_lines.png")
fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
print("Wrote", out)
