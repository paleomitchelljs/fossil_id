# Pivot: prioritise the student-ID workflow

After three rounds of refinement against GLB meshes and the morphospace
fit harness, the core diagnosis is: **the parametric (categorical) renderer
already does the job for student ID. The analytical (continuous-parameter)
renderer was a research detour that produced bare silhouettes lacking the
diagnostic decoration (ribs, sulcus, commissure, hinge) that students
actually use to match shells.**

The pivot is to refocus everything on the student-facing workflow and
deprioritise the analytical fit pipeline.

## Evidence that the parametric workflow already works

`data/fit_harness/student_workflow.png` shows three unknown Rockford
specimens (the user's brach1.png, brach2.png, brach3.png) next to the
parametric renderings that match the slider settings a student would
choose by eye.

| Specimen | Slider settings a student would choose | Likely ID |
| --- | --- | --- |
| brach1 | subcircular + narrow-strophic + dense ribs + weak fold | *Schizophoria iowensis* or *Platyrachella macbridei* |
| brach2 | subcircular + astrophic + smooth (growth lines only) + strong fold | *Gypidula cornuta* (pentamerid) |
| brach3 | wing-shaped + wide-strophic + dense ribs + strong fold | *Cyrtospirifer whitneyi* |

The parametric outputs are visually similar enough that a student looking
at the specimen and a candidate would say "yes, that's roughly the right
shape." The trait filter then narrows the manifest to a short candidate
list. That's the whole intended workflow.

## What works already

- Outline shapes (subcircular / wing-shaped / elongate-oval / pentagonal)
- Strophic hinge bar at full width for alate shells (recent fix)
- Sulcus midline marker in TOP view
- Anterior commissure zigzag tied to rib density
- Dorsibiconvex defaults, plano-convex, concavo-convex
- Astrophic curved beak vs strophic interarea wall
- Beak prominence (subdued → pyramidal)
- Surface features (ribs, frills, spines, growth lines) — independently togglable
- Fold strength (none / weak / strong) with half-rectangle commissure
- Lateral profile (smooth / geniculate / resupinate)
- Side view interarea hatched + posterior arrowhead (now distinct from anterior commissure)

## What to deprioritise (or remove)

- **Analytical morphospace renderer** (svgAnalyticalTop/Front/Side). These
  produce bare silhouettes with no decoration. Confusing for students.
  Two options:
    1. Remove from the manifest morphospace view entirely; keep the
       fit_round5.json parameter tuples as data only.
    2. Repurpose as a "scientific" view labelled "research mode" and not
       shown to students.
- **Hybrid analytical-shape + parametric-decoration**. The right approach
  in principle, but high implementation cost (the decoration functions
  are coordinate-bound to the parametric outline). Defer until the
  parametric trait set genuinely runs out of expressive power.
- **Per-taxon analytical fits to mucronate/unusual shells** until we have
  a parametric outline option that handles them (mucronate wingtips are
  a known gap).

## What to push on next

In rough priority order for the student workflow:

1. **Verify the trait filter for the three brach specimens.** Walk the
   in-app key wizard for each, confirm the candidate list narrows to
   ≤5 species, refine `traits:` tagging on Schizophoria, Platyrachella,
   Gypidula, Cyrtospirifer if any of them are inadvertently filtered out.

2. **Add a "match my specimen" view** (or beef up the build view) where
   the student sees their specimen alongside the live parametric output
   and a continuously-updated candidate list. The pieces all exist
   independently in the build view + filter results pages — just need to
   stitch them together.

3. **Fix Cyrtospirifer's strong-fold front view alignment** so the side
   view interarea + posterior arrowhead reads even at small thumbnail
   sizes. Currently distinct at full canvas, less so on the build view.

4. **Add `Mucrospirifer-style` mucronate wingtip** as either an outline
   sub-option or a perturbation on wing-shaped. This is the only
   parametric outline that currently can't be expressed.

5. **Skip the analytical fit work entirely** unless it's needed for an
   external research output. The student tool doesn't need it.

## Concrete recommendation

Hide the morphospace view from the landing/build navigation. Keep it
accessible at the `/morphospace` URL for the curious, but stop spending
time refining the analytical render. Channel that effort into making
the build view + key wizard + candidate filter a smooth end-to-end
experience.

The three new specimens (brach1/2/3) become the canonical "did your
student tool work?" test cases — if a Bio 112 student can use the build
view to narrow their finds down to the right candidate list, we're done.
