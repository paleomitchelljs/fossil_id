// Render side views at varying rib density to verify the commissure zigzag
// scales the way the user expects: smooth shells → straight commissure;
// dense ribs → fine teeth; sparse ribs → coarse crenulations.

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
vm.runInContext(manifestSrc, ctx); vm.runInContext(renderSrc, ctx);

const CASES = [
  { id: "smooth_biconvex",  label: "Smooth (no ribs)",
    answers: { outline_pick:"subcircular", profile_pick:"biconvex", hinge_pick:"astrophic", fold_pick:"strong" } },
  { id: "sparse_ribs",      label: "Sparse ribs (~10)",
    answers: { outline_pick:"subcircular", profile_pick:"biconvex", hinge_pick:"astrophic", surface_ribs:"yes", rib_density:"sparse", fold_pick:"strong" } },
  { id: "medium_ribs",      label: "Medium ribs (~20)",
    answers: { outline_pick:"subcircular", profile_pick:"biconvex", hinge_pick:"astrophic", surface_ribs:"yes", rib_density:"medium", fold_pick:"strong" } },
  { id: "dense_ribs",       label: "Dense ribs (~34)",
    answers: { outline_pick:"subcircular", profile_pick:"biconvex", hinge_pick:"astrophic", surface_ribs:"yes", rib_density:"dense", fold_pick:"strong" } },
  { id: "alate_dense",      label: "Alate + dense ribs (Cyrto)",
    answers: { outline_pick:"wing-shaped", profile_pick:"biconvex", hinge_pick:"wide-strophic", surface_ribs:"yes", rib_density:"dense", fold_pick:"strong" } }
];

const outDir = path.join(here, "svgs_zigzag");
fs.mkdirSync(outDir, { recursive: true });
const manifest = [];
for (const c of CASES) {
  const entry = { id: c.id, label: c.label, answers: c.answers, files: {} };
  for (const v of ["top", "front", "side"]) {
    const svg = (v === "top" ? ctx.svgTopView : v === "front" ? ctx.svgFrontView : ctx.svgSideView)(c.answers);
    const file = `${c.id}_${v}.svg`;
    fs.writeFileSync(path.join(outDir, file), svg);
    entry.files[v] = file;
  }
  manifest.push(entry);
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("Wrote", manifest.length, "cases");
