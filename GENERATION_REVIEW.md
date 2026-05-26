# Brachiopod-builder generation pipeline — review against course goals

## 0. The four goals and the fulcrum

The pipeline exists to do four things, in order:

1. **Present students with simple front-facing options.** A small number of
   visual, binary-or-multi-pick sliders that a non-specialist can answer
   from a hand specimen without prior vocabulary.
2. **Produce visual outlines consistent with real brachiopod
   morphology.** This is the fulcrum: the renders are *worth nothing*
   unless a student looking at brach4 in their hand AND brach4 PARAM
   on screen says "yes, that's the same animal." If the visual diverges
   from real shells, every other goal collapses — students stop
   trusting the tool and stop using the matches as ID evidence.
3. **Map slider choices to internal trait codings that match the
   taxon tags in the manifest.** This is the load-bearing connection
   between the visual loop and the filtering loop. Two separate code
   paths consume the same `answers` object — if the visual says one
   thing and the trait coding says another, the tool actively misleads.
4. **Let students rapidly narrow down candidates for ID.** The
   filtering view (`/site/<sid>/filter/results`) shrinks the
   ~30-taxon Rockford brachiopod list to ~1–5 candidates as more
   sliders are set.

(2) is the fulcrum because (1), (3), and (4) all assume the rendering
machinery is honest. A student who picks "subcircular + biconvex +
astrophic + strong fold + frills" and sees a sphere with crayon lines
does not learn that this is Pseudoatrypa — they learn that the tool
makes things up.

## 1. Two pipelines, one input

The student's slider state lives in a URL-encoded `answers` object —
keys like `outline_pick`, `profile_pick`, `hinge_pick`, `surface_pick`,
`fold_pick`, `beak_pick`, `lateral_pick`, `size_pick`, `umbones`,
`spines`. The same `answers` object feeds **two independent
pipelines**:

```
                                  ┌──────────────────────┐
                                  │  answersToShape(a)   │  ──→  svgTopView / svgFrontView / svgSideView
                                  │  (visual pipeline)   │
                                  └──────────────────────┘
                                            ▲
        ┌─────────────┐                     │
        │   answers   │ ────────────────────┤
        │  (URL kvs)  │                     │
        └─────────────┘                     ▼
                                  ┌──────────────────────┐
                                  │  effectiveTraits(a)  │  ──→  taxonMatches / taxonMismatches
                                  │  (filter pipeline)   │       (filter results page)
                                  └──────────────────────┘
```

Both pipelines start from the same `answers`. Neither calls the other.
They share *nothing* except the slider keys.

This is the structural risk surface. The two pipelines must agree on
what each slider value *means* — semantically, anatomically — or the
tool will show one thing and filter for another.

## 2. Slider → trait coding map (goal 3)

Per `QUESTIONS` in `manifest.js`, every slider option carries either a
`setsTraitTo` (single trait → single value) or a `setsTraits`
(slider → object of traits). `effectiveTraits(answers)` walks this
mapping; everything else (rendering, filtering scores) reads from the
flat `answers` object plus this derived trait set.

