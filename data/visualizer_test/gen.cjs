// Generate parametric brachiopod SVGs by loading the actual render.js used
// by the field guide, then evaluating svgTopView / svgFrontView / svgSideView
// for each test species. Outputs one SVG per (species × view) into ./svgs/.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const here = __dirname;
const manifestSrc = fs.readFileSync(path.join(here, "..", "..", "manifest.js"), "utf8");
const renderSrc   = fs.readFileSync(path.join(here, "..", "..", "render.js"),   "utf8");

// Build a minimal sandbox so render.js's DOM-touching bits don't crash.
const sandbox = {
  // We never actually call route(); we just need svgTopView etc.
  // The router attaches event listeners at the bottom; provide stubs.
  document: {
    addEventListener: () => {},
    getElementById:   () => null,
    createElement:    () => ({}),
  },
  window: {
    addEventListener: () => {},
    scrollTo:         () => {},
    location:         { hash: "" },
  },
  location: { hash: "" },
  console,
  Math,
};
sandbox.window.location = sandbox.location;
sandbox.window.document = sandbox.document;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
vm.runInContext(manifestSrc, ctx, { filename: "manifest.js" });
vm.runInContext(renderSrc,   ctx, { filename: "render.js"   });

const SPECIES = [
  { id: "pseudoatrypa_devoniana",
    name: "Pseudoatrypa devoniana",
    answers: {
      outline_pick: "subcircular", profile_pick: "biconvex",
      hinge_pick: "astrophic",
      surface_ribs: "yes", surface_frills: "yes",
      rib_density: "dense", fold_pick: "strong"
    } },
  { id: "cyrtospirifer_whitneyi",
    name: "Cyrtospirifer whitneyi",
    answers: {
      outline_pick: "wing-shaped", profile_pick: "biconvex",
      hinge_pick: "wide-strophic",
      surface_ribs: "yes",
      rib_density: "dense", fold_pick: "strong"
    } },
  { id: "schizophoria_iowensis",
    name: "Schizophoria iowensis",
    answers: {
      outline_pick: "subcircular", profile_pick: "biconvex",
      hinge_pick: "narrow-strophic",
      surface_ribs: "yes",
      rib_density: "dense", fold_pick: "weak"
    } }
];

const outDir = path.join(here, "svgs");
fs.mkdirSync(outDir, { recursive: true });

const VIEWS = ["top", "front", "side"];
const FN = { top: ctx.svgTopView, front: ctx.svgFrontView, side: ctx.svgSideView };

const manifest = [];
for (const sp of SPECIES) {
  const entry = { id: sp.id, name: sp.name, answers: sp.answers, files: {} };
  for (const v of VIEWS) {
    const svg = FN[v](sp.answers);
    const file = `${sp.id}_${v}.svg`;
    fs.writeFileSync(path.join(outDir, file), svg);
    entry.files[v] = file;
  }
  manifest.push(entry);
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("Generated", manifest.length * VIEWS.length, "SVGs in", outDir);
