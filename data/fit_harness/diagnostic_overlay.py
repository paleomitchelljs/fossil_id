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
    dict(name="brach1", dir="brach1_pseudoatrypa_devoniana",
         taxon_key="pseudoatrypa-devoniana",
         best_guess="Pseudoatrypa devoniana (atrypid w/ frills)",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="astrophic", surface_ribs="yes",
                       rib_density="dense", surface_frills="yes",
                       fold_pick="strong", inflation_pick="medium",
                       beak_pick="moderate", lateral_pick="smooth")),
    dict(name="brach2", dir="brach2_schizophoria_iowensis",
         taxon_key="schizophoria-iowensis",
         best_guess="Schizophoria iowensis (orthid)",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="narrow-strophic", surface_ribs="yes",
                       rib_density="medium", fold_pick="strong",
                       inflation_pick="medium",
                       beak_pick="moderate", lateral_pick="smooth")),
    dict(name="brach3", dir="brach3_conispirifer",
         # No fitted shape data for Conispirifer — categorical only.
         best_guess="Conispirifer cyrtinaeformis (cone-shaped spiriferid)",
         answers=dict(outline_pick="conical", profile_pick="biconvex",
                       hinge_pick="wide-strophic", surface_ribs="yes",
                       rib_density="dense", fold_pick="strong",
                       inflation_pick="high",
                       beak_pick="pyramidal", lateral_pick="smooth")),
    dict(name="brach4", dir="brach4_cyrtospirifer_whitneyi",
         taxon_key="cyrtospirifer-whitneyi",
         best_guess="Cyrtospirifer whitneyi (alate spiriferid)",
         answers=dict(outline_pick="wing-shaped", profile_pick="biconvex",
                       hinge_pick="wide-strophic", surface_ribs="yes",
                       rib_density="dense", fold_pick="strong",
                       inflation_pick="medium",
                       beak_pick="prominent", lateral_pick="smooth")),
    dict(name="brach5", dir="brach5_spinatrypa_rockfordensis",
         best_guess="Spinatrypa rockfordensis (spinose atrypid)",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="astrophic", surface_ribs="yes",
                       rib_density="sparse", surface_frills="yes",
                       surface_spines="yes", fold_pick="weak",
                       inflation_pick="medium",
                       beak_pick="moderate", lateral_pick="smooth")),
    dict(name="brach6", dir="brach6_theodossia_hungerfordi",
         best_guess="Theodossia hungerfordi (globose spiriferid)",
         answers=dict(outline_pick="subcircular", profile_pick="biconvex",
                       hinge_pick="astrophic", surface_ribs="yes",
                       rib_density="medium", fold_pick="strong",
                       inflation_pick="high",
                       beak_pick="prominent", lateral_pick="smooth")),
    dict(name="brach7", dir="brach7_douvillina_arcuata",
         best_guess="Douvillina arcuata (geniculate strophomenid)",
         answers=dict(outline_pick="subcircular", profile_pick="concavo-convex",
                       hinge_pick="wide-strophic", surface_ribs="yes",
                       rib_density="dense", fold_pick="none",
                       inflation_pick="low",
                       beak_pick="subdued", lateral_pick="geniculate")),
]


def gen_svgs(answers_list, out_dir):
    """Generate categorical PARAM SVGs from slider answers, plus
    analytical (fitted-shape) SVGs for entries that include a
    `taxon_key`. Analytical SVGs are saved with `_analytical_<view>`
    suffix and are produced from the manifest's `shape:` block via
    the morphospace renderer (svgAnalyticalTop / Front / Side)."""
    os.makedirs(out_dir, exist_ok=True)
    driver = r"""
const fs = require('fs'); const vm = require('vm');
const m = fs.readFileSync(process.argv[3], 'utf8');
const r = fs.readFileSync(process.argv[4], 'utf8');
const data = JSON.parse(fs.readFileSync(process.argv[5], 'utf8'));
const outDir = process.argv[6];
const vecPath = process.argv[3].replace('manifest.js', 'vectorized_atlas.js');
const vec = fs.existsSync(vecPath) ? fs.readFileSync(vecPath, 'utf8') : '';
const ctx = vm.createContext({
  document: { addEventListener:()=>{}, getElementById:()=>null, createElement:()=>({}) },
  window: { addEventListener:()=>{}, scrollTo:()=>{}, location:{hash:''} },
  location:{hash:''}, console, Math,
  // Expose fs/data/outDir into the context so the inner script can
  // access FAUNA (which lives in the context's lexical scope, not on
  // the ctx object itself when declared via `const`).
  fs: fs, _entries: data, _outDir: outDir
});
vm.runInContext(m, ctx);
if (vec) vm.runInContext(vec, ctx);
vm.runInContext(r, ctx);
vm.runInContext(`
  function _findTaxonShape(slug) {
    for (const g of FAUNA) {
      if (!g.subgroups) continue;
      for (const sg of g.subgroups) {
        for (const t of sg.taxa) {
          const s = (t.genus + '-' + t.species).toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          if (s === slug && t.shape) return t.shape;
        }
      }
    }
    return null;
  }
  for (const entry of _entries) {
    fs.writeFileSync(_outDir + '/' + entry.id + '_top.svg', svgTopView(entry.answers));
    fs.writeFileSync(_outDir + '/' + entry.id + '_front.svg', svgFrontView(entry.answers));
    fs.writeFileSync(_outDir + '/' + entry.id + '_side.svg', svgSideView(entry.answers));
    if (entry.taxon_key) {
      const shape = _findTaxonShape(entry.taxon_key);
      if (shape) {
        fs.writeFileSync(_outDir + '/' + entry.id + '_analytical_top.svg', svgAnalyticalTop(shape));
        fs.writeFileSync(_outDir + '/' + entry.id + '_analytical_front.svg', svgAnalyticalFront(shape));
        fs.writeFileSync(_outDir + '/' + entry.id + '_analytical_side.svg', svgAnalyticalSide(shape));
      }
    }
  }
`, ctx);
console.log('OK');
"""
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


# View files in each brach subfolder, paired with the corresponding
# parametric view (top/front/side from svgs).
VIEW_FILES = [
    ("top_valve1.png", "top"),
    ("top_valve2.png", "top"),
    ("anterior.png",   "front"),
    ("side.png",       "side"),
    ("hinge.png",      "top"),    # hinge-view comparison — TOP shows the strophic hinge
]

IMG_DIR = os.path.join(ROOT, "images", "unknown_misc", "rockford")


def view_path(specimen, filename):
    return os.path.join(IMG_DIR, specimen["dir"], filename)


def main():
    svg_dir = os.path.join(HERE, "_diagnostic_svgs")
    gen_svgs([dict(id=sp["name"], answers=sp["answers"]) for sp in SPECIMENS], svg_dir)

    for sp in SPECIMENS:
        avail = [(fn, pv) for fn, pv in VIEW_FILES if os.path.exists(view_path(sp, fn))]
        n = len(avail)
        if n == 0:
            continue
        fig, axes = plt.subplots(n, 2, figsize=(10, 3.6 * n),
                                  gridspec_kw=dict(wspace=0.04, hspace=0.18))
        if n == 1:
            axes = [axes]

        for r, (fn, param_view) in enumerate(avail):
            tile = Image.open(view_path(sp, fn))
            axes[r][0].imshow(tile)
            axes[r][0].set_xticks([]); axes[r][0].set_yticks([])
            for s in axes[r][0].spines.values(): s.set_visible(False)
            axes[r][0].set_title(f"PHOTO — {fn.replace('.png','')}", fontsize=11, color="#6b3410")

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