| Slider (URL key) | Option value      | Sets trait              | Visual route in `answersToShape`                                       |
| ---------------- | ----------------- | ----------------------- | ---------------------------------------------------------------------- |
| `surface_pick`   | smooth            | (none)                  | `features.ribs = false`                                                |
| `surface_pick`   | growth-lines-only | (none)                  | `features.lines = true`; `features.ribs = false`                       |
| `surface_pick`   | ribs              | `surface_ribs: yes`     | `features.ribs = true`                                                 |
| `surface_pick`   | ribs-and-frills   | `surface_ribs/frills`   | `features.ribs = true; features.frills = true`                         |
| `profile_pick`   | biconvex          | `profile: biconvex`     | biconvex path through `sideValveClosedPath`                            |
| `profile_pick`   | plano-convex      | `profile: plano-convex` | sets `dorsalConv=70, ventralConv=6` (or vice versa)                    |
| `profile_pick`   | concavo-convex    | `profile: concavo-convex` | routes through `concavoConvexValve` (parallel-crescent generator)    |
| `hinge_pick`     | wide-strophic     | `hinge: strophic`       | `hingeFrac=1.00` (alate/conical) or `0.95` (dome); `interareaH>0`      |
| `hinge_pick`     | narrow-strophic   | `hinge: strophic`       | `hingeFrac=0.55`; smaller `interareaH`                                 |
| `hinge_pick`     | astrophic         | `hinge: astrophic`      | `hingeFrac=0`; `beakProm>0` (umbo bulge)                               |
| `outline_pick`   | wing-shaped       | `outline: wing-shaped`  | `halfWidth=90, halfLength=60`; rectangle-on-top top-view outline       |
| `outline_pick`   | conical           | `outline: conical`      | `halfWidth=60, halfLength=70`; routes side view through `conicalValve` |
| `outline_pick`   | subcircular       | `outline: subcircular`  | `halfWidth/halfLength ≈ 70` (varies w/ frills/spines for atrypids)     |
| `outline_pick`   | elongate-oval     | `outline: elongate-oval`| `halfWidth=46, halfLength=86`; ellipse top-view                        |
| `fold_pick`      | none              | `fold_sulcus: absent`   | `foldStr=0`, `foldRise=0`                                              |
| `fold_pick`      | weak              | `fold_sulcus: weak`     | `foldStr=0.4`, `foldRise=14–18`                                        |
| `fold_pick`      | strong            | `fold_sulcus: strong`   | `foldStr=1.0`, `foldRise=30–55` (per archetype)                        |
| `beak_pick`      | subdued           | `beak_prom: subdued`    | `apexShift=0.05`, `umboPx=3`, `interareaScale=0.6`                     |
| `beak_pick`      | moderate          | `beak_prom: moderate`   | `apexShift=0.20`, `umboPx=6`, `interareaScale=1.0`                     |
| `beak_pick`      | prominent         | `beak_prom: prominent`  | `apexShift=0.40`, `umboPx=12`, `interareaScale=1.6`                    |
| `beak_pick`      | pyramidal         | `beak_prom: pyramidal`  | `apexShift=0.55`, `umboPx=18`, `interareaScale=2.4`                    |
| `lateral_pick`   | smooth            | `lateral_profile: smooth` | no kink in side view                                                |
| `lateral_pick`   | geniculate        | `lateral_profile: geniculate` | sharp anterior bend in both valves                              |
| `lateral_pick`   | resupinate        | `lateral_profile: resupinate` | dorsal/ventral curvature inverts at kinkAt                      |
| `size_pick`      | small/medium/large| `size: <value>`         | (no visual effect — filter only)                                       |
| `umbones`        | yes/no            | `umbones: ribbed/smooth`| (no visual effect — filter only; rhynchonellid splitter)               |
| `spines`         | yes/no            | `spines: present/absent`| (rendering reads `features.spines`, set by `surface_pick=spines-or-bumps`) |

**Two visual-only fields are NOT trait codes**: `rib_density` (dense
/ medium / sparse) is a visual-only refinement and doesn't filter
anything. `surface_lines` (growth lines only) is rendered but doesn't
constrain matches (smooth and growth-lines-only filter identically).

**Consistency check — this is what goal (3) demands**: every slider
that produces a *visual* change should also produce a *filter*
change wherever the visual difference reflects a real anatomical
distinction. The table above shows where that's currently true
and where it isn't:

- `size_pick`, `umbones`, `spines` set traits but produce no visual
  effect. That's *fine* — students still get filter narrowing from
  questions whose visual rendering would be ambiguous anyway.
