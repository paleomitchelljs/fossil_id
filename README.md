# Field Fossil Guide (Rockford + future sites)

A small mobile-friendly field guide. Multi-site: each locality is filtered out of a single shared manifest. The guide is one HTML page driven by a hash-based router — works offline once loaded, prints cleanly, hosts on GitHub Pages with no build step.

## Five entry paths per site

1. **Help me ID it** — a binary decision key, single-trait yes/no questions, optional reference figures.
2. **I already know the group** — jump straight to spiriferids, gastropods, etc.
3. **Browse by group** — drill down: major group → subgroup → taxon detail.
4. **Reference figures** — site-independent gallery of diagrams.
5. **Full printable guide** — every taxon on one page, formatted for **Print → Save as PDF**.

Every key page also has *"Skip ahead — I know the group →"* so students can bail out at any step.

## Multi-site model

- `SITES` (top of `manifest.js`) lists every locality the guide covers. Each entry has `id`, `title`, `subtitle`, `formation`, `location`, `blurb`.
- Every taxon has a `sites: [<id>, …]` field. A taxon shows up only at sites it's tagged for. Missing `sites` = shown everywhere (don't rely on this; tag explicitly).
- The decision key tree and reference figures are shared across all sites.
- With one site, the picker is auto-bypassed; with more, the landing page is a site picker.

### Adding a new site

1. Append to `SITES`:
   ```js
   { id: "coralville", title: "Coralville (Johnson Co., Iowa)",
     subtitle: "Middle Devonian (Givetian)",
     formation: "Cedar Valley Group — Little Cedar / Coralville Fms",
     location: "Coralville Lake spillway",
     blurb: "Middle Devonian fauna …" }
   ```
2. Tag any existing taxon that also occurs there: add `"coralville"` to its `sites` array.
3. Add site-specific taxa (with the new site id in `sites`).
4. Drop site-specific photos in `images/<group>/`.

## URL scheme

| Route                                           | What it shows                                          |
| ----------------------------------------------- | ------------------------------------------------------ |
| `#/`                                            | Site picker (or auto-redirects if only one site)       |
| `#/site/<sid>`                                  | Site landing (the five-button menu)                    |
| `#/site/<sid>/browse`                           | Major-group list for this site                         |
| `#/site/<sid>/group/<gid>`                      | A group's subgroups                                    |
| `#/site/<sid>/sub/<gid>/<subid>`                | Taxa in a subgroup                                     |
| `#/site/<sid>/taxon/<slug>`                     | Single taxon detail                                    |
| `#/site/<sid>/key`                              | Start the key                                          |
| `#/site/<sid>/key/<nodeId>`                     | A specific key question                                |
| `#/site/<sid>/key/result/<sub1>,<sub2>,…`       | Key result page                                        |
| `#/site/<sid>/jump`                             | "I know the group"                                     |
| `#/site/<sid>/all`                              | Full printable guide for this site                     |
| `#/references`                                  | Reference figures (shared across sites)                |

Taxon slug = `<genus>-<species>` lowercased and dashed.

## Files

| File          | Purpose                                                  |
| ------------- | -------------------------------------------------------- |
| `index.html`  | Page shell (single `<div id="app">`). Don't usually edit.|
| `style.css`   | Mobile-first styles + print stylesheet for `#/site/<sid>/all`. |
| `manifest.js` | `SITES`, `SOURCES`, `FAUNA`, `FIGURES`, `KEY`. **The file you edit.** |
| `render.js`   | Router + view builders. Don't usually edit.              |
| `images/`     | Photos, organized by major group; plus `reference/`.     |
| `data/`       | PBDB JSON snapshots + `pbdb_fetch.py` + `pbdb_gaps.md`.  |

## Viewing & publishing

- **Locally:** open `index.html` in any browser.
- **GitHub Pages:** push to a repo and turn on Pages (Settings → Pages → Source: branch, `/` root).
- **PDF for the field:** open the **Full guide** view, then File → Print → Save as PDF.

## Image folder layout

```
images/<genus-dir>/<site>/<species>_<source>_<NN>.<ext>
```

- `<genus-dir>`: lowercase, non-alphanumeric → `_`. Usually just the genus name (`pseudoatrypa`, `cyrtospirifer`, …). Multi-genus group shots get a `dir:` override in the manifest (`horn_corals`, `gastropods_misc`, `bivalves_misc`, `crinoids_misc`, `bryozoans_misc`, `unknown_misc`).
- `<site>`: the site id from `SITES` in `manifest.js` (e.g. `rockford`).
- `<species>`: lowercase species epithet; `sp` if unspecified; or a descriptor for group shots (`assorted`, `cluster`, `large`).
- `<source>`: contributor tag — `nathan`, `dave`, `eqmn`, `jsm`, `daycopper`, `unk`.
- `<NN>`: two-digit sequence per taxon+source.

Examples:
- `images/pseudoatrypa/rockford/devoniana_nathan_01.jpg`
- `images/pseudoatrypa/rockford/lineata_daycopper_01.png`
- `images/horn_corals/rockford/assorted_dave_01.jpg`

Reference figures (site-independent diagrams) live separately under `images/reference/`.

### Sources (current `SOURCES` keys)

