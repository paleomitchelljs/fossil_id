#!/usr/bin/env python3
"""Single-PNG grid showing side + front photo crops alongside PARAM
reconstructions for all seven Rockford diagnostic brachs.

Output: data/fit_harness/diagnostic_grid_all.png
"""
import os, sys, subprocess, json, tempfile
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "visualizer_test"))
from render import draw_svg
from diagnostic_overlay import SPECIMENS, gen_svgs, crop

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))


def main():
    svg_dir = os.path.join(HERE, "_diagnostic_svgs")
    gen_svgs([dict(id=sp["name"], answers=sp["answers"]) for sp in SPECIMENS], svg_dir)

    n = len(SPECIMENS)
    # 4 columns: PHOTO side, PARAM side, PHOTO front (anterior), PARAM front
    fig, axes = plt.subplots(n, 4, figsize=(13, 2.5 * n),
                              gridspec_kw=dict(wspace=0.06, hspace=0.30))
    if n == 1:
        axes = [axes]

    col_titles = ["PHOTO — side", "PARAM — side", "PHOTO — anterior", "PARAM — front"]

    for r, sp in enumerate(SPECIMENS):
        img = Image.open(os.path.join(ROOT, sp["photo"]))

        # PHOTO side
        side_crop = crop(img, sp["tiles"]["side"])
        axes[r][0].imshow(side_crop)
        axes[r][0].set_xticks([]); axes[r][0].set_yticks([])
        for s in axes[r][0].spines.values(): s.set_visible(False)
        if r == 0:
            axes[r][0].set_title(col_titles[0], fontsize=11, color="#6b3410")

        # PARAM side
        axes[r][1].set_facecolor("#fffef7")
        svg_path = os.path.join(svg_dir, f"{sp['name']}_side.svg")
        draw_svg(axes[r][1], svg_path)
        axes[r][1].set_xticks([]); axes[r][1].set_yticks([])
        for s in axes[r][1].spines.values(): s.set_visible(False)
        if r == 0:
            axes[r][1].set_title(col_titles[1], fontsize=11, color="#6b3410")

        # PHOTO anterior (front)
        ant_crop = crop(img, sp["tiles"]["anterior"])
        axes[r][2].imshow(ant_crop)
        axes[r][2].set_xticks([]); axes[r][2].set_yticks([])
        for s in axes[r][2].spines.values(): s.set_visible(False)
        if r == 0:
            axes[r][2].set_title(col_titles[2], fontsize=11, color="#6b3410")

        # PARAM front
        axes[r][3].set_facecolor("#fffef7")
        svg_path = os.path.join(svg_dir, f"{sp['name']}_front.svg")
        draw_svg(axes[r][3], svg_path)
        axes[r][3].set_xticks([]); axes[r][3].set_yticks([])
        for s in axes[r][3].spines.values(): s.set_visible(False)
        if r == 0:
            axes[r][3].set_title(col_titles[3], fontsize=11, color="#6b3410")

        # Row label on the far left
        axes[r][0].set_ylabel(f"{sp['name']}\n{sp['best_guess']}",
                               rotation=0, ha="right", va="center",
                               fontsize=9, color="#6b3410",
                               labelpad=10)

    fig.suptitle("Rockford diagnostic brachs — photo vs parametric (side + anterior)",
                  fontsize=13, color="#6b3410", fontweight="bold", y=0.995)
    out = os.path.join(HERE, "diagnostic_grid_all.png")
    fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    plt.close(fig)
    print("Wrote", out)


if __name__ == "__main__":
    main()