- `rib_density` produces a visual difference (dense vs sparse ribs)
  but doesn't filter. That's also fine — rib density is not currently
  tagged on any taxon, and the visual cue is purely pedagogical
  ("this is what 'fine ribbing' looks like").
- The fold-strength, beak-prominence, and lateral-profile sliders
  all produce dramatic visual changes AND set traits that exist on
  taxa. These are the high-impact sliders for goal (4).

## 3. Step-by-step generation, evaluated against goal (2)

The visual pipeline runs in this order. For each step I list (a) the
anatomical purpose, (b) the current implementation, (c) faithfulness
to real morphology, (d) trait-coding link.

### 3.1 `answersToShape(answers)` — the shape struct

**Purpose.** Translate the categorical slider answers into ~25 numeric
parameters that all three view renderers consume.

**Implementation.** Switch on `outline_pick` for base half-width and
half-length; switch on `profile_pick` and surface features for per-
valve convexity; resolve fold strength via `resolveFoldParams(f, o)`
(archetype-aware — wing-shaped "strong" is a tall narrow peak;
subcircular "strong" is a broad smooth hump); resolve beak prominence
via `BEAK_SETTINGS`; resolve lateral kink via `LATERAL_PROFILE_SETTINGS`.

**Fidelity.** The crucial decisions live here:

- `dorsalConv` / `ventralConv` express the dorsibiconvex bias that
  Iowa Devonian brachs actually have (dorsal larger than ventral on
  most taxa). Current values: dome default 78/34, atrypid 86/32,
  spinatryid 54/22, wing-shape 56/40, plano-convex 70/6, concavo-
  convex 6/22.
- `apexShift` controls *where* the dorsal apex sits along the AP
  axis. Dome shells force `apexShift ≥ 0.50` (apex tucked tight to
  posterior) — matches the real geometry of Pseudoatrypa/Theodossia/
  Spinatrypa where the dome peaks near the umbo, not at mid-shell.
- Per-archetype halfWidth/halfLength encode the gross outline ratio
  (wing-shape 1.5:1 wide-to-long; elongate-oval 0.53:1; conical
  ~0.86:1; subcircular 1:1, biased to 1.10:1 with frills).

**Trait link.** Every field on the shape struct can be traced back to
exactly one slider answer or one surface feature. There's no implicit
state — `answersToShape` is pure.

### 3.2 TOP view

The pipeline:

```
unitOutline(theta, s)  →  applyHingeStraightening  →  applySulcusIndent  →  applyRibScallop  →  scale to screen  →  beak bulge (astrophic)  →  hinge bar / sulcus mark / umbo dot overlays
```

**3.2.1 `unitOutline(theta, s)`** — normalised closed curve per outline:

- *wing-shaped*: vertical sides on the upper half (the hinge is the
  cardinal axis); kite-taper on the lower half (exponent 0.7) to the
  anterior point. Faithful to alate spiriferids.
- *conical*: same as wing on the upper half but with `halfWidth=60`
  (narrower); exponent 0.65 on the lower half (rounded anterior).
  Faithful to Conispirifer/Cyrtina top-view.
- *elongate-oval*: ellipse. Trivially faithful.
- *pentagonal*: super-ellipse with n=1.4 and a +0.30 y-shift, widest
  at ~y=+0.3. Used for rhynchonellids.
- *subcircular*: teardrop — posterior radius `1 − 0.20·ct` for
  astrophic, `1` for strophic (recent fix: the teardrop pinched the
  posterior below the hinge bar in Schizophoria, leaving a visible
  gap; strophic shells now stay at full radius up to the hinge).

**3.2.2 `applyHingeStraightening`** — blends the top 25% of the
perimeter onto a flat line at `ny=-0.95` when `hingeFrac > 0`. The
hinge bar (drawn separately at `cy - halfLength*0.95`) now lines up
exactly with the outline edge.

