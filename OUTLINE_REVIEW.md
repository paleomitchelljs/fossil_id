# Self-review: outline-generation fit and calibrations

Written after the parabola → cubic-Bezier refactor for valve
silhouettes (commit immediately preceding). The point of this doc is
to **identify what the current model still gets wrong** — both in fit
quality against the seven Rockford diagnostic specimens, and in the
soundness of the calibrations driving the geometry.

## 1. What the Bezier refactor actually fixed

- Side-view silhouettes are no longer mathematically rigid parabolas.
  Each valve is now two cubic-Bezier segments meeting at the apex
  with horizontal-tangent control points, so the curve can sit nearly
  flat over the apex region (a real shell's "shoulder") and taper
  asymmetrically toward the back vs anterior.
- Pseudoatrypa, Theodossia, and Cyrtospirifer side views no longer
  look like inflated balloons — the body has a more natural taper.
- Geniculate (brach7 Douvillina) inherits the same Bezier base and
  applies the kink as a y-perturbation on the front Bezier segment
  rather than fighting a pre-built parabola.

## 2. What the refactor DIDN'T fix — fit-quality issues that remain

### 2.1 The body shapes are still mathematically tidy

Real specimens have asymmetry that even Bezier handles can't reach
with the current parameterization. Looking at the diagnostic grid:

- **brach1 (Pseudoatrypa)**: the photo's dorsal valve is dramatically
  rounded with a near-spherical dome; PARAM dorsal is more flat-topped
  and lens-like. The Bezier handles `apexBackH = apexFrontH = 0.50 *
  halfL` produce a near-symmetric body about the apex, but real
  Pseudoatrypa is wider posteriorly than anteriorly.
- **brach4 (Cyrtospirifer)**: PARAM side has perfectly symmetric
  curvature on both sides of the apex (because the dome handles are
  equal). The photo shows the umbo region MUCH more strongly curved
  than the anterior, then the anterior tapers in a long gentle slope.
  The Bezier model could express this but the handle values aren't
  set to do so.

**Diagnosis**: handle calibrations are eyeballed defaults that
optimize for "looks roughly right" rather than per-taxon biology.
Adding more sub-variants (atrypid-style handles vs alate-spirifer-
style handles) is the right move but I haven't done it.

### 2.2 Beak coils still don't truly coil

The coil Bezier produces a comma-like shape that overlaps the body,
which is better than the stuck-on protrusion of earlier rounds. But
real Theodossia and Cyrtospirifer beaks COIL — they wrap back around
in something approaching a half-spiral. My closed-Bezier comma is a
single loop. To produce a true coil you'd need:
- Either a tighter Bezier with the inner control point sweeping
  past the body interior with a much more dramatic forward extension
- Or multiple Bezier segments forming a small spiral

I went with the first option but the values (`iC2x = ax + hookExt *
0.20`) keep the inner tip just inside the body. For dramatic shells
like Theodossia (brach6) the photo shows the umbo wrapping all the
way back around — my coil shows only the comma stage.

### 2.3 Commissure curve handles geniculate but not subtle deflection

`commissureY(u, s)` curves only for explicit lateral kinks
(geniculate, resupinate). For atrypids and pentameroids, the anterior
commissure may deflect upward slightly because of the fold/sulcus
geometry — but my commissureY is flat at cy for all biconvex shells.

The result: brach6 (Theodossia) and brach1 (Pseudoatrypa) front-view
inner V-commissure peaks read well, but the SIDE-view anterior tips
both valves snap to (frontX, cy) without any fold-driven deflection.
Real Theodossia has its anterior commissure visibly lifted at the
center (because the fold raises the meeting plane there); my side
view shows a flat horizontal commissure plane.

### 2.4 Front view dome silhouettes are still semi-elliptical

`frontBodyShape(u, s)` for dome outlines is `1 - u²` (parabolic). I
upgraded the SIDE view to Bezier but the FRONT view still uses the
parabolic shape factor. So the user critique on "mathematically rigid"
silhouettes only applied to side view; front view has the same issue.

**Fix path**: extract a `frontBodyBezier(u, s)` analogous to the side
view's Bezier sampling.

### 2.5 apexShift conflates beak prominence with body apex centering

This is the issue I noted in the previous commit. `apexShift` is
sourced from `beak_pick` (BEAK_SETTINGS), so a "prominent beak"
forces `apexShift = 0.40` which then drives:
- Side view apex position (correct for shells where the body
  genuinely tapers back, like cones)
- Front view foreshortening modulator (INCORRECT for globose biconvex
  shells where the body is centered regardless of beak prominence)

Theodossia (brach6) is "prominent beak" + globose body. With
apexShift=0.40, the side-view body apex sits 20% back from center,
which is roughly right. But it also tries to drive front-view
foreshortening, where it shouldn't.

**I worked around this** in `frontValveScale` by making dome outlines
use a fixed 1.0 scale (no apexShift modulation). But this is a
hack — the underlying parameter is overloaded.

**Cleaner fix**: split `apexShift` into two parameters:
1. `bodyApexU` — where the body's max convexity sits along AP
2. `beakProminence` — how far back/extended the umbo is

These are biologically independent. Currently they're linked through
BEAK_SETTINGS which mistakenly bundles them.

## 3. Calibration soundness

### 3.1 Tables that are arbitrary (not biology-derived)

All of these are eyeballed from a handful of photo iterations:

- **Valve convexity per outline** (`answersToShape`): 72/25 for
  subcircular default, 80/22 for atrypid (with frills), 56/40 for
  wing-shaped, 24/78 for conical. Reasonable order-of-magnitude but
  no quantitative basis.
- **halfWidth × halfLength per outline + surface features**: 70×70 vs
  80×60 vs 66×72 vs 90×60 vs 40×50. Same — directional but not
  measured.
- **Bezier handle lengths** (in `sideValveClosedPath`): backH 0.10–
  0.22 × halfL, apexBackH 0.25–0.50 × halfL, etc. Hand-tuned to make
  the renders look right, not derived from shell-curvature data.
- **frontFoldSplit** outerDorsal / outerVentral / commissure
  coefficients: 0.45/0.40/1.40 for dome, 0.30/0.50/0.15 for conical,
  0.30/0.25/0.30 for wing-shaped. Visually plausible but not
  validated against measured fold amplitudes.
- **frontValveScale apex modulation**: factor in [0.55, 1.0] for
  conical. Arbitrary range.
- **Beak coil sizing** (`hookExt = halfL * baseFrac * astroBoost`):
  baseFrac per outline, astroBoost = 1.7. Magic numbers.
- **Spine layout**: 3 lamella rings at r = 0.55, 0.74, 0.90, every
  third rib. Reasonable visually but the choice of 3 rings and the
  specific radii are arbitrary.

### 3.2 What "calibration" SHOULD look like

For each taxon we have 3D-photogrammetry GLB files in `data/3d_models/`.
The visualizer test harness was originally built to fit those meshes
to the analytical model. Currently NO taxon's render is fitted against
its actual mesh — every Iowa Devonian brach renders identically within
its outline archetype, regardless of how its real DV ratio or apex
position differs from the archetype default.

A real calibration pass would:
1. Take each taxon's GLB, extract its dorsal apex y, ventral apex y,
   apex x along AP, valve widths at multiple AP positions
2. Fit the Bezier handle lengths so the sampled silhouette matches
   the mesh silhouette within some tolerance
3. Output per-taxon handle overrides as manifest data, OR fit
   per-archetype tables that average over the taxa in that archetype

Right now the "calibration" is "Claude looked at a photo and adjusted
a number." That's worth being honest about.

### 3.3 No automated quality measure

I generate diagnostic_grid_all.png and look at it. There's no:
- IoU between PARAM silhouette and photo silhouette
- Quantitative aspect-ratio comparison
- Verification that all 7 brachs render without regressions when I
  change a parameter

I changed several core formulas in this round (Bezier silhouette,
commissureY, frontValveScale apex modulation, undo of dome apex
modulation) and verified visually that the grid still looks right.
A more disciplined process would regression-test against expected
silhouette areas or specific control points.

## 4. Architectural debt that's accumulating

### 4.1 Per-outline table proliferation

To add a new outline archetype now I'd need to fill in:
1. `halfWidth × halfLength` and `hingeFrac` in `answersToShape`
2. Valve convexity defaults (`dorsalConv, ventralConv`)
3. `unitOutline` branch (top view shape function)
4. `frontBodyShape` branch (front view shape factor)
5. `frontFoldSplit` entry (fold contribution split)
6. `frontValveScale` entry (front view foreshortening)
7. `resolveFoldParams` entry (fold rise/shoulder profile)
8. Handle lengths in `sideValveClosedPath` (side view Bezier handles)
9. `hookFrac` in beak coil sizing
10. Possibly `commissureY` if the new archetype has non-flat commissure

10 tables to sync per new archetype. **Adding a productid** (wide,
strophic, deep concavo-convex, with spines and frills) would touch
nearly all of them. The model has gotten dense.

### 4.2 Manifest traits keep growing

`surface_ribs`, `surface_frills`, `surface_spines`, `surface_lines`,
`profile`, `hinge`, `fold_sulcus`, `outline`, `interarea_form`,
`size`, `umbones`, `beak_prom`, `lateral_profile`. That's 13 trait
keys for the filter to consider. The student-facing wizard exposes
fewer (one slider per major axis) but the manifest layer has all of
them.

This is fine for now but a sign that the trait set is approaching its
expressive limit. If a future shell can't be distinguished by the
existing 13 traits, the answer will be more traits — and at some
point the filter becomes harder to use than the actual key.

### 4.3 No taxon-specific manifest overrides

Currently a taxon either fits an outline archetype or doesn't. There's
no way to say "Pseudoatrypa devoniana is subcircular astrophic with
frills BUT its dorsal valve is unusually globose for an atrypid —
use dorsalConv=88 instead of the archetype default 80." Every
Pseudoatrypa devoniana renders identically.

Adding per-taxon `shape:` overrides in the manifest (like the existing
`shape:` field for analytical fits, but for the parametric renderer)
would let the visualizer match individual specimens more closely
without polluting the archetype tables.

## 5. What I'd prioritize next (and why)

In rough order of fit-quality impact per implementation cost:

1. **Split `apexShift` into `bodyApexU` and `beakProminence`**. The
   conflation is a known correctness bug, and the cleanup unblocks
   per-taxon tuning. ~30 lines of work.

2. **Apply Bezier to the front view body shape**. The dome-outline
   front silhouettes are still parabolic. Same refactor pattern as
   the side view. ~40 lines of work.

3. **Front-view anterior commissure deflection driven by foldStr**.
   For dome outlines with a strong fold, the anterior commissure
   line should curve up at the center — visible in the side view's
   anterior commissure step. Currently it's a flat horizontal step.
   ~20 lines.

4. **Per-taxon parametric shape overrides in manifest**. A small
   addition `shape_param: { dorsalConv: 85, ... }` field that
   overrides specific values for that taxon. ~25 lines.

5. **Proper coiled beak (multi-segment Bezier)**. The single comma
   Bezier reaches its expressive limit for dramatic hooked umbos like
   Theodossia. Two or three Bezier segments could produce a
   wraparound coil. ~60 lines.

6. **Calibrate against the GLB meshes**. Extract sampled silhouettes
   from each taxon's mesh and fit handle lengths. Would replace ~6
   eyeballed tables with measured values. ~150 lines plus tooling.

The first three are quick wins. (4) and (5) are bigger. (6) is the
real fix but a substantial project.

## 6. Honest summary

The visualizer is **functionally good enough for the student ID
workflow** — a student can see a candidate species' parametric render
and recognize it as the same family as their hand specimen. The
diagnostic grid shows reasonable matches for all seven Rockford
brachs.

It is **NOT** photo-real, NOT taxon-calibrated, and NOT systematically
validated. The per-outline tables are eyeballed defaults that the
seven test specimens happen to mostly fit. The next time a taxon
appears that doesn't fit an existing archetype, expect to either tune
a new table (more debt) or admit that the model has reached its
expressive ceiling for that morphology.

The biggest correctness bug is `apexShift` overload (§2.5). The
biggest fit-quality limitation is calibration-by-eyeball (§3.1). The
biggest architectural risk is table proliferation (§4.1). All three
are fixable but none are fixed yet.
