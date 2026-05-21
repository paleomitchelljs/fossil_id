// Edge-case smoke test: render some non-standard answer combos and write
// SVGs so we can eyeball the visualizer's behavior outside the three calibration species.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const here = __dirname;
const manifestSrc = fs.readFileSync(path.join(here, "..", "..", "manifest.js"), "utf8");
const renderSrc   = fs.readFileSync(path.join(here, "..", "..", "render.js"),   "utf8");
const sandbox = {
  document: { addEventListener:()=>{}, getElementById:()=>null, createElement:()=>({}) },
  window: { addEventListener:()=>{}, scrollTo:()=>{}, location:{hash:""} },
  location: { hash: "" },
  console, Math,
};
const ctx = vm.createContext(sandbox);
vm.runInContext(manifestSrc, ctx);
vm.runInContext(renderSrc, ctx);

const CASES = [
  { id: "productid",
    name: "Devonoproductus (productid)",
    answers: {
      outline_pick: "subcircular", profile_pick: "concavo-convex",
      hinge_pick: "narrow-strophic",
      surface_ribs: "yes", surface_spines: "yes",
      rib_density: "sparse", fold_pick: "none"
    } },
  { id: "terebratulid",
    name: "Cranaena (terebratulid)",
    answers: {
      outline_pick: "elongate-oval", profile_pick: "biconvex",
      hinge_pick: "astrophic",
      fold_pick: "none"
    } },
  { id: "strophomenid",
    name: "Strophodonta (strophomenid)",
    answers: {
      outline_pick: "subcircular", profile_pick: "concavo-convex",
      hinge_pick: "wide-strophic",
      surface_ribs: "yes",
      rib_density: "medium", fold_pick: "none"
    } }
];

const outDir = path.join(here, "svgs");
fs.mkdirSync(outDir, { recursive: true });
const manifest = [];
for (const c of CASES) {
  const entry = { id: c.id, name: c.name, answers: c.answers, files: {} };
  for (const v of ["top", "front", "side"]) {
    const svg = (v === "top" ? ctx.svgTopView : v === "front" ? ctx.svgFrontView : ctx.svgSideView)(c.answers);
    const file = `${c.id}_${v}.svg`;
    fs.writeFileSync(path.join(outDir, file), svg);
    entry.files[v] = file;
  }
  manifest.push(entry);
}
fs.writeFileSync(path.join(outDir, "edge_manifest.json"), JSON.stringify(manifest, null, 2));
console.log("Wrote", manifest.length, "edge cases");