**3.2.3 `applySulcusIndent`** — when fold is present, pulls the
anterior commissure perimeter radially inward by `foldStr * 0.07`
over a 0.45-rad arc at the anterior midline. Reads as a U-indent in
the top view's anterior margin — matches the real visible cue
("look at the front edge for a notch").

**3.2.4 `applyRibScallop`** — adds rib bumps to the perimeter,
anisotropically scaled so the bump amplitude is constant in
screen-px regardless of which axis the perimeter sits on.
Ribness peaks at the anterior (where students count ribs in the
field) and decays toward the beak.

**Fidelity.** Top views are the strongest of the three. Each
archetype's outline has a distinct silhouette a student can match by
hand-rotating the specimen.

**Trait link.** The top view's archetype switch is driven entirely by
`outline_pick`, which sets `outline: <value>` as a trait. Every taxon
in the manifest carries an `outline:` field, so the slider visual
maps 1:1 to the filter constraint. `hinge_pick` adds the hinge bar
(strophic) or umbo bulge (astrophic), and sets `hinge: strophic`
vs `astrophic` — also 1:1.

### 3.3 FRONT (anterior) view

The pipeline:

```
frontDorsalCurve(s)   ┐
                       ├──→  concat → outline path  ┐
frontVentralCurve(s)  ┘                              ├──→  SVG (outline + clipped decoration + commissure)
                              ribs / frills / spines ┘
```

**3.3.1 `frontDorsalY(u, s)`** — for triangular outlines
(wing-shaped, conical), returns `peak * frontBodyShape(u, s)` where
`peak = apexSrc * scale.dorsal + foldRiseAt(0, s) * outerDorsal`.
`apexSrc` is `ventralConv` for conical (the cone IS the ventral
valve, seen end-on from the anterior) and `dorsalConv` for wing-
shaped. For dome outlines, the shape is `dorsalConv * scale * (1−u²)
+ foldRiseAt(u) * outerDorsal`, plus an orthid-style V-notch when
strophic + no frills/spines + foldStr > 0 (Schizophoria signature).

**3.3.2 `frontVentralY(u, s)`** — for conical, returns only
`-foldRiseAt(u) * 0.25` (small central sulcus dip; no body bulge
below cy, because the ventral cone face is hidden behind the cone
walls in true anterior view). For dome and wing-shaped, returns
`ventralConv * scale.ventral * shape(u) - foldRiseAt(u) * outerVentral`.

**3.3.3 `frontFoldSplit(s)`** — distributes the fold's contribution
between three places it can manifest:

- `outerDorsal` — how much the dorsal silhouette rises at center
- `outerVentral` — how much the ventral silhouette pulls UP at center
  (the sulcus indent visible in the outer outline)
- `commissure` — how much the internal V/peak inside the outline
  flexes (drawn as the dashed line)

Per-archetype tuning: dome shells route most of the fold into the
*outer* silhouette (U-arch reading); wing/conical route most into
the outer silhouette too but with the central V more localised.

**3.3.4 `frontValveScale(s)`** — per-view foreshortening. Dome
outlines apply 0.65/0.78 (dorsal/ventral) shrink so the front view
fits the 200×200 viewBox even with strong fold lift; wing-shape
uses 0.60/0.55; conical uses 0.95/0.30 (the cone is essentially the
dorsal-side silhouette in front view, with the ventral mostly hidden).

**Fidelity.** The atrypid U-arch and Schizophoria's dorsal V-notch
are present and visible. Cyrtospirifer's lateral lobes no longer
read as a sharp central V (wider fold `shoulderU` softens the
transition). The conical anterior is a clean triangle — closer to
the photo's diamond/rhombic shape than to the earlier W with deep
lateral lobes.

**Trait link.** `fold_pick` controls fold strength (which is what
the front view is *for* — the anterior commissure is the diagnostic
view for fold/sulcus). `profile_pick=concavo-convex` reroutes
through `concavoConvexValve` which generates a flat parallel-
crescent in front view as well. `outline_pick` switches the
front-view archetype.