- `nathan` — Nathan ([Rockford Iowa brachiopods Imgur album](https://imgur.com/a/rockford-iowa-brachiopods-iHLNl))
- `dave` — Dave, *Views of the Mahantango*
- `eqmn` — *Equatorial Minnesota* blog
- `jsm` — J. Mitchell
- `daycopper` — Day & Copper (1998), *Acta Palaeontologica Polonica* 43(2)
- `unk` — source unknown

## Editing the manifest

### Add a photo to an existing taxon

1. Drop the image file in `images/<genus-dir>/<site>/` (create folders if needed).
2. Append an entry to the taxon's `images` array in `manifest.js`:
   ```js
   { file: "whitneyi_jsm_01.jpg", src: "jsm" }
   ```
   The renderer computes the path as `images/<genus-dir>/<site>/<file>`, where `genus-dir` comes from `taxon.dir` (or auto-derives from `taxon.genus`) and `site` defaults to `taxon.sites[0]`. Add `site: "<sid>"` to an image entry only if it comes from a different site than the taxon's default.

### Add a new taxon

Find the right subgroup in `FAUNA` and add an entry:
```js
{ genus: "GenusName", species: "speciesname", sites: ["rockford"],
  note: "One-line ID hint.",
  images: [
    { file: "speciesname_jsm_01.jpg", src: "jsm" }
  ] },
```

Use `images: []` for placeholder taxa with no photo — students see a "Photo wanted" card.

For multi-genus group shots (e.g., "Horn corals (assorted)"), add a `dir: "<folder>"` override so the renderer knows where to look for the file:
```js
{ genus: "Horn corals", species: "(assorted)", sites: ["rockford"], dir: "horn_corals",
  images: [ { file: "assorted_dave_01.jpg", src: "dave" } ] }
```

### Add or update a reference figure

Reference diagrams live in `images/reference/` and are registered in the `FIGURES` map in `manifest.js`:
```js
const FIGURES = {
  symmetry: { file: "symmetry_in_fossils.jpg", caption: "…" },
  …
};
```
- To use a figure in a key question, set `figure: "symmetry"` on the relevant node.
- To add a figure to the References gallery, just register it in `FIGURES` — it shows up automatically.
- **Attribution:** the shipped diagrams are by Page Quinton & Michael Rygel (CC BY); see `images/reference/source.txt`. Brachiopod morphology text & diagrams in the key were informed by [Geological Digressions — Brachiopod morphology for sedimentologists](https://www.geological-digressions.com/brachiopod-morphology-for-sedimentologists/); cite if you incorporate further material from it.

### Identification system — two stages

**Stage 1 — KEY** (`manifest.js → KEY`): short binary chain that handles phylum / gross shape. Routes corals, crinoids, gastropods, etc. to subgroups. Brachiopod paths terminate with `result: { filter: "brachiopod" }` which hands off to:

**Stage 2 — Trait filter** (`TRAITS` + `QUESTIONS` + per-taxon `traits`): a wizard that asks 3 core questions first (ribs / profile / hinge) and then conditional follow-ups gated by `when(answers)` predicates. Each step shows the candidate count; the candidates page tallies subgroup matches (group-level guesses) and shows a "Best match" card when exactly one species matches. URL accumulates answers as a query string (`#/site/<sid>/filter?ribs=yes&profile=biconvex`) — bookmarkable and browser-back-friendly.

#### Stage 1 — add or rewire a KEY question

A node has `question`, optional `figure` (a `FIGURES` key), optional `hint`, and `options`. Each option has a `label` and either `next: "<nodeId>"` (advance), `result: { subgroups: [...] }` (terminate at a subgroup result), or `result: { filter: "brachiopod" }` (hand off to the trait filter).

#### Stage 2 — add a trait question

1. (Optional) add a new key to `TRAITS` with a display `label`.
2. Append an entry to `QUESTIONS`:
   ```js
   { id: "umbones", trait: "umbones",
     when: a => a.hinge === "astrophic" && a.outline === "triangular",
     text: "Are the umbones ribbed or smooth?",
     options: [
       { value: "ribbed", label: "Ribbed" },
       { value: "smooth", label: "Smooth" }
     ] }
   ```
   Set `core: true` to always ask. Otherwise `when(answers)` is a predicate over prior answers — that's the "tree-like" branching.
3. Tag the relevant taxa under their `traits: {…}` map.

#### Tag a taxon

```js
{ genus: "Cyrtospirifer", species: "whitneyi", sites: ["rockford"],
  note: "…",
  traits: {
    ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent",
    fold_sulcus: "strong", outline: "wing-shaped", size: "medium", umbones: "ribbed"
  },
  images: [ … ] }
```

- A value can be a string (`"strophic"`) or array (`["strophic", "astrophic"]`) when the taxon is observably ambiguous.
- **Omitting a trait** = "no constraint": the taxon stays in candidate lists regardless of the student's answer for that trait. Use this when you genuinely don't know.
- **No shoe-horning:** brand-new taxa stay out of candidate lists until traits are added.
- **Clade-level inference is emergent:** the candidates page tallies matches per subgroup, so the system implicitly rules in or out clades based on which members have consistent traits.

#### Style rules

- One question = one observation. Decompose compound questions.
- Lean on the Treatise + species monographs (Day & Copper, Stigall & Rode, etc.) when picking trait values; the more authoritative the source, the more reusable downstream.
- Use a `figure` reference for any question that benefits from a diagram.
- Include a `hint` for any non-obvious trait.

## PBDB gap analysis

`data/pbdb_fetch.py` pulls Rockford-area occurrences from the Paleobiology Database and writes `data/pbdb_gaps.md` — a diff of PBDB taxa against the current `manifest.js`.

- `python3 data/pbdb_fetch.py`              — refresh PBDB JSON + rewrite gap report
- `python3 data/pbdb_fetch.py --analyze-only` — re-diff against the cached JSON

Re-run after you update the manifest (or when the PBDB is updated upstream) to see what's still missing or newly out of sync.
