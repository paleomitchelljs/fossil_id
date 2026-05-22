// Quick test: render a smooth-shell + growth-lines-only case (matches the
// user's screenshot scenario) so we can verify the growth-line orientation
// in isolation.

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
vm.runInContext(manifestSrc, ctx); vm.runInContext(renderSrc, ctx);

const answers = {
  outline_pick: "subcircular",
  profile_pick: "biconvex",
  hinge_pick: "astrophic",
  surface_lines: "yes",
  fold_pick: "none",
  beak_pick: "moderate",
  lateral_pick: "smooth"
};

const outDir = path.join(here, "svgs_growth");
fs.mkdirSync(outDir, { recursive: true });
for (const v of ["top", "front", "side"]) {
  const fn = v === "top" ? ctx.svgTopView : v === "front" ? ctx.svgFrontView : ctx.svgSideView;
  fs.writeFileSync(path.join(outDir, `${v}.svg`), fn(answers));
}
console.log("Wrote 3 SVGs to", outDir);