### 3.4 SIDE (lateral) view

The pipeline:

```
sideValveClosedPath(s, isDorsal=true)   ┐
                                         ├──→  fill paths (cream) + stroke paths (black)
sideValveClosedPath(s, isDorsal=false)  ┘
                                              + interarea overlay (strophic non-conical)
                                              + rib stripes (clipped to body fills)
                                              + anterior commissure zigzag (if ribs, non-conical)
                                              + spine dots
```

**3.4.1 Routing.** Three side-view paths:

- *concavo-convex* → `concavoConvexValve` — both valves bow the same
  direction with a thin uniform shell-thickness gap (Douvillina
  parallel-crescent).
- *conical* → `conicalValve` — ventral cone (apex above cy at the
  top of a forward-leaning interarea); dorsal is a flat dome at
  the commissure plane, visible *inside* the cone outline.
- biconvex/other → main `sideValveClosedPath` body — three-segment
  Bezier chain A0 (body start) → apex → shoulder → frontTip.

**3.4.2 Anchors (biconvex path).**

- **A0**: posterior anchor. Strophic = top of interarea wall
  (`cy + sign * interareaH/2`); astrophic with visible umbo =
  the umbo tip (`beakX − umboW * 0.45`, `cy + sign * umboH * 1.05`);
  otherwise just inside the hinge line at `(beakX, cy + sign*2)`.
- **apex**: highest point of the valve.
  `apexX = beakX + (1 + apexU) * halfL`, `apexY = cy + sign * conv * 0.95`.
- **shoulder**: new anchor between apex and front tip at ~65% of
  the AP distance from apex toward front. Eliminates the long
  apex→frontTip parabola that produced the "ballooning" silhouette
  before the rewrite.
- **frontTip**: shared between dorsal and ventral at `(frontX, commissureY(1, s))`.
  Single point, no sign-dependent vertical split — both valves
  meet at a rounded anterior, not a pinched V.

**3.4.3 Bezier handles.** All segment handles use *naturally-signed*
deltas (e.g., `apexY + (shoulderY - apexY) * 0.75` for s2_c2y, NOT
`apexY + sign * (shoulderY - apexY) * 0.75`). Earlier code had the
extra `sign *` multiplier which flipped the dorsal handles to the
wrong side of apex, producing a **phantom second peak forward of
apex** — a camel-hump silhouette on every biconvex shell. Fixed.

**3.4.4 Umbo coil (astrophic only).** When `umboW > 4`, the stroke
closes from A0 (umbo tip) along a quadratic curve through a control
point forward of beakX back to `(beakX, cy)` — the spiral wraparound
silhouette. Subdued beaks now still produce a visible (smaller)
umbo coil instead of being collapsed to a stub.

**3.4.5 Uniplicate anterior arch.** When `foldStr > 0`, segment 3
adds `y -= foldStr * 5 * sin(uu * π)` where `uu = (u − 0.30) / 0.70`.
Both valves arch upward through the front segment (decreasing y for
both, since both should lift "away from cy" in the same screen
direction at the tongue), with the perturbation going to zero at
the tip so the shared `frontTipY` is preserved.

**3.4.6 Conical-specific.** The ventral cone silhouette runs from
`(frontX, cy)` along a cubic to the apex `(beakX + 18 * tiltScale,
cy - coneH)` and down the slanted back face to `(beakX, cy)`. Five
hatching ticks parallel to the interarea slope mark it as a
striated wall. The dorsal valve is a separate path: a low flat
dome from `(beakX, cy)` curving up to `(~cx, cy - dorsalConv * 0.55)`
and back down to `(frontX, cy)` — visible inside the cone outline.

**3.4.7 Concavo-convex specific.** `concavoConvexValve` builds both
valves as parallel arcs bowed downward, with `shellThickness=6`
between them. The geniculate trail past `kinkAt` is applied to BOTH
valves (was previously only on the ventral, leaving the dorsal
floating above an angular ventral bend).

