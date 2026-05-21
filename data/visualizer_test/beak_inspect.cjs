// Beak / lateral-profile sweep — verifies the new side-view parameters
// produce distinct silhouettes that the other views don't already show.

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

const BASE = {
  outline_pick: "subcircular", profile_pick: "biconvex",
  surface_ribs: "yes", rib_density: "medium", fold_pick: "weak"
};

const CASES = [
  // Beak prominence sweep — strophic shells
  { id: "strophic_subdued",   label: "Strophic, low beak",
    answers: { ...BASE, hinge_pick: "narrow-strophic", beak_pick: "subdued" } },
  { id: "strophic_moderate",  label: "Strophic, moderate beak",
    answers: { ...BASE, hinge_pick: "narrow-strophic", beak_pick: "moderate" } },
  { id: "strophic_prominent", label: "Strophic, tall beak",
    answers: { ...BASE, hinge_pick: "narrow-strophic", beak_pick: "prominent" } },
  { id: "strophic_pyramidal", label: "Strophic, pyramidal (Cyrtina)",
    answers: { ...BASE, hinge_pick: "wide-strophic", beak_pick: "pyramidal" } },
  // Astrophic beak sweep
  { id: "astrophic_subdued",  label: "Astrophic, low beak",
    answers: { ...BASE, hinge_pick: "astrophic", beak_pick: "subdued" } },
  { id: "astrophic_prominent",label: "Astrophic, prominent beak",
    answers: { ...BASE, hinge_pick: "astrophic", beak_pick: "prominent" } },
  // Lateral profile kinks
  { id: "geniculate",         label: "Geniculate (Douvillina)",
    answers: { ...BASE, hinge_pick: "wide-strophic", profile_pick: "concavo-convex",
               lateral_pick: "geniculate", beak_pick: "moderate" } },
  { id: "resupinate",         label: "Resupinate (Strophonelloides)",
    answers: { ...BASE, hinge_pick: "wide-strophic", lateral_pick: "resupinate", beak_pick: "moderate" } }
];

const outDir = path.join(here, "svgs_beak");
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
