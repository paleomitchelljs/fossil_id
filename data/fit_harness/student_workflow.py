#!/usr/bin/env python3
"""Student-ID workflow demonstration.

For each of the three unknown specimens at images/unknown_misc/rockford/,
render the parametric SVG silhouettes that match the SLIDER SETTINGS a
student would choose by eye. Place those next to the photocomposite so
we can see whether the parametric tool is "close enough" to support
the student narrowing down a candidate ID.

Output: data/fit_harness/student_workflow.png
"""
import os, sys, subprocess, json, tempfile
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "visualizer_test"))
from render import draw_svg

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))


# A student looking at each specimen would pick these slider values by eye.
SPECIMENS = [
    dict(name="brach1.png",
         photo="images/unknown_misc/rockford/brach1.png",
         features=("Subcircular outline, slightly wider than tall.\n"
                    "Many FINE radial ribs.\n"
                    "Short straight hinge (narrow-strophic).\n"
                    "Moderate fold, biconvex profile.\n"
                    "Smooth lateral profile."),
         best_guess="Schizophoria iowensis or Platyrachella macbridei",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="narrow-strophic", surface_ribs="yes",
                       rib_density="dense", fold_pick="weak",
                       beak_pick="moderate", lateral_pick="smooth")),
    dict(name="brach2.png",
         photo="images/unknown_misc/rockford/brach2.png",
         features=("Smooth shells — no ribs, only faint growth lines.\n"
                    "Strongly globose biconvex (very inflated).\n"
                    "Astrophic — curved beak, no straight hinge.\n"
                    "Clear fold/sulcus in anterior view.\n"
                    "Subcircular outline."),
         best_guess="Gypidula cornuta (pentamerid)",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="astrophic", surface_lines="yes",
                       fold_pick="strong",
                       beak_pick="moderate", lateral_pick="smooth")),
    dict(name="brach3.png",
         photo="images/unknown_misc/rockford/brach3.png",
         features=("STRONGLY ALATE outline with wide wingtips.\n"
                    "Wide strophic hinge — hinge IS the cardinal axis.\n"
                    "Tall central fold peak in anterior view.\n"
                    "Many fine radial ribs.\n"
                    "Dorsibiconvex profile."),
         best_guess="Cyrtospirifer whitneyi",
         answers=dict(outline_pick="wing-shaped", profile_pick="biconvex",
                       hinge_pick="wide-strophic", surface_ribs="yes",
                       rib_density="dense", fold_pick="strong",
                       beak_pick="prominent", lateral_pick="smooth")),
]


def gen_svgs(answers_list, out_dir):
    os.makedirs(out_dir, exist_ok=True)
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
        "  fs.writeFileSync(outDir + '/' + entry.id + '_top.svg', ctx.svgTopView(entry.answers));\n"
        "  fs.writeFileSync(outDir + '/' + entry.id + '_front.svg', ctx.svgFrontView(entry.answers));\n"
        "  fs.writeFileSync(outDir + '/' + entry.id + '_side.svg', ctx.svgSideView(entry.answers));\n"
        "});\n"
        "console.log('OK');\n"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(driver); driver_path = f.name
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(answers_list, f); data_path = f.name
    subprocess.run(["node", driver_path, "_self_",
                     os.path.join(ROOT, "manifest.js"),
                     os.path.join(ROOT, "render.js"),
                     data_path, out_dir],
                    check=True, capture_output=True)
    os.unlink(driver_path); os.unlink(data_path)


def main():
    svg_dir = os.path.join(HERE, "_workflow_svgs")
    answers_list = []
    for i, sp in enumerate(SPECIMENS, start=1):
        answers_list.append(dict(id=f"sp{i}", answers=sp["answers"]))
    gen_svgs(answers_list, svg_dir)

    fig, axes = plt.subplots(3, 4, figsize=(20, 14),
                              gridspec_kw=dict(wspace=0.05, hspace=0.4))
    for r, sp in enumerate(SPECIMENS):
        # Column 0: photocomposite
        ax = axes[r][0]
        photo = os.path.join(ROOT, sp["photo"])
        if os.path.exists(photo):
            ax.imshow(Image.open(photo))
        ax.set_xticks([]); ax.set_yticks([])
        for s in ax.spines.values(): s.set_visible(False)
        if r == 0: ax.set_title("SPECIMEN PHOTO", fontsize=12, color="#6b3410")
        ax.set_ylabel(
            f"{sp['name']}\n\n{sp['features']}\n\nLikely: {sp['best_guess']}",
            fontsize=10, color="#6b3410", rotation=0, labelpad=10,
            ha="right", va="center")

        # Columns 1-3: parametric TOP, FRONT, SIDE
        for c, view in enumerate(["top", "front", "side"]):
            ax = axes[r][c + 1]
            ax.set_facecolor("#fffef7")
            svg_path = os.path.join(svg_dir, f"sp{r+1}_{view}.svg")
            draw_svg(ax, svg_path)
            if r == 0:
                ax.set_title(f"PARAM {view.upper()}", fontsize=12, color="#6b3410")

    out = os.path.join(HERE, "student_workflow.png")
    fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    print("Wrote", out)


if __name__ == "__main__":
    main()