**Fidelity.** This is the view that's improved most in the recent
sessions. The biconvex camel-hump bug, the pinched anterior, the
invisible subdued umbo, the missing conical dorsal valve, and the
backward-tilted interarea on conicals were all bugs that produced
visually wrong silhouettes. With those gone, the side view is
finally categorically right for all seven Rockford archetypes —
*shape-wise*. Fine-tuning (proportions, fill contrast, the relative
prominence of umbo coils vs body) is still needed.

**Trait link.** `profile_pick` and `outline_pick` jointly select the
routing (concavo-convex vs conical vs biconvex). `hinge_pick` switches
between umbo and interarea geometry at the posterior. `beak_pick`
scales `apexShift` and `interareaH` and the umbo width. `fold_pick`
controls the anterior arch. `lateral_pick` adds the geniculate or
resupinate kink. All five sliders touch the side view; all five
set traits the taxa carry. The side view is the highest-information
view in the system because of this coverage.

## 4. Honest assessment per goal

### Goal 1 — simple front-facing options
Achieved. Eight visual-pick sliders (`surface`, `profile`, `hinge`,
`outline`, `fold`, `beak`, `lateral`, `size`) plus two text follow-ups
(`umbones`, `spines`). All sliders have inline preview SVGs so a
student can tap by visual match without learning the vocabulary first.

### Goal 2 — visual outlines consistent with real morphology
**This is where the work is still ongoing.** State as of this commit:

- **Top view**: solid. Each archetype has a distinct, recognisable
  outline; hinge bar aligns; sulcus indent reads at the front.
- **Front view**: solid for dome/biconvex (U-arch + orthid V-notch
  both reading correctly); solid for wing-shape (lateral lobes no
  longer over-pinched); solid for conical (clean triangle, no W);
  solid for concavo-convex (flat ellipse). Still tuning: the
  Schizophoria-style V-notch depth may be slightly too aggressive.
- **Side view**: was the worst, now the most-fixed. Biconvex no
  longer camel-humps; conical now shows both valves visibly; subdued
  umbones are visible; uniplicate side arch is gentle. Still: the
  visual *weight* of side views is low because body fill is
  cream-on-cream — only outlines read clearly. Dome shells get
  weight from internal rib stripes; conical and concavo-convex don't.
  Worth considering a subtle alpha-tinted body fill so silhouettes
  read as filled shapes rather than wireframes.

The brach-by-brach state against the photo set in
`data/fit_harness/diagnostic_grid_all.png`:

| Brach | Photo type                  | Outline | Front | Side |
| ----- | --------------------------- | ------- | ----- | ---- |
| 1     | Pseudoatrypa (atrypid)      | ✓       | ✓     | ✓ globose dome, visible umbo, frills |
| 2     | Schizophoria (orthid)       | ✓       | ✓     | ✓ biconvex, narrow strophic interarea |
| 3     | Conispirifer (cone)         | ✓       | ✓     | ✓ leaning cone with visible dorsal cap |
| 4     | Cyrtospirifer (alate)       | ✓       | ✓     | ✓ wing-shape biconvex w/ hatched interarea |
| 5     | Spinatrypa (spinose atrypid)| ✓       | ✓     | ✓ flatter atrypid w/ spine dots |
| 6     | Theodossia (globose)        | ✓       | ✓     | ✓ tall dome |
| 7     | Douvillina (geniculate)     | ✓       | ✓     | ✓ thin parallel-crescent w/ anterior bend |

All seven are now "specimen-credible" in the sense from
`OUTLINE_REVIEW.md` §5 — a student picking up the specimen would
recognise the PARAM render as the same animal. They are NOT yet
photo-realistic, and the morphospace renderer (`viewMorphospace`,
which uses fitted parameters from the 3D meshes) is still closer to
photo-real than the categorical parametric model.

