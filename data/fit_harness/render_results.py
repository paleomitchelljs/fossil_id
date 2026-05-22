"""Re-render a comparison plot from a saved fit_roundN.json (no refitting)."""
import os
import sys
import json
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


def main(json_path, out_path):
    with open(json_path) as f:
        records = json.load(f)
    by_name = {r["name"]: r for r in records}

    glb_dir = os.path.abspath(os.path.join(HERE, "..", "3d_models"))
    n = len(SPECIES)
    fig, axes = plt.subplots(n, 6, figsize=(24, 4.0 * n),
                             gridspec_kw=dict(wspace=0.04, hspace=0.18))
    for r, (fname, label) in enumerate(SPECIES):
        V, T = load_glb(os.path.join(glb_dir, fname))
        Vc = canonicalise(V)
        target = mesh_silhouettes(Vc)
        rec = by_name[label]
        p = Params(**rec["params"])
        model_sils = model_silhouettes(p)
        for c, name in enumerate(["TOP", "FRONT", "SIDE"]):
            ax_m = axes[r][c]
            xs, ys = target[c]
            ax_m.fill(xs, ys, facecolor="#e8e3d4", edgecolor="black", linewidth=1.4)
            ax_m.set_aspect("equal"); ax_m.set_xticks([]); ax_m.set_yticks([])
            for s in ax_m.spines.values(): s.set_visible(False)
            if r == 0: ax_m.set_title(f"MESH {name}", fontsize=12, color="#6b3410")

            ax_f = axes[r][c + 3]
            xs, ys = model_sils[c]
            ax_f.fill(xs, ys, facecolor="#fffef7", edgecolor="black", linewidth=1.4)
            ax_f.set_aspect("equal"); ax_f.set_xticks([]); ax_f.set_yticks([])
            for s in ax_f.spines.values(): s.set_visible(False)
            if r == 0: ax_f.set_title(f"FIT {name}", fontsize=12, color="#6b3410")
        axes[r][0].set_ylabel(f"{label}\nloss={rec['loss']:.3f}",
                              fontsize=10, color="#6b3410", rotation=0,
                              labelpad=120, ha="right", va="center")
    fig.savefig(out_path, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    print("Wrote", out_path)


if __name__ == "__main__":
    json_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "fit_round1.json")
    out_path = sys.argv[2] if len(sys.argv) > 2 else json_path.replace(".json", "_big.png")
    main(json_path, out_path)
