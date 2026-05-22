#!/usr/bin/env python3
"""Critically assess parametric (categorical) renderings against the GLB
silhouettes. For each of the 10 GLBs:
  - extract canonical mesh silhouettes (TOP/FRONT/SIDE) via the existing pipeline
  - render the parametric SVGs via the JS render.js (sandboxed in Node)
  - compose: row = species, columns = [MESH TOP, PARAM TOP, MESH FRONT, PARAM FRONT, MESH SIDE, PARAM SIDE]

Used to drive round-by-round parametric-renderer fixes.
"""
import os, sys, subprocess, json, tempfile
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glb_loader import load_glb
from silhouette import canonicalise, mesh_silhouettes
sys.path.insert(0, os.path.join(HERE, "..", "visualizer_test"))
from render import draw_svg   # SVG → matplotlib axes

GLB_DIR = os.path.abspath(os.path.join(HERE, "..", "3d_models"))
RENDER_JS = os.path.abspath(os.path.join(HERE, "..", "..", "render.js"))
MANIFEST_JS = os.path.abspath(os.path.join(HERE, "..", "..", "manifest.js"))

# Per-species best-guess parametric answers. These are what a student would
# pick from the sliders for each taxon if guided by the morphology.
SPECIES = [
    # filename                                              label                 answers
    ("brachiopod_atrypa_devoniana_pri_70763.glb",          "Atrypa devoniana",
        dict(outline_pick="subcircular", profile_pick="biconvex",
             hinge_pick="astrophic", surface_ribs="yes", surface_frills="yes",
             rib_density="dense", fold_pick="strong",
             beak_pick="subdued", lateral_pick="smooth")),
    ("brachiopod_spinocyrtia_iowensis_pri_70766.glb",      "Spinocyrtia iowensis",
        dict(outline_pick="wing-shaped", profile_pick="biconvex",
             hinge_pick="wide-strophic", surface_ribs="yes",
             rib_density="dense", fold_pick="strong",
             beak_pick="prominent", lateral_pick="smooth")),
    ("brachiopod_mediospirifer_audaculus_pri_70767.glb",   "Mediospirifer audaculus",
        dict(outline_pick="wing-shaped", profile_pick="biconvex",
             hinge_pick="wide-strophic", surface_ribs="yes",
             rib_density="medium", fold_pick="strong",
             beak_pick="moderate", lateral_pick="smooth")),
    ("brachiopod_megakozlowskiella_pri_50329.glb",         "Megakozlowskiella",
        dict(outline_pick="wing-shaped", profile_pick="biconvex",
             hinge_pick="wide-strophic", surface_ribs="yes",
             rib_density="medium", fold_pick="strong",
             beak_pick="moderate", lateral_pick="smooth")),
    ("brachiopod_mucrospirifer_arkonensis_pri_76891.glb",  "Mucrospirifer arkonensis",
        dict(outline_pick="wing-shaped", profile_pick="biconvex",
             hinge_pick="wide-strophic", surface_ribs="yes",
             rib_density="dense", fold_pick="strong",
             beak_pick="moderate", lateral_pick="smooth")),
    ("brachiopod_pentamerus_oblongus_pri_42138.glb",       "Pentamerus oblongus",
        dict(outline_pick="elongate-oval", profile_pick="biconvex",
             hinge_pick="astrophic", surface_ribs="yes",
             rib_density="sparse", fold_pick="weak",
             beak_pick="prominent", lateral_pick="smooth")),
    ("brachiopod_t._venustula_pri_70762.glb",              "T. venustula",
        dict(outline_pick="subcircular", profile_pick="biconvex",
             hinge_pick="astrophic",
             beak_pick="subdued", lateral_pick="smooth")),
    ("brachiopod_trichorhynchia_sp._pri_76900.glb",        "Trichorhynchia sp.",
        dict(outline_pick="pentagonal", profile_pick="biconvex",
             hinge_pick="astrophic", surface_ribs="yes",
             rib_density="sparse", fold_pick="strong",
             beak_pick="moderate", lateral_pick="smooth")),
    ("brachiopoda_spinatrypa_spinosa_pri_70769.glb",       "Spinatrypa spinosa",
        dict(outline_pick="subcircular", profile_pick="biconvex",
             hinge_pick="astrophic", surface_ribs="yes",
             surface_frills="yes", surface_spines="yes",
             rib_density="medium", fold_pick="weak",
             beak_pick="subdued", lateral_pick="smooth")),
    ("hebertella_occidentalis_pri_70759.glb",              "Hebertella occidentalis",
        dict(outline_pick="subcircular", profile_pick="biconvex",
             hinge_pick="narrow-strophic", surface_ribs="yes",
             rib_density="dense", fold_pick="weak",
             beak_pick="moderate", lateral_pick="smooth")),
]


