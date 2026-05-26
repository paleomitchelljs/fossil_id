#!/usr/bin/env python3
"""Native-scale side-by-side comparison: reference outline next to PARAM
silhouette at their TRUE aspect ratios (no bbox-rescaling stretch).

This complements diagnostic_grid.py — that file scales PARAM bbox →
reference bbox, which masks aspect-ratio changes in the PARAM. This
file draws each panel in a square axis with the shape centered, so the
ACTUAL aspect ratio of the PARAM silhouette is preserved and visible.

Output: data/fit_harness/diagnostic_native.png
"""
import os, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "visualizer_test"))
from render import draw_svg
from diagnostic_overlay import SPECIMENS, gen_svgs

HERE = os.path.dirname(os.path.abspath(__file__))
REF_DIR = os.path.join(HERE, "reference_outlines")


def reference_outline_path(brach_name, view):
    import glob
    hits = glob.glob(os.path.join(REF_DIR, f"{brach_name}_*_{view}.png"))
    return hits[0] if hits else None


def draw_ref_outline(ax, path):
    """Show reference PNG (red outline on white) centered with native aspect."""
    img = Image.open(path)
    arr = np.asarray(img.convert("RGBA"))
    ax.imshow(arr)
    ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)


def draw_native_param(ax, svg_path):
    """Render PARAM SVG using its native 200x200 viewBox — preserves aspect."""
    ax.set_facecolor("#fffef7")
    draw_svg(ax, svg_path)


def main():
    svg_dir = os.path.join(HERE, "_diagnostic_svgs")
    gen_svgs([
        dict(id=sp["name"], answers=sp["answers"],
             taxon_key=sp.get("taxon_key"))
        for sp in SPECIMENS
    ], svg_dir)

    # Filter to brachs that have reference outlines (the comparison is
    # only meaningful when we have a hand-drawn reference)
    rows = []
    for sp in SPECIMENS:
        side_ref = reference_outline_path(sp["name"], "side")
        ant_ref = reference_outline_path(sp["name"], "anterior")
        if side_ref or ant_ref:
            rows.append(dict(sp=sp, side_ref=side_ref, ant_ref=ant_ref))

    n = len(rows)
    if n == 0:
        print("No reference outlines found. Add to reference_outlines/ first.")
        return

    # 4 columns: side ref, side param, ant ref, ant param
    fig, axes = plt.subplots(n, 4, figsize=(13, 3.5 * n),
                              gridspec_kw=dict(wspace=0.06, hspace=0.18))
    if n == 1:
        axes = [axes]

    for r, row in enumerate(rows):
        sp = row["sp"]
        side_ref = row["side_ref"]; ant_ref = row["ant_ref"]
        if side_ref:
            draw_ref_outline(axes[r][0], side_ref)
        else:
            axes[r][0].text(0.5, 0.5, "(no side ref)", ha="center", va="center", transform=axes[r][0].transAxes)
            axes[r][0].set_xticks([]); axes[r][0].set_yticks([])
        axes[r][0].set_title(f"{sp['name']} — REF side", fontsize=10, color="#6b3410")

        side_svg = os.path.join(svg_dir, f"{sp['name']}_side.svg")
        if os.path.exists(side_svg):
            draw_native_param(axes[r][1], side_svg)
        axes[r][1].set_title(f"{sp['name']} — PARAM side", fontsize=10, color="#1e6fd9")

        if ant_ref:
            draw_ref_outline(axes[r][2], ant_ref)
        else:
            axes[r][2].text(0.5, 0.5, "(no anterior ref)", ha="center", va="center", transform=axes[r][2].transAxes)
            axes[r][2].set_xticks([]); axes[r][2].set_yticks([])
        axes[r][2].set_title(f"{sp['name']} — REF anterior", fontsize=10, color="#6b3410")

        ant_svg = os.path.join(svg_dir, f"{sp['name']}_front.svg")
        if os.path.exists(ant_svg):
            draw_native_param(axes[r][3], ant_svg)
        axes[r][3].set_title(f"{sp['name']} — PARAM anterior", fontsize=10, color="#1e6fd9")

    fig.suptitle("NATIVE aspect ratio comparison — no bbox stretching",
                  fontsize=13, color="#6b3410", fontweight="bold", y=0.995)
    out = os.path.join(HERE, "diagnostic_native.png")
    fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    plt.close(fig)
    print("Wrote", out)


if __name__ == "__main__":
    main()
