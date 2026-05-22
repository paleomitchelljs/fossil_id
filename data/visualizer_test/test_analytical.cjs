// Render the analytical (fitted) silhouettes for all manifest taxa with
// shape data, plus the parametric versions for comparison.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const here = __dirname;
const manifestSrc = fs.readFileSync(path.join(here, "..", "..", "manifest.js"), "utf8");
const renderSrc   = fs.readFileSync(path.join(here, "..", "..", "render.js"),   "utf8");
const sandbox = {
  document: { addEventListener:()=>{}, getElementById:()=>null, createElement:()=>({}) },
  window: { addEventListener:()=>{}, scrollTo:()=>{}, location:{hash:""} },
  location: { hash: "" }, console, Math,
};
const ctx = vm.createContext(sandbox);
vm.runInContext(manifestSrc, ctx);
vm.runInContext(renderSrc, ctx);

// `const FAUNA = …` in manifest.js doesn't attach to globalThis in vm —
// reach in via a second runInContext call.
const FAUNA = vm.runInContext("FAUNA", ctx);

// Walk manifest for taxa with shape
const out = [];
for (const g of FAUNA || []) {
  for (const sub of g.subgroups) {
    for (const t of sub.taxa) {
      if (t.shape) out.push(t);
    }
  }
}
console.log("Shaped taxa:", out.length);

const outDir = path.join(here, "svgs_analytical");
fs.mkdirSync(outDir, { recursive: true });
const manifest = [];
for (const t of out) {
  const id = (t.genus + "_" + t.species).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const entry = { id, name: `${t.genus} ${t.species}`, files: {} };
  for (const v of ["top", "front", "side"]) {
    const fn = v === "top" ? ctx.svgAnalyticalTop
             : v === "front" ? ctx.svgAnalyticalFront
             : ctx.svgAnalyticalSide;
    const svg = fn(t.shape);
    const file = `${id}_${v}.svg`;
    fs.writeFileSync(path.join(outDir, file), svg);
    entry.files[v] = file;
  }
  manifest.push(entry);
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("Wrote", manifest.length * 3, "SVGs");
