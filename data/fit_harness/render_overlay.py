#!/usr/bin/env python3
"""Render mesh-vs-model overlays for the fitted species.

Each row = one species; each column = one view (TOP/FRONT/SIDE).
The MESH silhouette is drawn as a filled gray polygon; the ANALYTICAL
model silhouette is overlaid as a red dashed outline. Where the two
agree, the red traces the gray boundary. Where they disagree, the red
crosses the gray area — that's the model's failure surface, visible
directly.

One image per species (so it can be embedded individually in the
morphospace view), plus a combined composite.
"""
import os, sys, json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glb_loader import load_glb
from silhouette import canonicalise, mesh_silhouettes
from model import Params, model_silhouettes

SPECIES = [
    ("brachiopod_atrypa_devoniana_pri_70763.glb", "Atrypa devoniana"),
    ("brachiopod_spinocyrtia_iowensis_pri_70766.glb", "Spinocyrtia iowensis"),
    ("brachiopod_pentamerus_oblongus_pri_42138.glb", "Pentamerus oblongus"),
    ("brachiopod_mucrospirifer_arkonensis_pri_76891.glb", "Mucrospirifer arkonensis"),
    ("hebertella_occidentalis_pri_70759.glb", "Hebertella occidentalis"),
]


def plot_overlay(ax, mesh_sil, model_sil, title=None):
    mx, my = mesh_sil
    if len(mx):
        ax.fill(mx, my, facecolor="#d4cdb8", edgecolor="#5a5a5a",
                linewidth=1.4, label="Mesh", alpha=0.95)
    fx, fy = model_sil
    if len(fx):
        ax.plot(fx, fy, color="#b6322d", linewidth=2.0,
                linestyle=(0, (5, 3)), label="Model")
        ax.fill(fx, fy, facecolor="#b6322d", alpha=0.10)
    ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    if title:
        ax.set_title(title, fontsize=10, color="#6b3410")


def main():
    glb_dir = os.path.abspath(os.path.join(HERE, "..", "3d_models"))
    with open(os.path.join(HERE, "fit_round5.json")) as f:
        records = {r["name"]: r for r in json.load(f)}
    out_dir = os.path.abspath(os.path.join(HERE, "..", "..", "images", "morphospace"))
    os.makedirs(out_dir, exist_ok=True)

    # Composite — all species in one image
    n = len(SPECIES)
    fig, axes = plt.subplots(n, 3, figsize=(11, 3.2 * n),
                              gridspec_kw=dict(wspace=0.06, hspace=0.30))
    for r, (fname, label) in enumerate(SPECIES):
        path = os.path.join(glb_dir, fname)
        V, _ = load_glb(path)
        Vc = canonicalise(V)
        mesh_sils = mesh_silhouettes(Vc)
        params_dict = records[label]["params"]
        p = Params(**params_dict)
        model_sils = model_silhouettes(p)
        for c, name in enumerate(["TOP", "FRONT", "SIDE"]):
            ax = axes[r][c]
            plot_overlay(ax, mesh_sils[c], model_sils[c],
                          title=name if r == 0 else None)
        axes[r][0].set_ylabel(label, fontsize=11, fontweight="bold",
                              color="#6b3410", rotation=0, labelpad=120,
                              ha="right", va="center")
        # Per-species image (for embedding in the web view)
        sp_id = label.lower().replace(" ", "_").replace(".", "")
        figS, axesS = plt.subplots(1, 3, figsize=(9, 3.2),
                                     gridspec_kw=dict(wspace=0.06))
        for c, name in enumerate(["TOP", "FRONT", "SIDE"]):
            plot_overlay(axesS[c], mesh_sils[c], model_sils[c], title=name)
        figS.suptitle(label, fontsize=11, fontweight="bold", color="#6b3410", y=1.03)
        figS.savefig(os.path.join(out_dir, f"{sp_id}_overlay.png"),
                      dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
        plt.close(figS)

    composite_path = os.path.abspath(os.path.join(HERE, "..", "visualizer_test",
                                                   "overlay_compare.png"))
    fig.savefig(composite_path, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    print("Wrote composite:", composite_path)
    print("Wrote per-species PNGs to:", out_dir)


if __name__ == "__main__":
    main()
