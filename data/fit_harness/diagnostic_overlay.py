#!/usr/bin/env python3
"""Diagnostic outlines for brach1/2/3 — parametric outlines placed beside
the photocomposite for direct visual comparison.

For each specimen we render:
  - the dorsal/TOP view as the parametric outline + decorations
  - the anterior/FRONT view as the parametric tri-view middle
  - the lateral/SIDE view as the parametric tri-view right

These are placed in tiles next to a crop of the corresponding view in
the photocomposite. The crops are approximate (eye-balled bounding
boxes) but enough for visual comparison.

Output: data/fit_harness/diagnostic_brach{1,2,3}.png + a composite.
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


# Layout per composite (estimated by eye). Each view = (x0, y0, x1, y1).
SPECIMENS = [
    dict(name="brach1",
         photo="images/unknown_misc/rockford/brach1.png",
         tiles=dict(
             dorsal   =(40,   0,  500, 480),
             ventral  =(40, 440,  500, 878),
             anterior =(870,  0, 1300, 400),
             hinge    =(870, 470, 1300, 870),
             side     =(420, 230,  870, 660),
         ),
         best_guess="Schizophoria iowensis / Platyrachella macbridei",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="narrow-strophic", surface_ribs="yes",
                       rib_density="dense", fold_pick="weak",
                       beak_pick="moderate", lateral_pick="smooth")),
    dict(name="brach2",
         photo="images/unknown_misc/rockford/brach2.png",
         tiles=dict(
             dorsal   =(20,   0,  450, 540),
             side     =(420, 250,  790, 620),
             anterior =(700,  30, 1100, 380),
             ventral  =(770, 400, 1200, 780),
         ),
         best_guess="Schizophoria iowensis (orthid)",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="narrow-strophic", surface_ribs="yes",
                       rib_density="medium", fold_pick="strong",
                       beak_pick="moderate", lateral_pick="smooth")),
    dict(name="brach3",
         photo="images/unknown_misc/rockford/brach3.png",
         tiles=dict(
             dorsal   =(20,   0,   460, 380),
             ventral  =(20, 400,   460, 800),
             side     =(450, 200,  900, 600),
             # top-right = HINGE view (pyramidal interarea + umbo)
             # bottom-right = ANTERIOR view (with fold)
             hinge    =(880,   0, 1380, 400),
             anterior =(880, 400, 1380, 818),
         ),
         best_guess="Conispirifer cyrtinaeformis (cone-shaped spiriferid)",
         answers=dict(outline_pick="conical", profile_pick="biconvex",
                       hinge_pick="wide-strophic", surface_ribs="yes",
                       rib_density="dense", fold_pick="strong",
                       beak_pick="pyramidal", lateral_pick="smooth")),
    # brach4 — non-standard 5-view layout: dorsal+ventral on left,
    # side in center, hinge top-right, anterior bottom-right.
    dict(name="brach4",
         photo="images/unknown_misc/rockford/brach4.png",
         tiles=dict(
             dorsal   =(40,   20,  570, 380),
             ventral  =(40,  380,  570, 760),
             side     =(450, 270,  900, 670),
             hinge    =(820,  20, 1380, 370),
             anterior =(900, 440, 1310, 780),
         ),
         best_guess="Cyrtospirifer whitneyi (alate spiriferid)",
         answers=dict(outline_pick="wing-shaped", profile_pick="biconvex",
                       hinge_pick="wide-strophic", surface_ribs="yes",
                       rib_density="dense", fold_pick="strong",
                       beak_pick="moderate", lateral_pick="smooth")),
    # brach5 — same 5-view layout as brach4. Subcircular astrophic with
    # prominent growth-lamellae frills and weak fold. Could be an atrypid
    # (Pseudoatrypa) or a smooth-looking spiriferid (Theodossia).
    dict(name="brach5",
         photo="images/unknown_misc/rockford/brach5.png",
         tiles=dict(
             dorsal   =(40,   20,  500, 410),
             ventral  =(40,  420,  500, 800),
             side     =(380, 280,  920, 660),
             hinge    =(920,   60, 1290, 320),
             anterior =(940, 420, 1290, 720),
         ),
         best_guess="Pseudoatrypa devoniana (atrypid w/ frills)",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="astrophic", surface_ribs="yes",
                       rib_density="sparse", surface_frills="yes",
                       fold_pick="weak",
                       beak_pick="moderate", lateral_pick="smooth")),
    # brach6 — Theodossia hungerfordi: globose subcircular biconvex
    # spiriferid with prominent uniplicate fold, subdued ribs, and a
    # hooked umbo that students perceive as astrophic.
    dict(name="brach6",
         photo="images/unknown_misc/rockford/brach6.png",
         tiles=dict(
             dorsal   =(40,   10,  490, 430),
             ventral  =(40,  430,  490, 850),
             side     =(430, 290,  900, 600),
             anterior =(820, 100, 1260, 380),
             hinge    =(840, 510, 1260, 800),
         ),
         best_guess="Theodossia hungerfordi (globose spiriferid)",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="astrophic", surface_ribs="yes",
                       rib_density="medium", fold_pick="strong",
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


def crop(img, bbox):
    x0, y0, x1, y1 = bbox
    return img.crop((x0, y0, x1, y1))


VIEW_MAP = [
    ("dorsal",    "top"),
    ("ventral",   "top"),
    ("anterior",  "front"),
    ("side",      "side"),
    ("hinge",     "top"),    # hinge-view comparison — TOP shows the strophic hinge
]


def main():
    svg_dir = os.path.join(HERE, "_diagnostic_svgs")
    gen_svgs([dict(id=sp["name"], answers=sp["answers"]) for sp in SPECIMENS], svg_dir)

    for sp in SPECIMENS:
        img = Image.open(os.path.join(ROOT, sp["photo"]))
        avail_views = [(vn, ps) for vn, ps in VIEW_MAP if vn in sp["tiles"]]
        n = len(avail_views)

        fig, axes = plt.subplots(n, 2, figsize=(10, 3.6 * n),
                                  gridspec_kw=dict(wspace=0.04, hspace=0.18))
        if n == 1:
            axes = [axes]

        for r, (view_name, param_view) in enumerate(avail_views):
            tile = crop(img, sp["tiles"][view_name])
            axes[r][0].imshow(tile)
            axes[r][0].set_xticks([]); axes[r][0].set_yticks([])
            for s in axes[r][0].spines.values(): s.set_visible(False)
            axes[r][0].set_title(f"PHOTO — {view_name}", fontsize=11, color="#6b3410")

            axes[r][1].set_facecolor("#fffef7")
            svg_path = os.path.join(svg_dir, f"{sp['name']}_{param_view}.svg")
            draw_svg(axes[r][1], svg_path)
            axes[r][1].set_xticks([]); axes[r][1].set_yticks([])
            for s in axes[r][1].spines.values(): s.set_visible(False)
            axes[r][1].set_title(f"PARAM — {param_view}", fontsize=11, color="#6b3410")

        fig.suptitle(f"{sp['name']} — likely {sp['best_guess']}",
                      fontsize=14, color="#6b3410", fontweight="bold", y=0.995)
        out = os.path.join(HERE, f"diagnostic_{sp['name']}.png")
        fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
        plt.close(fig)
        print("Wrote", out)


if __name__ == "__main__":
    main()