### Goal 3 — trait coding link
The full slider-to-trait table is in §2. The architecture is sound
because every `setsTraitTo` lives next to the slider definition, so
the binding is *local* (changing a slider value updates both the URL
key AND the trait the option sets, in the same struct). The two
pipelines stay aligned by reading from the same `answers` object.

**Risk**: if a developer renames a slider value or splits an option,
the rendering code (`answersToShape`) reads the raw value but the
filter code reads the trait. A rename that updates `answersToShape`'s
switch but forgets to update `setsTraitTo` would silently break
filtering with no visual cue. Worth a small linter / runtime assert
that every `outline_pick` value the renderer handles is also a
`setsTraitTo` value somewhere in `QUESTIONS`.

### Goal 4 — student narrowing
Achieved structurally: `taxonMatches`/`taxonMismatches` against the
~30 Rockford brachiopod taxa drives the live candidate count on
`/build` and the results page. The build view shows the count
shrinking as more sliders are set — direct feedback that the
filtering is working.

**Honest qualification**: the candidate count narrows reliably when
the *answers are correct*. If a student looks at brach3 (a conical
spiriferid) and the PARAM-side they construct doesn't look like a
cone, they may pick a different `outline_pick` to match the wrong
PARAM and end up filtered to the wrong subgroup. This is why goal
(2) is the fulcrum — the filter is only useful when the visuals
convince students they've made the right slider choices.

## 5. What still needs work, ranked by impact on goal (2)

1. **Body fill contrast.** Cream-on-cream means silhouettes read as
   wireframes. A 5–10% alpha tint on body fills would give the
   shells visual weight and make the two-valve nature obvious.
2. **Umbo prominence in side view.** Even with the recent fixes,
   subdued and moderate umbones read smaller than the photos.
   `umboW` for moderate dorsal is currently ~halfL × 0.62 × 1.05 ×
   0.85 = 0.55 × halfL, but visually the coil looks more like
   0.30 × halfL because the inner Q-curve sweeps it tight.
3. **Conical dorsal valve sizing.** The flat-dome dorsal currently
   peaks at `cy − dorsalConv * 0.55`. For Conispirifer with
   `dorsalConv=24`, that's a 13px bulge — barely visible inside the
   cone. Either bump the multiplier or use a per-archetype constant.
4. **Rib visibility in conical and concavo-convex side views.**
   Currently suppressed entirely (the radial fan from apex looked
   wrong for cones). Could add anterior-commissure rib notches as
   tiny crenulations on the front edge of the cone or bowed crescent
   without breaking the silhouette.
5. **Per-taxon overrides.** Several manifest taxa carry a `shape:`
   block fitted from 3D meshes (Atrypa devoniana, Spinocyrtia
   iowensis, Pentamerus oblongus, Hebertella occidentalis). The
   parametric model doesn't consume these. The morphospace view does,
   and produces noticeably more accurate silhouettes. The
   categorical build view could optionally route specific taxa
   through the analytical renderer when an exact taxon is hovered,
   giving students the "best fit" view for confirmation.

## 6. Summary

The four goals form a chain: simple sliders → faithful visuals →
trait coding → narrowed candidates. Goal 2 is load-bearing because
the other three only deliver value when students believe the visuals
match their specimens. The current pipeline produces seven
specimen-credible silhouettes across the Rockford diagnostic set;
the remaining work is polish (fill contrast, umbo prominence,
proportion fine-tuning) rather than architectural rework.

The trait-coding link is structurally sound — the slider answers
flow through two independent pipelines (visual rendering and filter
matching) that consume the same `answers` object, and every slider
option that produces a meaningful visual change also sets a trait
that some taxon in the manifest carries. The main residual risk
is silent drift if slider values are renamed in only one pipeline,
worth catching with a runtime assertion at startup.