def gen_param_svgs(answers_list, out_dir):
    """Run a Node script that loads render.js and writes svgTop/Front/Side
    for each answers dict. Returns list of (top_path, front_path, side_path)."""
    os.makedirs(out_dir, exist_ok=True)
    # Tiny driver script — note no leading indentation (it's standalone Node)
    driver = (
        "const fs = require('fs'); const vm = require('vm');\n"
        "const m = fs.readFileSync(process.argv[3], 'utf8');\n"
        "const r = fs.readFileSync(process.argv[4], 'utf8');\n"
        "const data = JSON.parse(fs.readFileSync(process.argv[5], 'utf8'));\n"
        "const outDir = process.argv[6];\n"
        "const ctx = vm.createContext({\n"
        "  document: { addEventListener:()=>{}, getElementById:()=>null, createElement:()=>({}) },\n"
        "  window: { addEventListener:()=>{}, scrollTo:()=>{}, location:{hash:''} },\n"
        "  location:{hash:''}, console, Math\n"
        "});\n"
        "vm.runInContext(m, ctx); vm.runInContext(r, ctx);\n"
        "data.forEach((entry) => {\n"
        "  const ans = entry.answers;\n"
        "  fs.writeFileSync(outDir + '/' + entry.id + '_top.svg', ctx.svgTopView(ans));\n"
        "  fs.writeFileSync(outDir + '/' + entry.id + '_front.svg', ctx.svgFrontView(ans));\n"
        "  fs.writeFileSync(outDir + '/' + entry.id + '_side.svg', ctx.svgSideView(ans));\n"
        "});\n"
        "console.log('OK');\n"
    )
    data = [dict(id=ans["_id"], answers={k: v for k, v in ans.items() if k != "_id"})
            for ans in answers_list]
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(driver); driver_path = f.name
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(data, f); data_path = f.name
    subprocess.run(["node", driver_path, "_self_", MANIFEST_JS, RENDER_JS, data_path, out_dir],
                   check=True, capture_output=True)
    os.unlink(driver_path); os.unlink(data_path)
    paths = [(os.path.join(out_dir, f"{d['id']}_top.svg"),
              os.path.join(out_dir, f"{d['id']}_front.svg"),
              os.path.join(out_dir, f"{d['id']}_side.svg")) for d in data]
    return paths


def safe_label(label):
    return label.lower().replace(" ", "_").replace(".", "_")


def main(out_name="assessment_round1.png"):
    answers_list = []
    for fname, label, ans in SPECIES:
        a = dict(ans); a["_id"] = safe_label(label)
        answers_list.append(a)

    svg_dir = os.path.join(HERE, "_param_svgs")
    paths = gen_param_svgs(answers_list, svg_dir)

    n = len(SPECIES)
    fig, axes = plt.subplots(n, 6, figsize=(16, 2.6 * n),
                              gridspec_kw=dict(wspace=0.06, hspace=0.32))
    view_titles = ["MESH TOP", "PARAM TOP", "MESH FRONT", "PARAM FRONT",
                   "MESH SIDE", "PARAM SIDE"]

    for r, ((fname, label, _), (tp, fp, sp)) in enumerate(zip(SPECIES, paths)):
        V, _ = load_glb(os.path.join(GLB_DIR, fname))
        Vc = canonicalise(V)
        mesh_sils = mesh_silhouettes(Vc)
        for c, name in enumerate(view_titles):
            ax = axes[r][c]
            ax.set_xticks([]); ax.set_yticks([])
            for s in ax.spines.values(): s.set_visible(False)
            if r == 0:
                ax.set_title(name, fontsize=9, color="#6b3410")
            if c % 2 == 0:
                # MESH column
                view_idx = c // 2
                xs, ys = mesh_sils[view_idx]
                if len(xs):
                    ax.fill(xs, ys, facecolor="#d4cdb8", edgecolor="#5a5a5a",
                            linewidth=1.4)
                ax.set_aspect("equal")
            else:
                # PARAM column
                view_idx = c // 2
                svg_path = [tp, fp, sp][view_idx]
                ax.set_facecolor("#fffef7")
                draw_svg(ax, svg_path)
        axes[r][0].set_ylabel(label, fontsize=9, color="#6b3410", rotation=0,
                              labelpad=120, ha="right", va="center", fontweight="bold")
    out = os.path.join(HERE, out_name)
    fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    print("Wrote", out)


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "assessment_round1.png"
    main(name)
