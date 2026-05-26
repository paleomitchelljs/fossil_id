// Field-guide renderer — multi-site capable.
// Depends on globals SITES, FAUNA, KEY, FIGURES, SOURCES (from manifest.js).
//
// Routing model:
//   #/                              → site picker (or auto-redirect when 1 site)
//   #/site/<sid>                    → site landing (key / browse / etc.)
//   #/site/<sid>/browse             → groups list
//   #/site/<sid>/group/<gid>        → group's subgroups
//   #/site/<sid>/sub/<gid>/<subid>  → taxa in a subgroup
//   #/site/<sid>/taxon/<slug>       → taxon detail
//   #/site/<sid>/key[/<nodeId>]     → decision key
//   #/site/<sid>/key/result/<csv>   → key result
//   #/site/<sid>/jump               → "I know the group"
//   #/site/<sid>/all                → full printable guide
//   #/references                    → reference figures (shared across sites)

// ---------- DOM helpers ----------
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "on") for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    else node.setAttribute(k, v);
  }
  // Flatten nested arrays so callers can pass `[el, [...map result]]` safely.
  const flat = [].concat(children).flat(Infinity);
  for (const c of flat) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" || typeof c === "number"
      ? document.createTextNode(String(c)) : c);
  }
  return node;
}
function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

// ---------- Site filtering ----------
function taxonInSite(t, sid) {
  // No `sites` field → shown at every site.
  return !t.sites || t.sites.length === 0 || t.sites.includes(sid);
}
function subgroupForSite(sub, sid) {
  const taxa = sub.taxa.filter(t => taxonInSite(t, sid));
  return taxa.length ? Object.assign({}, sub, { taxa }) : null;
}
function groupForSite(group, sid) {
  const subs = group.subgroups.map(s => subgroupForSite(s, sid)).filter(Boolean);
  return subs.length ? Object.assign({}, group, { subgroups: subs }) : null;
}
function faunaForSite(sid) {
  return FAUNA.map(g => groupForSite(g, sid)).filter(Boolean);
}

// ---------- Data lookups ----------
function srcLabel(srcKey) { return (SOURCES[srcKey] || SOURCES.unk).label; }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function dirify(s)  { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
function taxonSlug(t) { return slugify(t.genus + "-" + t.species); }
function taxonDir(t)  { return t.dir || dirify(t.genus); }
function imgPath(taxon, img, fallbackSid) {
  const site = img.site || (taxon.sites && taxon.sites[0]) || fallbackSid;
  return `images/${taxonDir(taxon)}/${site}/${img.file}`;
}
function refPath(file) { return `images/reference/${file}`; }
function getFigure(key) { return (typeof FIGURES !== "undefined") ? FIGURES[key] : null; }
function getSite(sid) { return SITES.find(s => s.id === sid); }

function findGroup(sid, id) {
  const fauna = faunaForSite(sid);
  return fauna.find(g => g.id === id);
}
function findSubgroup(sid, subId) {
  for (const g of faunaForSite(sid)) {
    const sub = g.subgroups.find(s => s.id === subId);
    if (sub) return { group: g, sub };
  }
  return null;
}
function findTaxon(sid, slug) {
  for (const g of faunaForSite(sid)) for (const s of g.subgroups) for (const t of s.taxa) {
    if (taxonSlug(t) === slug) return { group: g, sub: s, taxon: t };
  }
  return null;
}

// ---------- URL helpers ----------
function siteBase(sid) { return `#/site/${sid}`; }

function parseAnswers(rawQueryString) {
  const out = {};
  if (!rawQueryString) return out;
  for (const part of rawQueryString.split("&")) {
    if (!part) continue;
    const [k, v = ""] = part.split("=").map(decodeURIComponent);
    if (k) out[k] = v;
  }
  return out;
}
function encodeAnswers(answers) {
  return Object.entries(answers)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

// ---------- Trait filter logic ----------
function brachFaunaForSite(sid) {
  const f = faunaForSite(sid).find(g => g.id === "brachiopods");
  return f || { subgroups: [] };
}

// Translate URL answers (keyed by question id) into effective trait values
// using each question's `setsTraitTo`. Chain "no" answers without
// `setsTraitTo` are skipped; downstream questions in the chain provide
// the trait value (or it stays unset = no constraint).
function effectiveTraits(answers) {
  const out = {};
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    if (!a || a === "_skip") continue;
    const opt = q.options.find(o => o.value === a);
    if (!opt) continue;
    // Single-trait setter
    if (opt.setsTraitTo !== undefined) out[q.trait] = opt.setsTraitTo;
    // Multi-trait setter (e.g., surface picker sets both ribs + growth_frills)
    if (opt.setsTraits) Object.assign(out, opt.setsTraits);
  }
  // Direct boolean traits set by the build view's toggle sliders (no QUESTIONS entry).
  // "yes" enables the constraint; absence / "" / "no" means no constraint.
  const directBooleans = ["surface_lines", "surface_ribs", "surface_frills", "surface_spines"];
  for (const k of directBooleans) {
    if (answers[k] === "yes") out[k] = "yes";
  }
  return out;
}

// Compute which surface features are active, from either wizard answer or build toggles.
function featuresFromAnswers(a) {
  const sp = a.surface_pick;
  return {
    lines:   a.surface_lines  === "yes" || sp === "growth-lines-only",
    ribs:    a.surface_ribs   === "yes" || sp === "ribs" || sp === "ribs-and-frills",
    frills:  a.surface_frills === "yes" || sp === "ribs-and-frills",
    spines:  a.surface_spines === "yes" || sp === "spines-or-bumps",
    density: a.rib_density || "medium"   // visual-only, doesn't filter
  };
}

function taxonMatches(taxon, answers) {
  if (!taxon.traits) return true;  // untagged taxa stay in the pool
  const traits = effectiveTraits(answers);
  for (const [trait, value] of Object.entries(traits)) {
    const tval = taxon.traits[trait];
    if (tval === undefined) continue;  // taxon not tagged on this trait
    if (Array.isArray(tval) ? !tval.includes(value) : tval !== value) return false;
  }
  return true;
}

function taxonScore(taxon, answers) {
  if (!taxon.traits) return 0;
  const traits = effectiveTraits(answers);
  let matches = 0, considered = 0;
  for (const [trait, value] of Object.entries(traits)) {
    const tval = taxon.traits[trait];
    if (tval === undefined) continue;
    considered++;
    if (Array.isArray(tval) ? tval.includes(value) : tval === value) matches++;
  }
  return considered ? matches / considered : 0;
}

// Returns the list of traits where this taxon disagrees with the user's answers.
// (Untagged-on-trait counts as "no constraint", not a mismatch.)
function taxonMismatches(taxon, answers) {
  if (!taxon.traits) return [];
  const traits = effectiveTraits(answers);
  const out = [];
  for (const [trait, value] of Object.entries(traits)) {
    const tval = taxon.traits[trait];
    if (tval === undefined) continue;
    const match = Array.isArray(tval) ? tval.includes(value) : tval === value;
    if (!match) out.push({ trait, userValue: value, taxonValue: tval });
  }
  return out;
}

function nextQuestion(answers) {
  for (const q of QUESTIONS) {
    if (q.id in answers) continue;  // already answered or explicitly skipped
    if (q.core || (q.when && q.when(answers))) return q;
  }
  return null;
}

// ---------- Shared chrome ----------
function topBar(opts = {}) {
  const { title, back = true, home = true, sid = null } = opts;
  const left = back
    ? el("a", { class: "topbar-btn", href: "javascript:history.back()", "aria-label": "Back" }, "← Back")
    : el("span", { class: "topbar-spacer" });
  const center = el("div", { class: "topbar-title" }, title || "Rockford Fossils");
  const homeHref = sid ? siteBase(sid) : "#/";
  const right = home
    ? el("a", { class: "topbar-btn", href: homeHref, "aria-label": "Home" }, "Home")
    : el("span", { class: "topbar-spacer" });
  return el("header", { class: "topbar" }, [left, center, right]);
}

function siteSubBar(sid) {
  // Visible only when there's more than one site. Lets students switch.
  if (SITES.length <= 1) return null;
  const s = getSite(sid);
  return el("div", { class: "sitebar" }, [
    el("span", { class: "sitebar-label" }, s ? s.title : sid),
    el("a", { class: "sitebar-switch", href: siteBase(sid) }, "Switch site →")
  ]);
}

function pageBlurb(text) { return text ? el("p", { class: "page-blurb" }, text) : null; }

// ---------- Cards ----------
function noImagePlaceholder(taxon) {
  return el("div", { class: "thumb-placeholder no-image" }, [
    el("span", { class: "no-image-label" }, "Photo wanted")
  ]);
}

function taxonThumb(t, sid) {
  const first = t.images && t.images[0];
  const img = first
    ? el("img", { src: imgPath(t, first, sid), alt: `${t.genus} ${t.species}`, loading: "lazy" })
    : noImagePlaceholder(t);
  const label = el("div", { class: "thumb-label" }, [
    el("em", {}, t.genus),
    " ",
    t.species ? el("span", {}, t.species) : null
  ]);
  return el("a", { class: "thumb-card" + (first ? "" : " photo-wanted"),
                   href: `${siteBase(sid)}/taxon/${taxonSlug(t)}` }, [img, label]);
}

function subgroupCard(group, sub, sid) {
  const sampleTaxon = sub.taxa.find(t => t.images && t.images[0]);
  const sample = sampleTaxon ? sampleTaxon.images[0] : null;
  const thumb = sample
    ? el("img", { src: imgPath(sampleTaxon, sample, sid), alt: sub.title, loading: "lazy" })
    : el("div", { class: "thumb-placeholder" });
  const text = el("div", { class: "card-text" }, [
    el("h3", {}, sub.title),
    sub.blurb ? el("p", {}, sub.blurb) : null,
    el("p", { class: "count" }, `${sub.taxa.length} taxa`)
  ]);
  return el("a", { class: "subgroup-card", href: `${siteBase(sid)}/sub/${group.id}/${sub.id}` },
            [thumb, text]);
}

function groupCard(group, sid) {
  let sampleTaxon = null, sample = null;
  outer:
  for (const s of group.subgroups) for (const t of s.taxa) {
    if (t.images && t.images[0]) { sampleTaxon = t; sample = t.images[0]; break outer; }
  }
  const thumb = sample
    ? el("img", { src: imgPath(sampleTaxon, sample, sid), alt: group.title, loading: "lazy" })
    : el("div", { class: "thumb-placeholder" });
  const taxaCount = group.subgroups.reduce((n, s) => n + s.taxa.length, 0);
  return el("a", { class: "group-card", href: `${siteBase(sid)}/group/${group.id}` }, [
    thumb,
    el("div", { class: "card-text" }, [
      el("h3", {}, group.title),
      group.blurb ? el("p", {}, group.blurb) : null,
      el("p", { class: "count" }, `${taxaCount} taxa`)
    ])
  ]);
}

// ---------- Views ----------
function viewSitePicker() {
  // The landing defaults to Rockford; the site dropdown there handles
  // switching, so the bare "#/" route just redirects to the default site.
  const def = SITES.find(s => s.id === "rockford") || SITES[0];
  location.hash = siteBase(def.id);
  return el("div");
}

function siteDropdown(sid) {
  // A <select> of all sites; defaults to the current one. Changing it
  // navigates to that site's landing.
  return el("label", { class: "site-picker" }, [
    el("span", { class: "site-picker-label" }, "Site"),
    el("select", { class: "site-select", "aria-label": "Choose a site",
        on: { change: (e) => { location.hash = siteBase(e.target.value); } } },
      SITES.map(s => el("option",
        { value: s.id, selected: s.id === sid ? "selected" : null },
        s.title.split(" (")[0])))
  ]);
}

function viewSiteLanding(sid) {
  const site = getSite(sid);
  if (!site) return viewNotFound();
  const siteName = site.title.split(" (")[0];
  return el("div", { class: "view view-landing" }, [
    el("header", { class: "hero" }, [
      el("h1", {}, "Iowa Fossil ID"),
      siteDropdown(sid)
    ]),
    el("nav", { class: "landing-actions" }, [
      el("a", { class: "big-action primary", href: `${siteBase(sid)}/build` }, [
        el("span", { class: "ba-title" }, "ID Brachiopod"),
        el("span", { class: "ba-sub" }, "Shape a specimen's outline, profile, hinge, and surface in the visualizer and watch the matching species narrow down.")
      ]),
      el("a", { class: "big-action", href: `${siteBase(sid)}/key` }, [
        el("span", { class: "ba-title" }, "ID Fossil (Unknown)"),
        el("span", { class: "ba-sub" }, "Not sure what it is? Step through short yes/no questions to narrow down what you found.")
      ]),
      el("a", { class: "big-action", href: `${siteBase(sid)}/atlas` }, [
        el("span", { class: "ba-title" }, "Site Atlas"),
        el("span", { class: "ba-sub" }, `Photos of every specimen known from ${siteName}.`)
      ])
    ])
  ]);
}

function viewAtlas(sid) {
  const site = getSite(sid);
  if (!site) return viewNotFound();
  const siteName = site.title.split(" (")[0];
  const taxa = [];
  for (const g of faunaForSite(sid))
    for (const s of g.subgroups)
      for (const t of s.taxa)
        if (t.images && t.images.length) taxa.push(t);
  return el("div", { class: "view" }, [
    topBar({ title: "Site Atlas", sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, `${siteName} — specimen atlas`),
      pageBlurb(taxa.length
        ? "Every photographed specimen from this site. Tap one for detail."
        : "No specimen photos are available for this site yet."),
      taxa.length
        ? el("div", { class: "taxa-grid" }, taxa.map(t => taxonThumb(t, sid)))
        : null
    ])
  ]);
}

function viewBrowse(sid) {
  const fauna = faunaForSite(sid);
  return el("div", { class: "view" }, [
    topBar({ title: "Browse by group", sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, "Major fossil groups"),
      pageBlurb("Tap a group to see what's inside."),
      el("div", { class: "group-grid" }, fauna.map(g => groupCard(g, sid)))
    ])
  ]);
}

function viewGroup(sid, gid) {
  const g = findGroup(sid, gid);
  if (!g) return viewNotFound();
  return el("div", { class: "view" }, [
    topBar({ title: g.title, sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, g.title),
      pageBlurb(g.blurb),
      el("div", { class: "subgroup-grid" }, g.subgroups.map(s => subgroupCard(g, s, sid)))
    ])
  ]);
}

function viewSubgroup(sid, gid, subId) {
  const g = findGroup(sid, gid);
  if (!g) return viewNotFound();
  const sub = g.subgroups.find(s => s.id === subId);
  if (!sub) return viewNotFound();
  return el("div", { class: "view" }, [
    topBar({ title: sub.title, sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, sub.title),
      pageBlurb(sub.blurb),
      el("div", { class: "taxa-grid" }, sub.taxa.map(t => taxonThumb(t, sid)))
    ])
  ]);
}

function viewTaxon(sid, slug) {
  const hit = findTaxon(sid, slug);
  if (!hit) return viewNotFound();
  const { group, sub, taxon } = hit;
  const imgs = taxon.images && taxon.images.length
    ? el("div", { class: "taxon-detail-imgs" },
        taxon.images.map(img => el("figure", { class: "detail-img" }, [
          el("img", { src: imgPath(taxon, img, sid), alt: `${taxon.genus} ${taxon.species}`, loading: "lazy" }),
          el("figcaption", {}, srcLabel(img.src))
        ])))
    : el("div", { class: "no-photo-block" }, [
        el("p", {}, "📷 No photo yet for this taxon."),
        el("p", { class: "no-photo-sub" }, "If you collect or photograph one, drop the image into the right folder and append an entry to this taxon in manifest.js — see the README.")
      ]);
  return el("div", { class: "view" }, [
    topBar({ title: `${taxon.genus} ${taxon.species}`, sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("p", { class: "crumbs" }, [
        el("a", { href: `${siteBase(sid)}/group/${group.id}` }, group.title),
        " › ",
        el("a", { href: `${siteBase(sid)}/sub/${group.id}/${sub.id}` }, sub.title)
      ]),
      el("h2", { class: "page-title taxon-heading" }, [
        el("em", {}, taxon.genus),
        " ",
        taxon.species
      ]),
      taxon.note ? el("p", { class: "taxon-note big" }, taxon.note) : null,
      imgs,
      el("p", { class: "more-link" }, [
        "More ", el("a", { href: `${siteBase(sid)}/sub/${group.id}/${sub.id}` }, sub.title.toLowerCase()), "."
      ])
    ])
  ]);
}

function viewKey(sid, nodeId) {
  const id = nodeId || KEY.root;
  const node = KEY.nodes[id];
  if (!node) return viewNotFound();
  const fig = node.figure ? getFigure(node.figure) : null;
  const figureBlock = fig
    ? el("figure", { class: "key-figure" }, [
        el("img", { src: refPath(fig.file), alt: fig.caption, loading: "lazy" }),
        el("figcaption", {}, fig.caption)
      ])
    : null;
  const options = el("div", { class: "key-options" },
    node.options.map(opt => {
      let href;
      if (opt.result?.filter) href = `${siteBase(sid)}/filter`;
      else if (opt.result)    href = `${siteBase(sid)}/key/result/${opt.result.subgroups.join(",")}`;
      else                    href = `${siteBase(sid)}/key/${opt.next}`;
      return el("a", { class: "key-option", href }, [
        el("span", { class: "ko-label" }, opt.label),
        opt.hint ? el("span", { class: "ko-hint" }, opt.hint) : null
      ]);
    })
  );
  return el("div", { class: "view" }, [
    topBar({ title: "Help me ID it", sid }),
    siteSubBar(sid),
    el("main", { class: "page key-page" }, [
      figureBlock,
      el("h2", { class: "page-title key-question" }, node.question),
      node.hint ? el("p", { class: "key-hint" }, node.hint) : null,
      options,
      el("div", { class: "key-footer" }, [
        el("a", { class: "skip-link",   href: `${siteBase(sid)}/jump` }, "Skip ahead — I know the group →"),
        el("a", { class: "restart-link", href: `${siteBase(sid)}/key` }, "Start over")
      ])
    ])
  ]);
}

// ---------- Trait filter views ----------
function viewFilter(sid, answers) {
  const brachF = brachFaunaForSite(sid);
  const allBrachTaxa = brachF.subgroups.flatMap(s => s.taxa.map(t => ({ taxon: t, sub: s })));
  const matchingCount = allBrachTaxa.filter(({ taxon }) => taxonMatches(taxon, answers)).length;
  const totalCount = allBrachTaxa.length;

  const q = nextQuestion(answers);
  if (!q) return viewFilterResults(sid, answers);  // no more questions

  const fig = q.figure ? getFigure(q.figure) : null;
  const figureBlock = fig
    ? el("figure", { class: "key-figure" }, [
        el("img", { src: refPath(fig.file), alt: fig.caption, loading: "lazy" }),
        el("figcaption", {}, fig.caption)
      ])
    : null;

  const optionLink = (value) => {
    const newAnswers = { ...answers, [q.id]: value };
    return `${siteBase(sid)}/filter?${encodeAnswers(newAnswers)}`;
  };

  const options = q.optionsLayout === "visual"
    ? el("div", { class: "key-options-visual" }, [
        ...q.options.map(opt => el("a", { class: "key-option-visual", href: optionLink(opt.value) }, [
          el("div", { class: "kov-svg", html: opt.svg || "" }),
          el("div", { class: "kov-label" }, opt.label)
        ])),
        el("a", { class: "key-option-visual key-option-skip-visual", href: optionLink("_skip") }, [
          el("div", { class: "kov-svg kov-skip-icon" }, "?"),
          el("div", { class: "kov-label" }, "Not sure — skip")
        ])
      ])
    : el("div", { class: "key-options" }, [
        ...q.options.map(opt => el("a", { class: "key-option", href: optionLink(opt.value) }, [
          el("span", { class: "ko-label" }, opt.label),
          opt.hint ? el("span", { class: "ko-hint" }, opt.hint) : null
        ])),
        el("a", { class: "key-option key-option-skip", href: optionLink("_skip") }, [
          el("span", { class: "ko-label" }, "Not sure — skip this question")
        ])
      ]);

  const answeredCount = Object.keys(answers).length;
  const resultsHref = `${siteBase(sid)}/filter/results?${encodeAnswers(answers)}`;

  return el("div", { class: "view" }, [
    topBar({ title: "Identify a brachiopod", sid }),
    siteSubBar(sid),
    el("div", { class: "filter-status" }, [
      el("span", {}, [
        el("strong", {}, `${matchingCount}`),
        ` of ${totalCount} brachiopod taxa still match`
      ]),
      answeredCount > 0
        ? el("a", { class: "filter-status-link", href: resultsHref }, "See candidates →")
        : null
    ]),
    el("main", { class: "page key-page" }, [
      figureBlock,
      el("h2", { class: "page-title key-question" }, q.text),
      q.hint ? el("p", { class: "key-hint" }, q.hint) : null,
      options,
      el("div", { class: "key-footer" }, [
        el("a", { class: "skip-link", href: `${siteBase(sid)}/jump` }, "Skip ahead — I know the group →"),
        el("a", { class: "restart-link", href: `${siteBase(sid)}/filter` }, "Start over")
      ])
    ])
  ]);
}

function viewFilterResults(sid, answers) {
  const brachF = brachFaunaForSite(sid);
  const allWithSub = brachF.subgroups.flatMap(s => s.taxa.map(t => ({ taxon: t, sub: s })));
  const haveAnswers = Object.values(answers).some(v => v && v !== "_skip");

  // Partition: exact / 1-off / 2-off / further
  const buckets = { exact: [], oneOff: [], twoOff: [] };
  for (const entry of allWithSub) {
    const ms = taxonMismatches(entry.taxon, answers);
    const enriched = Object.assign({}, entry, { mismatches: ms });
    if (ms.length === 0)      buckets.exact.push(enriched);
    else if (ms.length === 1) buckets.oneOff.push(enriched);
    else if (ms.length === 2) buckets.twoOff.push(enriched);
  }
  const exactMatches = buckets.exact;

  // Subgroup tallies (exact + 1-off counted favorably)
  const tallies = brachF.subgroups.map(sub => {
    const exact = sub.taxa.filter(t => taxonMatches(t, answers)).length;
    const near  = sub.taxa.filter(t => taxonMismatches(t, answers).length === 1).length;
    return { sub, exact, near, total: sub.taxa.length };
  }).filter(s => haveAnswers ? (s.exact + s.near > 0) : true);

  const answerSummary = haveAnswers
    ? el("div", { class: "answer-summary" }, [
        el("strong", {}, "Your answers: "),
        ...Object.entries(answers)
          .filter(([_, v]) => v && v !== "_skip")
          .map(([qid, value]) => {
            const q = QUESTIONS.find(qq => qq.id === qid);
            if (!q) return null;
            const opt = q.options.find(o => o.value === value);
            const traitLabel = TRAITS[q.trait]?.label || q.trait;
            return el("span", { class: "answer-chip" }, `${traitLabel}: ${opt?.label || value}`);
          })
      ])
    : null;

  let body;
  if (exactMatches.length === 1) {
    const { taxon, sub } = exactMatches[0];
    body = el("div", {}, [
      el("p", { class: "best-match-note" }, "Only one species matches all your answers:"),
      el("div", { class: "best-match-card" }, [
        el("a", { class: "best-match-link", href: `${siteBase(sid)}/taxon/${taxonSlug(taxon)}` }, [
          taxon.images?.[0]
            ? el("img", { src: imgPath(taxon, taxon.images[0], sid), alt: `${taxon.genus} ${taxon.species}`, loading: "lazy", class: "best-match-img" })
            : el("div", { class: "best-match-img thumb-placeholder" }),
          el("div", { class: "best-match-text" }, [
            el("h3", {}, [el("em", {}, taxon.genus), " ", taxon.species]),
            el("p", { class: "best-match-sub" }, sub.title),
            taxon.note ? el("p", { class: "best-match-hint" }, taxon.note) : null
          ])
        ])
      ])
    ]);
  } else if (exactMatches.length === 0) {
    body = el("div", {}, [
      el("p", { class: "no-match-note" },
        haveAnswers ? "No species in this site match all your answers." : "Answer some questions to narrow the list."),
      tallies.length
        ? el("div", {}, [
            el("h3", {}, "Group-level guesses"),
            el("p", { class: "no-match-sub" }, "Subgroups where some species nearly match your answers (≥ 2 of 3 matching traits):"),
            renderTallies(tallies, sid)
          ])
        : null
    ]);
  } else {
    body = el("div", {}, [
      el("p", { class: "match-note" }, `${exactMatches.length} candidates match all your answers.`),
      renderTallies(tallies, sid),
      el("h3", { class: "candidates-h3" }, "All matching species"),
      el("div", { class: "taxa-grid" }, exactMatches.map(({ taxon }) => taxonThumb(taxon, sid)))
    ]);
  }

  // Near-miss sections (always shown when any near-misses exist).
  // Pedagogical value: students see "I almost matched this — let me check trait X again."
  const nearMissSections = [];
  if (buckets.oneOff.length) {
    nearMissSections.push(
      el("section", { class: "near-miss-section" }, [
        el("h3", { class: "candidates-h3" }, `Almost match (1 trait differs) — ${buckets.oneOff.length}`),
        el("p", { class: "no-match-sub" }, "These taxa would match if you reconsider one trait. Tap to see — the differing trait is labeled below each card."),
        el("div", { class: "taxa-grid" },
          buckets.oneOff.map(({ taxon, mismatches }) => taxonThumbWithDiff(taxon, mismatches, sid)))
      ])
    );
  }
  if (buckets.twoOff.length) {
    nearMissSections.push(
      el("section", { class: "near-miss-section" }, [
        el("h3", { class: "candidates-h3" }, `Possible (2 traits differ) — ${buckets.twoOff.length}`),
        el("p", { class: "no-match-sub" }, "More distant matches; check the noted traits."),
        el("div", { class: "taxa-grid" },
          buckets.twoOff.map(({ taxon, mismatches }) => taxonThumbWithDiff(taxon, mismatches, sid)))
      ])
    );
  }

  return el("div", { class: "view" }, [
    topBar({ title: "Candidates", sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, "Brachiopod candidates"),
      answerSummary,
      body,
      ...nearMissSections,
      el("div", { class: "key-footer" }, [
        el("a", { class: "restart-link", href: "javascript:history.back()" }, "← Back to last question"),
        el("a", { class: "restart-link", href: `${siteBase(sid)}/filter` }, "Start over")
      ])
    ])
  ]);
}

function taxonThumbWithDiff(taxon, mismatches, sid) {
  const card = taxonThumb(taxon, sid);  // base thumbnail
  // Append a small "differs on" annotation under the label
  const diffLabel = mismatches.map(m => {
    const traitLabel = TRAITS[m.trait]?.label || m.trait;
    const tval = Array.isArray(m.taxonValue) ? m.taxonValue.join("/") : m.taxonValue;
    return `${traitLabel}: ${tval} (you said ${m.userValue})`;
  }).join(" · ");
  const note = el("div", { class: "thumb-diff" }, [
    el("strong", {}, "Differs: "),
    diffLabel
  ]);
  card.appendChild(note);
  return card;
}

function renderTallies(tallies, sid) {
  return el("ul", { class: "tally-list" },
    tallies.sort((a, b) => (b.exact - a.exact) || (b.near - a.near))
           .map(t => el("li", { class: "tally-item" }, [
             el("a", { href: `${siteBase(sid)}/sub/brachiopods/${t.sub.id}` }, [
               el("strong", {}, t.sub.title),
               " — ",
               el("span", {}, t.exact > 0
                 ? `${t.exact} match${t.exact > 1 ? "es" : ""}`
                 : (t.near > 0 ? `${t.near} near-miss${t.near > 1 ? "es" : ""}` : "")),
               t.exact === 0 && t.near === 0 ? el("span", { class: "tally-out" }, "ruled out") : null
             ])
           ])));
}

function viewKeyResult(sid, subIdsStr) {
  const ids = (subIdsStr || "").split(",").filter(Boolean);
  const matches = ids.map(id => findSubgroup(sid, id)).filter(Boolean);
  if (!matches.length) {
    return el("div", { class: "view" }, [
      topBar({ title: "Candidates", sid }),
      siteSubBar(sid),
      el("main", { class: "page" }, [
        el("h2", { class: "page-title" }, "No candidates at this site"),
        el("p", {}, "Your answers landed on a group not documented at the current site."),
        el("p", {}, el("a", { href: `${siteBase(sid)}/key` }, "← Try the key again"))
      ])
    ]);
  }
  const sections = matches.map(({ group, sub }) =>
    el("section", { class: "result-section" }, [
      el("h3", {}, sub.title),
      sub.blurb ? el("p", { class: "subgroup-blurb" }, sub.blurb) : null,
      el("div", { class: "taxa-grid" }, sub.taxa.map(t => taxonThumb(t, sid)))
    ])
  );
  return el("div", { class: "view" }, [
    topBar({ title: "Candidates", sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, "Likely candidates"),
      pageBlurb("Tap a specimen for a closer look."),
      ...sections,
      el("div", { class: "key-footer" }, [
        el("a", { class: "restart-link", href: "javascript:history.back()" }, "← Back to question"),
        el("a", { class: "restart-link", href: `${siteBase(sid)}/key` }, "Start over")
      ])
    ])
  ]);
}

// ============================================================
// Tri-view brachiopod visualizer  (slider-driven, archetype-based; 2026-05)
// ============================================================
//
// Pedagogical principle: each slider option produces a CLEARLY DISTINCT
// silhouette. The goal is unambiguous visual identity per choice — not
// photo-perfect reference matching. Students pick options and read the
// resulting shape to confirm/refute matches against their specimen.
//
// Three views (all share viewBox 0 0 200 200):
//   TOP   — dorsal valve from above; +x right, +y anterior (down).
//   FRONT — anterior commissure from the front; +x right, +y down (ventral).
//   SIDE  — right lateral profile; +x anterior (right), +y down (ventral).
//
// All three views read from `s` (built by answersToShape) and use the
// same archetype-keyed dimensions and inflation. No per-view fudge factors.

// ----- constants -----

const SK = {
  outlineW: 2.4,
  ribCol:   "#5a5a5a", ribW:    0.7,
  growthCol:"#8a8a8a", growthW: 0.7,
  frillCol: "#1f1f1f", frillW:  1.4,
  hingeCol: "#1a1a1a", hingeW:  2.0,
  beakCol:  "#1a1a1a",
  sulcusCol:"#9a9a9a", sulcusW: 0.7
};

// Surface decoration intensities — count = number of ribs, amp = visual
// scallop amplitude (mainly used for top-view perimeter undulation).
const RIB_SETTINGS = {
  sparse: { count:  9, amp: 4.0 },
  medium: { count: 18, amp: 2.4 },
  dense:  { count: 30, amp: 1.4 }
};

// Beak prominence — controls ONLY back-of-shell features (interarea
// height for strophic, curl size for astrophic, apex sharpness for
// conical). Body chunkiness lives on INFLATION_PRESETS, driven by
// the separate inflation_pick slider. This decoupling means a student
// can express "thin shell with a tall beak" (subdued inflation +
// pyramidal beak) or "fat shell with no beak" (high inflation +
// subdued beak) — combinations that were impossible when one slider
// drove both.
const BEAK_PRESETS = {
  subdued:   { interareaScale: 0.30 },
  moderate:  { interareaScale: 0.65 },
  prominent: { interareaScale: 1.10 },
  pyramidal: { interareaScale: 1.80 }
};

// Fold strength → numeric amplitude used by front + side views.
const FOLD_STR = { absent: 0, none: 0, weak: 0.50, strong: 1.0 };

// Per-outline body dimensions. halfW = lateral half-extent (used by top
// & front views); halfL = AP half-extent (used by top & side views).
// Choices tuned for clear differentiation:
//   subcircular   — roughly square (W ≈ L)
//   wing-shaped   — wide hinge, short AP (W > L)
//   conical       — narrow body, moderate length
//   elongate-oval — tall and narrow (L > W)
const OUTLINE_DIMS = {
  "subcircular":   { halfW: 70, halfL: 65 },
  "wing-shaped":   { halfW: 88, halfL: 50 },
  "conical":       { halfW: 42, halfL: 50 },
  "elongate-oval": { halfW: 42, halfL: 82 }
};

// Base body amplitude (DV depth in pixels at inflate=1.0). Scaled by
// `inflate` (driven by inflation_pick slider, not beak prominence).
const BASE_AMP = 28;

// Body inflation presets — driven by the separate inflation_pick
// slider. Decoupled from beak prominence so students can express
// "thin shell with a tall beak" or "fat shell with a flush beak".
// Default = moderate when no slider value given (matches the old
// implicit behavior reasonably).
const INFLATION_PRESETS = {
  low:    0.65,
  medium: 0.95,
  high:   1.35
};

// Lateral profile presets (side-view kink at anterior).
const LATERAL_PRESETS = {
  smooth:     { kink: false },
  geniculate: { kink: true,  kinkAt: 0.58, drop: 18, dir: "down" },
  resupinate: { kink: true,  kinkAt: 0.55, drop: 12, dir: "rev"  }
};

// ----- shape derivation -----
//
// answersToShape — single source of truth. All three views consume `s`.
// Adding a new trait means extending this function AND teaching at least
// one view to render it.
function answersToShape(answers) {
  const features  = featuresFromAnswers(answers);
  const outline   = answers.outline_pick    || "subcircular";
  const profile   = answers.profile_pick    || "biconvex";
  const hinge     = answers.hinge_pick      || "astrophic";
  const beak      = answers.beak_pick       || "moderate";
  const fold      = answers.fold_pick       || "absent";
  const lateral   = answers.lateral_pick    || "smooth";
  const sulcus    = answers.sulcus_dir      || "down";
  const inflation = answers.inflation_pick  || "medium";

  const dims     = OUTLINE_DIMS[outline]   || OUTLINE_DIMS.subcircular;
  const beakP    = BEAK_PRESETS[beak]      || BEAK_PRESETS.moderate;
  const latP     = LATERAL_PRESETS[lateral] || LATERAL_PRESETS.smooth;
  const infl     = INFLATION_PRESETS[inflation] || INFLATION_PRESETS.medium;

  return {
    outline, profile, hinge, beak, fold, lateral, sulcus, inflation,
    halfWidth:  dims.halfW,
    halfLength: dims.halfL,
    // Hinge fraction (0..1): width of the flat hinge line as a fraction
    // of halfWidth. 0 = no flat hinge (astrophic curves smoothly).
    hingeFrac:  hinge === "wide-strophic"   ? 1.0 :
                hinge === "narrow-strophic" ? 0.40 : 0,
    isStrophic: hinge !== "astrophic",
    inflate:    infl,
    // Narrow-strophic shells (Schizophoria-style orthids) have a less-
    // prominent posterior than wide-strophic spiriferids — the hinge
    // line is shorter AND the back-of-shell area is correspondingly
    // smaller. Scale down the interarea height so the SIDE view shows
    // a more modest back-feature for narrow-strophic.
    interareaScale: beakP.interareaScale * (hinge === "narrow-strophic" ? 0.65 : 1.0),
    foldStr:    FOLD_STR[fold] || 0,
    // Whether to flip the front view vertically (resolves dorsal/ventral
    // orientation ambiguity for students who can't tell which valve is up).
    foldInvert: sulcus === "down",
    lateralKink: latP.kink ? latP : null,
    ribs:       features.ribs,
    ribCount:   features.ribs ? (RIB_SETTINGS[features.density] || RIB_SETTINGS.medium).count : 0,
    ribAmp:     features.ribs ? (RIB_SETTINGS[features.density] || RIB_SETTINGS.medium).amp   : 0,
    frills:     features.frills,
    spines:     features.spines,
    growthLines: features.lines
  };
}

// ----- shared helpers -----

const CX = 100, CY = 100;

function pointsToPath(pts, close = true) {
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  }
  return close ? d + " Z" : d;
}

// Fold rise as a Gaussian peak at u=0 (centerline). Width controlled by
// sigma; height by foldStr * baseRise. Used by FRONT view (silhouette
// modulation + internal commissure line) and SIDE view (anterior bow).
function foldRiseAt(u, s, baseRise = 18) {
  if (!s.foldStr) return 0;
  const sigma = s.outline === "wing-shaped" || s.outline === "conical" ? 0.20 : 0.25;
  return baseRise * s.foldStr * Math.exp(-(u * u) / (2 * sigma * sigma));
}

// ============================================================
// ATLAS — hand-drawn SVG paths for each archetype × view
// ============================================================
//
// Each entry is one ARCHETYPE (a discrete combination of outline +
// profile + beak + hinge that defines a recognizable brachiopod
// morphotype). Each archetype has three views (top/front/side) drawn
// as hand-authored SVG path strings in a 200×200 viewBox.
//
// Why hand-drawn: procedural curve construction was fragile (cusps,
// tangent mismatches, control-point sign bugs). Hand-drawn paths are
// anatomically correct by construction — a human draws the umbo, the
// neck concavity, the back boundary etc. once and they stay right.
//
// Conventions (in 200×200 viewBox, CX=100, CY=100):
//   TOP view: hinge/beak at TOP (small y), anterior at BOTTOM (large y)
//   FRONT view: dorsal at TOP (small y), ventral at BOTTOM. The
//     foldInvert flip handles sulcus-down convention at the SVG layer.
//   SIDE view: beak at LEFT (small x), anterior at RIGHT (large x)
//
// Decorations (ribs, frills, spines, internal commissure, hinge bar,
// umbo dot) are still PROCEDURAL — drawn on top of the atlas outline
// based on slider answers. This keeps the atlas small (just outlines)
// while preserving the decoration variety students need.

const ATLAS = {
  // -------- Atrypid dome (Pseudoatrypa-like, atrypid-spinose by overlay)
  // subcircular biconvex, moderate beak, astrophic
  "atrypid-dome": {
    top:
      "M 100,28 C 130,30 158,55 168,90 C 172,125 150,168 100,175 " +
      "C 50,168 28,125 32,90 C 42,55 70,30 100,28 Z",
    front:
      "M 30,100 C 30,72 55,52 100,52 C 145,52 170,72 170,100 " +
      "C 170,128 145,148 100,148 C 55,148 30,128 30,100 Z",
    side:
      "M 175,95 C 145,52 105,42 65,52 Q 28,55 22,72 " +
      "Q 22,95 32,100 Q 22,108 22,128 Q 28,145 65,148 " +
      "C 105,158 145,148 175,105 L 175,95 Z"
  },

  // -------- Atrypid globose (Theodossia-like, big inflated dome)
  // Per reference photos: subcircular top, CHUNKY GLOBOSE side with
  // small umbo curl, prominent V-NOTCH (sulcus dip) at bottom of
  // anterior perimeter.
  "atrypid-globose": {
    top:
      // Subcircular with subtle slight pentagonal feel
      "M 100,28 C 140,32 172,60 175,98 C 172,138 145,172 100,178 " +
      "C 55,172 28,138 25,98 C 28,60 60,32 100,28 Z",
    front:
      // CHUNKY hemispheric dome on top + clear V-notch (sulcus) at
      // bottom-center. The bottom undulates: down to lobe, up into V
      // dip, down to lobe, up to lateral.
      "M 22,100 " +
      "C 22,55 55,28 100,28 C 145,28 178,55 178,100 " +     // tall dome on top
      "C 175,128 158,148 130,150 " +                          // right lobe
      "C 118,148 108,135 100,118 " +                          // up into V dip
      "C 92,135 82,148 70,150 " +                             // left lobe
      "C 42,148 25,128 22,100 Z",                             // close to left
    side:
      // Chunky globose oval with small backward beak curl
      "M 178,95 C 155,42 108,32 65,45 " +                    // top arc from anterior to back
      "Q 25,48 18,65 Q 18,82 28,90 " +                         // small backward beak curl
      "L 30,100 " +                                            // commissure plane
      "Q 18,118 18,138 Q 25,160 65,165 " +                     // bot back-shoulder
      "C 108,178 155,168 178,108 L 178,95 Z"                   // bottom arc to anterior
  },

  // -------- Orthid (Schizophoria-like, subcircular w/ narrow strophic hinge)
  "orthid": {
    // Schizophoria-like — subcircular outline; ANTERIOR has clear W
    // in the perimeter (sulcus dip + two lobes); SIDE has small umbo
    // and clean biconvex oval.
    top:
      // Subcircular with subtle small umbo at top (beak)
      "M 100,28 Q 110,28 113,32 L 115,40 " +              // tiny umbo bump at back
      "C 145,42 168,68 170,100 " +                          // top-right arc
      "C 170,135 145,170 100,176 " +                        // right-anterior
      "C 55,170 30,135 30,100 " +                           // left side
      "C 32,68 55,42 85,40 L 87,32 Q 90,28 100,28 Z",       // back to umbo
    front:
      // Smooth dome on top + W-shape on bottom perimeter (sulcus dip).
      // Diagnostic anterior feature: ventral side undulates with V
      // notch at center going UP-INTO body, flanked by two lobes
      // hanging DOWN. Lateral cusps are softly rounded for orthid.
      "M 28,100 " +
      "C 28,72 55,50 100,50 C 145,50 172,72 172,100 " +     // top dome arc
      "C 168,118 152,128 130,128 " +                         // down to right lobe top
      "C 118,128 110,115 100,102 " +                         // up into V (sulcus dip)
      "C 90,115 82,128 70,128 " +                            // down to left lobe top
      "C 48,128 32,118 28,100 Z",                            // close to left
    side:
      // Clean biconvex oval with TINY umbo bump at back-upper-left
      "M 175,95 C 150,55 110,48 75,55 " +                   // top arc from anterior to back-shoulder
      "Q 50,55 38,58 " +                                     // back-shoulder to near beakX
      "Q 28,55 25,62 Q 28,72 35,75 " +                       // small umbo bump (back-and-up curl)
      "L 38,100 " +                                          // down to commissure plane
      "Q 40,135 75,142 " +                                   // bot back-shoulder
      "C 110,150 150,142 175,105 L 175,95 Z"                 // bottom arc to anterior
  },

  // -------- Spiriferid wing (Cyrtospirifer-like, alate, prominent beak)
  "spiriferid-wing": {
    // TOP: wide hinge with SHARP lateral wing tips, prominent body
    // peak at back-center (apex with umbo above).
    top:
      "M 100,22 L 108,32 L 116,42 " +                       // small umbo at back
      "L 192,52 " +                                          // sharp right wing tip
      "L 170,75 C 158,115 135,158 100,180 " +                // anterior taper
      "C 65,158 42,115 30,75 " +                             // left side
      "L 8,52 L 84,42 L 92,32 Z",                            // left wing tip to umbo
    front:
      // Diamond with SHARP lateral wing tips + W bottom (sulcus dip).
      // Central peak at top (fold) and V-notch at bottom (sulcus).
      "M 12,100 " +                                          // left wing tip (sharp)
      "L 70,68 Q 85,55 100,55 Q 115,55 130,68 L 188,100 " + // up to apex peak, back down
      "L 145,128 " +                                          // down to right lobe top
      "C 130,128 115,118 100,108 " +                          // up into V (sulcus)
      "C 85,118 70,128 55,128 " +                             // down to left lobe top
      "L 12,100 Z",                                           // close to left wing
    side:
      // PROMINENT BACKWARD UMBO extending sharply up-and-left past
      // beakX. Below umbo: straight diagonal back boundary (interarea
      // region). Body sweeps right to anterior commissure.
      "M 175,95 " +                                          // anterior top
      "C 150,52 115,42 85,48 " +                              // top arc back to shoulder
      "L 70,52 " +                                            // continue toward umbo base
      "L 18,28 " +                                            // SHARP umbo tip extending back-up
      "L 38,82 " +                                            // back down diagonal to interarea
      "L 38,118 " +                                           // interarea face
      "L 18,172 " +                                           // (symmetric ventral umbo? smaller)
      "L 50,148 " +                                           // back to body
      "C 90,158 140,150 175,108 " +                           // bottom arc to anterior
      "L 175,95 Z"
  },

  // -------- Spiriferid pyramidal (Pyramidspirifer-like, tall interarea + bold umbo)
  // Per reference image #49: WIDE alate top with sharp wing tips,
  // PROMINENT central body peak with delthyrium; SIDE has VERY TALL
  // backward-and-up curling umbo (more pronounced than standard
  // spiriferid-wing); ANTERIOR shows diamond with central peak +
  // V-notch bottom. Distinguishes pyramidal beak from prominent.
  "spiriferid-pyramidal": {
    top:
      // Wide alate with extra-prominent central body peak (delthyrium)
      "M 100,18 L 110,30 L 118,42 " +                       // tall delthyrium peak at back
      "L 192,52 " +                                          // sharp right wing tip
      "L 168,82 C 156,118 132,160 100,182 " +                // anterior taper
      "C 68,160 44,118 32,82 " +                             // left side
      "L 8,52 L 82,42 L 90,30 Z",                            // left wing tip back to peak
    front:
      // Diamond with PROMINENT central peak (delthyrium) + V-notch bottom
      "M 12,100 " +                                          // left wing tip
      "L 65,55 Q 80,40 100,30 Q 120,40 135,55 " +            // up to tall peak
      "L 188,100 " +                                         // right wing tip
      "L 148,128 " +                                         // right lobe down
      "C 132,128 115,118 100,108 " +                          // up into V (sulcus)
      "C 85,118 68,128 52,128 " +                             // left lobe
      "L 12,100 Z",                                           // close
    side:
      // VERY TALL UMBO extending back-and-up at steep angle, then
      // long slanted interarea face down to ventral side. Anatomy
      // matches Pyramidspirifer/Cyrtina-style pyramidal forms.
      "M 175,98 " +                                          // anterior top
      "C 150,55 115,42 78,48 " +                              // top arc to back-shoulder
      "L 60,52 " +                                            // continue toward umbo base
      "L 12,15 " +                                            // VERY TALL umbo tip (pyramidal)
      "L 32,75 " +                                            // back down along umbo curl
      "L 40,115 " +                                           // continue interarea face
      "L 12,178 " +                                           // ventral umbo (smaller, mirror)
      "L 50,150 " +                                           // back to body
      "C 90,160 140,150 175,108 " +                           // bottom arc to anterior
      "L 175,98 Z"
  },

  // -------- Spiriferid cone (Conispirifer/Cyrtina-like, tall pyramidal back)
  "spiriferid-cone": {
    // TOP: narrow pentagonal body with slight back taper
    top:
      "M 100,28 L 130,40 L 140,75 " +                       // back-right curve
      "C 142,118 128,160 100,178 " +                          // right tapering forward
      "C 72,160 58,118 60,75 L 70,40 Z",                       // left side back to start
    front:
      // Heart shape — central peak at top (fold) + V-notch + lateral
      // cusps. Width less than wing-shape (narrower body).
      "M 40,108 " +                                            // left lateral
      "Q 55,55 100,32 Q 145,55 160,108 " +                     // up-and-over peak
      "L 132,142 " +                                           // right lobe down
      "C 122,138 110,125 100,115 " +                            // up into V
      "C 90,125 78,138 68,142 L 40,108 Z",
    side:
      // VERY TALL backward-curling umbo + slanting interarea +
      // small body extending forward. Pyramidal beak: apex sits
      // way up and BACK of beakX.
      "M 175,108 " +                                          // anterior top
      "Q 150,90 130,75 " +                                     // top arc back to apex region
      "L 95,32 L 78,28 " +                                     // tall umbo (apex of cone)
      "L 38,150 " +                                            // long slanted interarea face
      "Q 100,165 175,148 " +                                    // bottom arc forward to anterior
      "L 175,108 Z"
  },

  // -------- Strophomenid geniculate (Douvillina-like, concavo-convex)
  // Per reference: rounded triangular top, VERY LOW PROFILE crescent
  // side (flat-ish top + bowed bottom), wide thin lens anterior.
  "strophomenid-geniculate": {
    top:
      // Wider triangular/teardrop with rounded back
      "M 100,32 C 142,38 172,68 178,108 " +
      "C 172,148 142,178 100,182 " +
      "C 58,178 28,148 22,108 C 28,68 58,38 100,32 Z",
    front:
      // VERY LOW PROFILE thin lens — both valves curving same direction
      // (concavo-convex). Almost flat with slight curvature.
      "M 22,98 Q 100,75 178,98 Q 100,118 22,98 Z",
    side:
      // CRESCENT/BANANA — flat-ish top, bowed bottom. Low profile.
      // Very thin shellThickness reading anatomically appropriate.
      "M 22,95 Q 100,100 178,95 " +                      // flat top edge (commissure plane)
      "Q 140,135 100,148 " +                              // bow down on bottom-right
      "Q 50,142 22,108 " +                                // bow back up on bottom-left
      "L 22,95 Z"
  }
};

// answersToArchetype — map slider answers to an atlas key. Each
// archetype is a discrete combination; this function picks the BEST
// matching atlas entry given the student's slider choices.
function answersToArchetype(answers) {
  const outline = answers.outline_pick || "subcircular";
  const profile = answers.profile_pick || "biconvex";
  const hinge   = answers.hinge_pick   || "astrophic";
  const beak    = answers.beak_pick    || "moderate";
  const lateral = answers.lateral_pick || "smooth";

  // Concavo-convex always maps to strophomenid (regardless of other choices).
  if (profile === "concavo-convex") return "strophomenid-geniculate";

  // Wing-shaped: distinguish prominent vs pyramidal beak. Pyramidal
  // beak with wing-shape gets the tall-umbo pyramidal variant
  // (Pyramidspirifer-like); prominent gets the standard wing-spiriferid
  // (Cyrtospirifer-like).
  if (outline === "wing-shaped") {
    return beak === "pyramidal" ? "spiriferid-pyramidal" : "spiriferid-wing";
  }

  // Conical outline → cone-spiriferid.
  if (outline === "conical") return "spiriferid-cone";

  // Strophic dome → orthid-style.
  if (hinge === "narrow-strophic" || hinge === "wide-strophic") return "orthid";

  // Astrophic dome with prominent/pyramidal beak → globose (Theodossia)
  if (beak === "prominent" || beak === "pyramidal") return "atrypid-globose";

  // Default astrophic dome → atrypid.
  return "atrypid-dome";
}

function atlasOutline(archetypeKey, view) {
  // Prefer vectorized reference outlines (from real Rockford specimens)
  // when available; fall back to hand-drawn ATLAS for archetypes without
  // a reference (e.g. spiriferid-pyramidal) or missing views.
  if (typeof VECTORIZED_ATLAS !== "undefined") {
    const v = VECTORIZED_ATLAS[archetypeKey];
    if (v && v[view]) return v[view];
  }
  const entry = ATLAS[archetypeKey];
  if (!entry || !entry[view]) {
    return "M 100,40 C 145,40 170,70 170,100 C 170,130 145,160 100,160 " +
           "C 55,160 30,130 30,100 C 30,70 55,40 100,40 Z";
  }
  return entry[view];
}

// ============================================================
// TOP VIEW — dorsal valve seen from above (beak at top of view)
// ============================================================
//
// Renders the outline shape (4 archetypes) plus surface decorations:
// radial ribs fanning from the beak, concentric growth-line frills, and
// spine dots. Strophic hinges show as a thick straight bar at the back.

// unitOutline(theta, s) → [nx, ny] in [-1, +1]^2.
//   theta = 0 → beak (back, ny=-1)
//   theta = π → anterior commissure (ny=+1)
function unitOutline(theta, s) {
  const ct = Math.cos(theta), st = Math.sin(theta);
  let nx, ny;
  switch (s.outline) {
    case "wing-shaped": {
      // Hinge zone (back half): rectangular — full lateral extent
      // straight to the back beak. Anterior half: tapered diamond.
      if (ct >= 0) {
        nx = Math.sign(st) || 1;
        ny = -ct;
      } else {
        const taper = Math.pow(1 - Math.abs(ct), 0.65);
        nx = (Math.sign(st) || 1) * taper;
        ny = -ct;
      }
      break;
    }
    case "conical": {
      // Narrow body, flat back, tapered front.
      if (ct >= 0) {
        nx = Math.sign(st) || 1;
        ny = -ct;
      } else {
        const taper = Math.pow(1 - Math.abs(ct), 0.60);
        nx = (Math.sign(st) || 1) * taper;
        ny = -ct;
      }
      break;
    }
    case "elongate-oval": {
      // Tall oval with very gentle beak taper.
      nx = st;
      ny = -ct;
      if (ct > 0.6) {
        const tt = (ct - 0.6) / 0.4;
        nx *= 1 - 0.20 * Math.pow(tt, 1.4);
      }
      break;
    }
    case "subcircular":
    default: {
      // Round shape with subtle teardrop at the beak.
      nx = st;
      ny = -ct;
      if (ct > 0.5) {
        const tt = (ct - 0.5) / 0.5;
        nx *= 1 - 0.18 * Math.pow(tt, 1.3);
      }
      break;
    }
  }

  // Strophic hinge straightening: blend the back curve toward a flat
  // hinge line. The hinge extends from -hingeFrac to +hingeFrac in
  // normalized lateral coords. Outside that range the perimeter falls
  // away to the wing tips (or curls in for narrow-strophic).
  if (s.hingeFrac > 0 && ct > 0) {
    const blend = Math.pow(ct, 1.4);
    ny = ny * (1 - blend) + (-1) * blend;
    // Cap lateral extent at the hinge boundary for the back zone.
    if (ct > 0.35) {
      nx = Math.sign(nx || 1) * Math.min(Math.abs(nx), s.hingeFrac);
    }
  }
  return [nx, ny];
}

// topPerimeter (procedural body outline) removed in the atlas pivot.
// Top-view body shape now comes from atlasOutline() lookup.
// unitOutline() is RETAINED because it's still used by decoration
// helpers (topRibs, topFrills, topGrowthLines, topSpines) to position
// surface features relative to a normalized body shape.

function topRibs(s) {
  // Radial ribs fanning from beak (top of view, at CY - halfLength)
  // out toward the anterior. Number from ribCount; spread evenly across
  // the body width.
  if (!s.ribs || s.ribCount === 0) return "";
  const beakX = CX, beakY = CY - s.halfLength * 0.95;
  const N = s.ribCount;
  let out = "";
  // Sample anterior perimeter (lower half) for rib endpoints.
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;   // 0..1
    // Map to a theta in lower half (anterior): theta ∈ [π/2, 3π/2]
    const theta = Math.PI * (0.5 + t);
    const [nx, ny] = unitOutline(theta, s);
    const endX = CX + nx * s.halfWidth * 0.92;
    const endY = CY + ny * s.halfLength * 0.92;
    out += `<line x1="${beakX.toFixed(1)}" y1="${beakY.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="${SK.ribCol}" stroke-width="${SK.ribW}"/>`;
  }
  return out;
}

function topFrills(s) {
  // Concentric arcs around the anterior half — bolder than growth lines.
  if (!s.frills) return "";
  let out = "";
  const K = 3;
  for (let k = 1; k <= K; k++) {
    const f = 0.55 + 0.13 * k;   // distance fraction from beak
    let d = "";
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const theta = Math.PI * (0.5 + t);   // lower (anterior) half
      const [nx, ny] = unitOutline(theta, s);
      const x = CX + nx * s.halfWidth * f;
      const y = CY + ny * s.halfLength * f;
      d += (i === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    }
    out += `<path d="${d}" fill="none" stroke="${SK.frillCol}" stroke-width="${SK.frillW}" opacity="0.7"/>`;
  }
  return out;
}

function topGrowthLines(s) {
  // Subtle concentric arcs (used when growthLines=true but frills=false)
  if (!s.growthLines) return "";
  let out = "";
  const K = 5;
  for (let k = 1; k <= K; k++) {
    const f = 0.50 + 0.10 * k;
    let d = "";
    const N = 50;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const theta = Math.PI * (0.5 + t);
      const [nx, ny] = unitOutline(theta, s);
      const x = CX + nx * s.halfWidth * f;
      const y = CY + ny * s.halfLength * f;
      d += (i === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    }
    out += `<path d="${d}" fill="none" stroke="${SK.growthCol}" stroke-width="${SK.growthW}"/>`;
  }
  return out;
}

function topSpines(s) {
  // Random-ish dots distributed across the body
  if (!s.spines) return "";
  let out = "";
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a = i * 137.5 * Math.PI / 180;
    const r = Math.sqrt((i + 0.5) / N) * 0.75;
    const x = CX + r * Math.cos(a) * s.halfWidth * 0.85;
    const y = CY + r * Math.sin(a) * s.halfLength * 0.85;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.4" fill="#222"/>`;
  }
  return out;
}

function topHingeBar(s, hingeGeom) {
  if (s.hingeFrac === 0) return "";
  // Use the geometry computed by flattenTopForHinge so the bar aligns
  // exactly with the flat segment of the reshaped outline.
  if (!hingeGeom) {
    const halfW = s.halfWidth * s.hingeFrac;
    const y = CY - s.halfLength + 1;
    return `<line x1="${(CX - halfW).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(CX + halfW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${SK.hingeCol}" stroke-width="${SK.hingeW}"/>`;
  }
  return `<line x1="${hingeGeom.x0.toFixed(1)}" y1="${hingeGeom.y.toFixed(1)}" x2="${hingeGeom.x1.toFixed(1)}" y2="${hingeGeom.y.toFixed(1)}" stroke="${SK.hingeCol}" stroke-width="${SK.hingeW}"/>`;
}

// ---------- Strophic hinge top-flattening (procedural outline reshape) ----------

function parsePathPoints(d) {
  const tokens = d.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  const pts = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "M" || t === "L") {
      pts.push({ x: parseFloat(tokens[i+1]), y: parseFloat(tokens[i+2]) });
      i += 3;
    } else { i += 1; }
  }
  return pts;
}

function polygonWidthAtY(pts, y) {
  const xs = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    if ((a.y <= y && b.y > y) || (a.y > y && b.y <= y)) {
      const t = (y - a.y) / (b.y - a.y);
      xs.push(a.x + t * (b.x - a.x));
    }
  }
  if (xs.length < 2) return { width: 0, x0: 0, x1: 0 };
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  return { width: x1 - x0, x0, x1 };
}

// Find Y where polygon width equals targetWidth (scanning from top down).
function findHingeY(pts, targetWidth, minY, maxY) {
  const steps = 60;
  let prev = 0;
  for (let i = 1; i < steps; i++) {
    const y = minY + (maxY - minY) * (i / steps);
    const w = polygonWidthAtY(pts, y).width;
    if (w >= targetWidth) {
      // Linear interp between previous and current step
      const prevY = minY + (maxY - minY) * ((i - 1) / steps);
      const t = prev === 0 ? 1 : (targetWidth - prev) / Math.max(0.001, w - prev);
      return prevY + t * (y - prevY);
    }
    prev = w;
  }
  return minY + (maxY - minY) * 0.10;
}

// Sutherland-Hodgman clip: keep points with y >= hingeY, replace anything
// above with a straight horizontal segment at hingeY.
function flattenTopForHinge(d, s) {
  if (!s.isStrophic) return { d, hingeGeom: null };
  const pts = parsePathPoints(d);
  if (pts.length < 4) return { d, hingeGeom: null };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const fullW = maxX - minX;
  const targetW = s.hingeFrac * fullW;
  const hingeY = findHingeY(pts, targetW, minY, maxY);

  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const curIn = cur.y >= hingeY;
    const nextIn = next.y >= hingeY;
    if (curIn) {
      out.push(cur);
      if (!nextIn) {
        const t = (hingeY - cur.y) / (next.y - cur.y);
        out.push({ x: cur.x + t * (next.x - cur.x), y: hingeY });
      }
    } else if (nextIn) {
      const t = (hingeY - cur.y) / (next.y - cur.y);
      out.push({ x: cur.x + t * (next.x - cur.x), y: hingeY });
    }
  }

  if (out.length < 3) return { d, hingeGeom: null };

  const hingePts = out.filter(p => Math.abs(p.y - hingeY) < 0.001);
  const hx0 = hingePts.length ? Math.min(...hingePts.map(p => p.x)) : CX;
  const hx1 = hingePts.length ? Math.max(...hingePts.map(p => p.x)) : CX;

  let newD = `M ${out[0].x.toFixed(1)},${out[0].y.toFixed(1)}`;
  for (let i = 1; i < out.length; i++) {
    newD += ` L ${out[i].x.toFixed(1)},${out[i].y.toFixed(1)}`;
  }
  newD += " Z";
  return { d: newD, hingeGeom: { x0: hx0, x1: hx1, y: hingeY } };
}

function topUmboDot(s) {
  // Beak/umbo marker at the back center; its size scales with beak
  // prominence so the Beak slider visibly registers (a subdued beak is a
  // small nub, a pyramidal one a tall triangle).
  const k = s.interareaScale;            // 0.30 (subdued) .. 1.80 (pyramidal)
  const y = CY - s.halfLength + (s.isStrophic ? 4 : 6);
  const w = 3 + 3.2 * k;                 // half-width of the triangle base
  const h = 4 + 7 * k;                   // height, pointing back (up)
  const d = `M ${(CX - w).toFixed(1)},${y.toFixed(1)} L ${CX},${(y - h).toFixed(1)} ` +
            `L ${(CX + w).toFixed(1)},${y.toFixed(1)} Z`;
  return `<path d="${d}" fill="${SK.beakCol}"/>`;
}

function topSulcusLine(s) {
  // Dashed line down the AP midline (anterior half) marking the fold /
  // sulcus crest. Weight grows with fold strength so a strong fold is
  // clearly heavier than a weak one.
  if (!s.foldStr) return "";
  const x = CX;
  const y0 = CY;
  const y1 = CY + s.halfLength * 0.85;
  const w = (SK.sulcusW + 1.3 * s.foldStr).toFixed(1);
  const col = s.foldStr >= 1 ? "#555" : SK.sulcusCol;
  return `<line x1="${x.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-dasharray="4,2"/>`;
}

function svgTopView(answers) {
  const s = answersToShape(answers);
  const archetype = answersToArchetype(answers);
  const rawOutline = atlasOutline(archetype, "top");

  // For strophic hinges, RESHAPE the outline itself (clip top with a
  // horizontal segment) so the silhouette has a flat back edge — not
  // just a line decoration drawn over a curved dome.
  const { d: outlinePath, hingeGeom } = flattenTopForHinge(rawOutline, s);

  const clipId = "brachTopClip_" + Math.floor(Math.random() * 1e6);
  let inner = "";
  if (s.frills) inner += topFrills(s);
  else if (s.growthLines) inner += topGrowthLines(s);
  if (s.ribs)   inner += topRibs(s);

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-top">
    <defs><clipPath id="${clipId}"><path d="${outlinePath}"/></clipPath></defs>
    <path d="${outlinePath}" fill="#c9b380" fill-opacity="0.35" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round"/>
    <g clip-path="url(#${clipId})">${inner}</g>
    ${topSulcusLine(s)}
    ${topHingeBar(s, hingeGeom)}
    ${topUmboDot(s)}
    ${s.spines ? topSpines(s) : ""}
  </svg>`;
}

// ============================================================
// FRONT VIEW — anterior commissure seen head-on
// ============================================================
//
// The combined dorsal-above + ventral-below silhouette. Profile
// determines which valve(s) bulge; fold modulates the central commissure.
// Width matches the top view's halfWidth.

// Body amplitude multiplier — scales DV (dorso-ventral) depth in BOTH
// SIDE and FRONT views so chunky shells read volumetrically. Used by
// SIDE and FRONT alike for cross-view consistency: the same physical
// shell depth must render at the same pixel scale whether viewed from
// the front or from the side. Earlier, SIDE used amp×1.0 while FRONT
// used amp×1.7 — same shell would render dramatically thicker in
// front view than in side view, anatomically inconsistent.
const AMP_MULT = 1.7;
const FRONT_AMP_MULT = AMP_MULT;   // backwards compat — same value

// (stripped procedural body code — atlas pivot)

function frontCommissureLine(s) {
  // M-shape commissure: lateral cusps rise high (where the two valves
  // meet at the body's widest point), commissure dips inward into the
  // body, then a central fold peak (smaller than the cusps).
  // The path extends slightly beyond ±halfW and is clipped to the
  // silhouette so its endpoints visually meet the lateral cusps.
  if (!s.foldStr) return "";
  const isTriangular = s.outline === "wing-shaped" || s.outline === "conical";
  const commCoef = isTriangular ? 0.7 : 1.0;
  const halfW = s.halfWidth * 1.10;   // overshoot for clean clipping
  const cuspAmp = 14;                  // lateral cusps (where valves meet)
  const foldAmp = 34;                  // central fold tongue — dominant feature
  const foldSigma = 0.30;
  const N = 96;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const u = (i / N - 0.5) * 2;
    const x = CX + u * halfW;
    const cuspRise = cuspAmp * Math.pow(Math.abs(u), 2);
    const foldRise = foldAmp * s.foldStr * Math.exp(-(u * u) / (2 * foldSigma * foldSigma));
    const y = CY - (cuspRise + foldRise) * commCoef;
    d += (i === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
  }
  // Stroke weight also grows with fold strength so a strong fold reads
  // boldly, not as a hairline.
  const w = (1.6 + 1.4 * s.foldStr).toFixed(1);
  return `<path d="${d}" fill="none" stroke="#2a2a2a" stroke-width="${w}" stroke-linejoin="round"/>`;
}

function svgFrontView(answers) {
  const s = answersToShape(answers);
  const archetype = answersToArchetype(answers);
  const d = atlasOutline(archetype, "front");

  // Internal commissure line still drawn procedurally (it's a feature
  // that varies with foldStr/sulcusDir, not the archetype itself).
  // ClipPath ensures the M-curve terminates at the silhouette's lateral
  // cusps no matter how wide the cusps actually sit.
  const flipAttr = s.foldInvert ? ` transform="translate(0,200) scale(1,-1)"` : "";
  const commLine = frontCommissureLine(s);
  const clipId = "brachFrontClip_" + Math.floor(Math.random() * 1e6);

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-front">
    <defs><clipPath id="${clipId}"><path d="${d}"/></clipPath></defs>
    <g${flipAttr}>
      <path d="${d}" fill="#c9b380" fill-opacity="0.35" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round"/>
      <g clip-path="url(#${clipId})">${commLine}</g>
    </g>
  </svg>`;
}

// ============================================================
// SIDE VIEW — right lateral profile
// ============================================================
//
// Three sub-renderers by outline archetype:
//   conical            — tall triangular back + small dorsal cap
//   concavo-convex     — bowed crescent (both valves curve same way)
//   default (biconvex) — smooth oval split horizontally at the commissure
//
// All sub-renderers handle the same modifier set: beak prominence (back
// shape), lateral kink (geniculate/resupinate at anterior).

function sideBeak(s) {
  // Beak / interarea at the POSTERIOR (left) of the side view. The wedge
  // projects backward and grows with beak prominence, so the Beak slider
  // turns a flush/subdued umbo into a hooked or pyramidal one. A subdued
  // beak (small projection) stays tucked inside the body outline; a
  // prominent/pyramidal one juts out past the back edge.
  const k = s.interareaScale;            // 0.30 (subdued) .. 1.80 (pyramidal)
  const baseX = 26;                      // base sits inside the back of the body
  const h = 6 + 8 * k;                   // half-height of the interarea face
  const proj = 3 + 9 * k;                // backward (leftward) projection
  const tipX = baseX - proj;
  const d = `M ${baseX},${(CY - h).toFixed(1)} ` +
            `L ${tipX.toFixed(1)},${(CY - h * 0.18).toFixed(1)} ` +
            `L ${tipX.toFixed(1)},${(CY + h * 0.18).toFixed(1)} ` +
            `L ${baseX},${(CY + h).toFixed(1)} Z`;
  return `<path d="${d}" fill="#d8c79a" stroke="${SK.beakCol}" stroke-width="1.5" stroke-linejoin="round"/>`;
}

function svgSideView(answers) {
  const s = answersToShape(answers);
  const archetype = answersToArchetype(answers);
  const d = atlasOutline(archetype, "side");

  // Median commissure visualization aid (light dashed line at CY) —
  // only for biconvex profiles where the commissure is internal.
  const medianLine = answers.profile_pick !== "concavo-convex"
    ? `<line x1="22" y1="100" x2="178" y2="100" stroke="#9a9a9a" stroke-width="0.8" stroke-dasharray="4,2"/>`
    : "";

  // Beak drawn UNDER the body so its base tucks behind the outline; only
  // the projecting tip shows for prominent/pyramidal beaks.
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-side">
    ${sideBeak(s)}
    <path d="${d}" fill="#c9b380" fill-opacity="0.35" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round"/>
    ${medianLine}
  </svg>`;
}

// --- biconvex side view (standard brachiopod oval) ---
// Body envelope shape: returns a normalized height in [0,1] at lateral
// position u ∈ [-1, +1]. The choice of envelope is critical for whether
// shells read as "chunky" or "lens-like":
//   parabolic (n=2):       1-u²       — thin lens, peaked apex, fast drop-off
//   elliptical (n≈2.5):    fatter     — moderate plateau
//   super-elliptical n=3:  chunky     — wide flat plateau, sharper edge taper
// SIDE biconvex uses n=3 — gives the body a clear chunky oval reading
// rather than the previous lens shape, which was the structural root of
// the "PARAM too thin" complaint across taxa.
// (stripped procedural body code — atlas pivot)

// Beak decoration at the back of the side view. After the structural
// rewrite of sideViewBiconvex, the SILHOUETTE itself carries:
//   • the interarea face (for strophic + any non-subdued beak)
//   • the umbo horn + neck concavity (for strophic + prominent/pyramidal)
//   • the astrophic curl (for astrophic + non-subdued)
//
// So this function only adds the INTERAREA TEXTURE — a beige fill over
// the interarea face plus a few hatching strokes. The fill helps the
// interarea read as a distinct surface from the body proper (different
// material in the silhouette).
// (stripped procedural body code — atlas pivot)
// Analytical morphospace renderer (port of data/fit_harness/model.py)
// ============================================================
//
// Per-taxon fitted parameter tuples drive this renderer. Each tuple has:
//   lat_half       lateral half-width (X in [-lat_half, +lat_half])
//   p_ant, p_post  super-ellipse exponents for the anterior / posterior
//                   halves of the outline (TOP view)
//   apex_y         AP coord of the dome apex (in [-0.5, +0.5])
//   dorsal_z       max dorsal valve height
//   ventral_z      max ventral valve depth (positive number; valve sits at -z)
//   dome_k         super-Gaussian exponent (sharpness of the dome plateau)
//   sulcus_depth   strength of the ventral sulcus / dorsal fold
//   sulcus_sigma   angular width of the sulcus Gaussian
//
// Coordinate frame matches data/fit_harness:
//   X = lateral, Y = AP (umbo at -0.5, anterior at +0.5), Z = DV.
// Renders into a 200×200 viewBox via _morphScale().

const MORPH_SCALE = 180;           // px per unit (so range [-0.5, +0.5] → 90 px each side)
const MORPH_CX = 100;
const MORPH_CY = 100;

function _morphScreen(x, y) {
  // Convert normalised coords → (svgX, svgY) with anterior at bottom of view.
  return [MORPH_CX + x * MORPH_SCALE, MORPH_CY - y * MORPH_SCALE];
}

function _morphTopOutline(p, n = 360) {
  // Piecewise super-ellipse closed curve in normalised (X, Y) coords.
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI;
    const ct = Math.cos(t), st = Math.sin(t);
    const exp = st >= 0 ? p.p_ant : p.p_post;
    const inv = 2.0 / exp;
    let x = p.lat_half * Math.sign(ct) * Math.pow(Math.abs(ct), inv);
    let y = 0.5 * Math.sign(st) * Math.pow(Math.abs(st), inv);
    // Sulcus indent on the anterior margin (pulls midline inward toward umbo)
    if (p.sulcus_depth > 0 && st > 0) {
      const phi = Math.atan2(x, Math.max(y, 1e-6));
      const ant = st * st;
      const mid = Math.exp(-(phi * phi) / (2 * p.sulcus_sigma * p.sulcus_sigma));
      const pull = p.sulcus_depth * 0.15 * ant * mid;
      const r = Math.hypot(x, y);
      if (r > 1e-6) {
        x -= pull * (x / r);
        y -= pull * (y / r);
      }
    }
    pts.push([x, y]);
  }
  return pts;
}

function _morphOutlineRadiusPolar(p, nLut = 400) {
  // Precompute (sortedTheta, sortedR) for polar lookups from the dome apex.
  const apexX = 0, apexY = p.apex_y;
  const samples = [];
  for (let i = 0; i < nLut; i++) {
    const t = (i / nLut) * 2 * Math.PI;
    const ct = Math.cos(t), st = Math.sin(t);
    const exp = st >= 0 ? p.p_ant : p.p_post;
    const inv = 2.0 / exp;
    const x = p.lat_half * Math.sign(ct) * Math.pow(Math.abs(ct), inv);
    const y = 0.5 * Math.sign(st) * Math.pow(Math.abs(st), inv);
    const dx = x - apexX, dy = y - apexY;
    samples.push([Math.atan2(dy, dx), Math.hypot(dx, dy)]);
  }
  samples.sort((a, b) => a[0] - b[0]);
  const thetas = samples.map(s => s[0]);
  const rs = samples.map(s => s[1]);
  return (theta) => {
    // Normalise theta to [-π, π]; binary search interpolation.
    let q = ((theta + Math.PI) % (2 * Math.PI));
    if (q < 0) q += 2 * Math.PI;
    q -= Math.PI;
    // Linear search good enough at this size; binary search if profiling matters.
    let lo = 0, hi = thetas.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (thetas[mid] <= q) lo = mid; else hi = mid;
    }
    const a = (q - thetas[lo]) / Math.max(thetas[hi] - thetas[lo], 1e-9);
    return rs[lo] * (1 - a) + rs[hi] * a;
  };
}

function _morphSurface(p, nS = 100, nT = 280) {
  // Sample the dorsal+ventral valve surfaces. Returns {X, Y, Zd, Zv}
  // as flat arrays of length nS*nT.
  const k = Math.max(p.dome_k, 1.01);
  const rOf = _morphOutlineRadiusPolar(p);
  const N = nS * nT;
  const X = new Float64Array(N), Y = new Float64Array(N);
  const Zd = new Float64Array(N), Zv = new Float64Array(N);
  let i = 0;
  for (let si = 0; si < nS; si++) {
    const s = si / (nS - 1);
    for (let ti = 0; ti < nT; ti++) {
      const t = (ti / nT) * 2 * Math.PI;
      const ct = Math.cos(t), st = Math.sin(t);
      const rMargin = rOf(t);
      const r = s * rMargin;
      const x = r * ct;
      const y = p.apex_y + r * st;
      X[i] = x; Y[i] = y;
      const h = Math.pow(Math.max(1 - Math.pow(s, k), 0), 1 / k);
      let sulcus = 0;
      if (p.sulcus_depth > 0) {
        const antFactor = Math.pow(Math.max(st, 0), 1.5);
        const phi = Math.atan2(x, Math.max(y - p.apex_y, 1e-6));
        const midFactor = Math.exp(-(phi * phi) / (2 * p.sulcus_sigma * p.sulcus_sigma));
        sulcus = p.sulcus_depth * Math.pow(s, 1.5) * antFactor * midFactor;
      }
      Zd[i] = p.dorsal_z * (h + 0.5 * sulcus);
      let zv = -p.ventral_z * (h - 1.2 * sulcus);
      if (zv > 0) zv = 0;
      Zv[i] = zv;
      i++;
    }
  }
  return { X, Y, Zd, Zv };
}

function _morphEnvelope(aArr, bArr, nBins) {
  // Bin by `a`, return upper/lower envelope of `b`. Output is two arrays
  // (svgPolyA, svgPolyB) tracing a closed polygon: forward along the
  // upper envelope, backward along the lower.
  let aMin = Infinity, aMax = -Infinity;
  for (let i = 0; i < aArr.length; i++) {
    if (aArr[i] < aMin) aMin = aArr[i];
    if (aArr[i] > aMax) aMax = aArr[i];
  }
  if (!(aMax > aMin)) return [[], []];
  const upper = new Float64Array(nBins).fill(-Infinity);
  const lower = new Float64Array(nBins).fill(Infinity);
  for (let i = 0; i < aArr.length; i++) {
    let idx = Math.floor((aArr[i] - aMin) / (aMax - aMin) * (nBins - 1));
    if (idx < 0) idx = 0; else if (idx >= nBins) idx = nBins - 1;
    if (bArr[i] > upper[idx]) upper[idx] = bArr[i];
    if (bArr[i] < lower[idx]) lower[idx] = bArr[i];
  }
  const centres = [], up = [], lo = [];
  for (let i = 0; i < nBins; i++) {
    if (Number.isFinite(upper[i]) && Number.isFinite(lower[i])) {
      const c = aMin + (i + 0.5) / nBins * (aMax - aMin);
      centres.push(c);
      up.push(upper[i]);
      lo.push(lower[i]);
    }
  }
  const polyA = centres.concat(centres.slice().reverse());
  const polyB = up.concat(lo.slice().reverse());
  return [polyA, polyB];
}

function _morphPolyToSvgPath(polyA, polyB, screenFn) {
  if (!polyA.length) return "";
  let d = "";
  for (let i = 0; i < polyA.length; i++) {
    const [sx, sy] = screenFn(polyA[i], polyB[i]);
    d += (i === 0 ? "M " : " L ") + `${sx.toFixed(1)},${sy.toFixed(1)}`;
  }
  return d + " Z";
}

// ---------- ANALYTICAL TOP VIEW ----------
function svgAnalyticalTop(p) {
  const outline = _morphTopOutline(p);
  // TOP view: anterior at bottom (Y → +0.5), umbo at top (Y → -0.5).
  let d = "";
  for (let i = 0; i < outline.length; i++) {
    const [sx, sy] = _morphScreen(outline[i][0], -outline[i][1]);  // flip Y
    d += (i === 0 ? "M " : " L ") + `${sx.toFixed(1)},${sy.toFixed(1)}`;
  }
  d += " Z";
  // Umbo marker at the back-most point of the outline (smallest -Y on screen)
  let umboY = -Infinity, umboX = 0;
  for (const [x, y] of outline) {
    const [sx, sy] = _morphScreen(x, -y);
    if (sy < umboY) umboY = sy;
  }
  // Skip umbo marker — outline is enough at this scale
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-top">
    <path d="${d}" fill="#c9b380" fill-opacity="0.35" stroke="black" stroke-width="2.2" stroke-linejoin="round"/>
  </svg>`;
}

// ---------- ANALYTICAL FRONT VIEW ----------
// Cross-section of the surface near the anterior margin (Y > 0.25).
function svgAnalyticalFront(p) {
  const { X, Y, Zd, Zv } = _morphSurface(p);
  const xs = [], zs = [];
  for (let i = 0; i < X.length; i++) {
    if (Y[i] > 0.25) {
      xs.push(X[i]); zs.push(Zd[i]);
      xs.push(X[i]); zs.push(Zv[i]);
    }
  }
  // Include outline points at z=0 to extend silhouette to lateral edges
  const outline = _morphTopOutline(p, 200);
  for (const [x, y] of outline) {
    if (y > 0) {
      xs.push(x); zs.push(0);
    }
  }
  const [pa, pb] = _morphEnvelope(xs, zs, 70);    // wider bins → fewer empty bins
  // Dorsal up in plot → flip Z to screen y
  const d = _morphPolyToSvgPath(pa, pb, (a, b) => _morphScreen(a, b));
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-front">
    <path d="${d}" fill="#c9b380" fill-opacity="0.35" stroke="black" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="${(MORPH_CX - 90).toFixed(1)}" y1="${MORPH_CY}" x2="${(MORPH_CX + 90).toFixed(1)}" y2="${MORPH_CY}" stroke="#888" stroke-width="0.8" stroke-dasharray="3,2"/>
  </svg>`;
}

// ---------- ANALYTICAL SIDE VIEW ----------
function svgAnalyticalSide(p) {
  const { X, Y, Zd, Zv } = _morphSurface(p);
  const ys = [], zs = [];
  for (let i = 0; i < Y.length; i++) {
    ys.push(Y[i]); zs.push(Zd[i]);
    ys.push(Y[i]); zs.push(Zv[i]);
  }
  const outline = _morphTopOutline(p, 200);
  for (const [, y] of outline) {
    ys.push(y); zs.push(0);
  }
  const [pa, pb] = _morphEnvelope(ys, zs, 90);
  // SIDE: beak/umbo on left → flip Y to map -0.5 at left, +0.5 at right
  const d = _morphPolyToSvgPath(pa, pb, (a, b) => _morphScreen(-a, b));
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-side">
    <path d="${d}" fill="#c9b380" fill-opacity="0.35" stroke="black" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="${(MORPH_CX - 90).toFixed(1)}" y1="${MORPH_CY}" x2="${(MORPH_CX + 90).toFixed(1)}" y2="${MORPH_CY}" stroke="#888" stroke-width="0.8" stroke-dasharray="3,2"/>
  </svg>`;
}

// Shape sliders: discrete preset stops, one choice active at a time.
function buildShapeSliders() {
  return [
    { qid: "outline_pick", label: "Outline",
      stops: [
        { value: "wing-shaped",   short: "Winged" },
        { value: "conical",       short: "Cone" },
        { value: "subcircular",   short: "Round" },
        { value: "pentagonal",    short: "Pentag" },
        { value: "elongate-oval", short: "Elongate" }
      ] },
    { qid: "profile_pick", label: "Profile",
      stops: [
        { value: "biconvex",       short: "Biconvex" },
        { value: "plano-convex",   short: "Plano" },
        { value: "concavo-convex", short: "Concavo" }
      ] },
    { qid: "hinge_pick", label: "Hinge",
      stops: [
        { value: "wide-strophic",   short: "Wide" },
        { value: "narrow-strophic", short: "Short" },
        { value: "astrophic",       short: "Curved" }
      ] },
    { qid: "fold_pick", label: "Fold",
      stops: [
        { value: "none",   short: "None" },
        { value: "weak",   short: "Weak" },
        { value: "strong", short: "Strong" }
      ] },
    { qid: "beak_pick", label: "Beak",
      stops: [
        { value: "subdued",   short: "Low" },
        { value: "moderate",  short: "Mid" },
        { value: "prominent", short: "Tall" },
        { value: "pyramidal", short: "Pyr" }
      ] },
    { qid: "lateral_pick", label: "Lateral",
      stops: [
        { value: "smooth",     short: "Smooth" },
        { value: "geniculate", short: "Genic" },
        { value: "resupinate", short: "Resup" }
      ] }
  ];
}

// Surface toggles: each feature is independently on/off (multiple can stack).
function buildSurfaceToggles() {
  return [
    { qid: "surface_lines",  label: "Growth lines" },
    { qid: "surface_ribs",   label: "Radial ribs" },
    { qid: "surface_frills", label: "Frills" },
    { qid: "surface_spines", label: "Spines / bumps" }
  ];
}

function buildDensitySlider() {
  return {
    qid: "rib_density", label: "Rib density",
    stops: [
      { value: "sparse", short: "Sparse" },
      { value: "medium", short: "Med" },
      { value: "dense",  short: "Dense" }
    ]
  };
}

function viewBuild(sid, answers) {
  const shapeSliders = buildShapeSliders();
  const surfaceToggles = buildSurfaceToggles();
  const densitySlider = buildDensitySlider();

  const setLink = (qid, value) => {
    const next = Object.assign({}, answers, { [qid]: value });
    return `${siteBase(sid)}/build?${encodeAnswers(next)}`;
  };
  // Toggle link: tap an off chip → ?qid=yes; tap an on chip → drop qid
  const toggleLink = (qid) => {
    const next = Object.assign({}, answers);
    if (answers[qid] === "yes") delete next[qid];
    else next[qid] = "yes";
    return `${siteBase(sid)}/build?${encodeAnswers(next)}`;
  };

  // Live candidate count
  const brachF = brachFaunaForSite(sid);
  const allTaxa = brachF.subgroups.flatMap(s => s.taxa);
  const matchingCount = allTaxa.filter(t => taxonMatches(t, answers)).length;
  const totalCount = allTaxa.length;

  // Tri-view SVGs — always categorical PARAM. The earlier auto-swap
  // to fitted shape (when narrowed to a fitted taxon) was reverted:
  // the fitted shapes are based on stand-in taxa from the morphospace
  // pipeline and produce smooth bulk silhouettes that lose all
  // diagnostic features (e.g., wing-spiriferid fitted = near-circle,
  // losing the diamond character). High IoU but visually misleading.
  // Categorical PARAM is the pedagogically right primary.
  const topSvg   = svgTopView(answers);
  const frontSvg = svgFrontView(answers);
  const sideSvg  = svgSideView(answers);

  const sliderRow = (s) => el("div", { class: "slider-row" }, [
    el("label", { class: "slider-label" }, s.label),
    el("div", { class: "slider-track" },
      s.stops.map(stop => el("a", {
        class: "slider-stop" + (answers[s.qid] === stop.value ? " active" : ""),
        href: setLink(s.qid, stop.value)
      }, stop.short))
    )
  ]);

  const ribsOn = featuresFromAnswers(answers).ribs;
  const haveAny = shapeSliders.some(s => answers[s.qid]) ||
                  surfaceToggles.some(t => answers[t.qid] === "yes");
  const resetHref = `${siteBase(sid)}/build`;
  const resultsHref = `${siteBase(sid)}/filter/results?${encodeAnswers(answers)}`;

  return el("div", { class: "view" }, [
    topBar({ title: "Build a brachiopod", sid }),
    siteSubBar(sid),
    el("main", { class: "page build-page" }, [
      el("p", { class: "build-intro" },
        "Move the sliders to shape the silhouette. The brachiopod above updates live, and the count of matching species shrinks as you add detail."),
      el("div", { class: "build-tri-wrap" }, [
        el("figure", { class: "build-tri" }, [
          el("div", { class: "tri-svg", html: topSvg }),
          el("figcaption", {}, "Top")
        ]),
        el("figure", { class: "build-tri" }, [
          el("div", { class: "tri-svg", html: frontSvg }),
          el("figcaption", {}, "Front")
        ]),
        el("figure", { class: "build-tri" }, [
          el("div", { class: "tri-svg", html: sideSvg }),
          el("figcaption", {}, "Side")
        ])
      ]),
      el("div", { class: "build-status" }, [
        el("strong", {}, `${matchingCount}`),
        ` of ${totalCount} brachiopod taxa match — `,
        el("a", { href: resultsHref, class: "build-status-link" }, "see candidates →")
      ]),
      // Shape sliders (one choice active at a time per slider)
      el("h3", { class: "build-section-h" }, "Shape"),
      el("div", { class: "build-sliders" }, shapeSliders.map(sliderRow)),
      // Surface toggles (independently on/off; multiple stack)
      el("h3", { class: "build-section-h" }, "Surface — tap any to add or remove"),
      el("div", { class: "surface-toggle-row" },
        surfaceToggles.map(t => el("a", {
          class: "surface-toggle" + (answers[t.qid] === "yes" ? " active" : ""),
          href: toggleLink(t.qid)
        }, t.label))
      ),
      // Rib density (visual-only; affects rendering when ribs are on)
      ribsOn ? sliderRow(densitySlider) : null,
      el("div", { class: "key-footer" }, [
        haveAny ? el("a", { class: "restart-link", href: resetHref }, "Reset all sliders") : null,
        el("a", { class: "restart-link", href: `${siteBase(sid)}/filter` }, "Use the question wizard instead"),
        el("a", { class: "restart-link", href: `${siteBase(sid)}/calibrate` }, "Calibrate vs real specimens →")
      ])
    ])
  ]);
}

// ---------- Calibration view: parametric SVG vs real specimens ----------
function viewCalibrate(sid) {
  const SPECIES = [
    { name: "Pseudoatrypa devoniana",
      blurb: "Atrypid: subcircular, dorsibiconvex, astrophic, subdued beak, many fine ribs with concentric frills, broad anterior fold.",
      answers: {
        outline_pick: "subcircular", profile_pick: "biconvex",
        hinge_pick: "astrophic", surface_ribs: "yes",
        surface_frills: "yes", rib_density: "dense", fold_pick: "strong",
        beak_pick: "subdued", lateral_pick: "smooth"
      },
      images: [
        "pseudoatrypa/rockford/devoniana_nathan_01.jpg",
        "pseudoatrypa/rockford/devoniana_dave_01.jpg",
        "pseudoatrypa/rockford/devoniana_daycopper_01.png"
      ] },
    { name: "Cyrtospirifer whitneyi",
      blurb: "Spiriferid: wing-shaped (alate), biconvex, wide strophic hinge with a prominent interarea, many fine radial ribs, deep fold + sulcus.",
      answers: {
        outline_pick: "wing-shaped", profile_pick: "biconvex",
        hinge_pick: "wide-strophic", surface_ribs: "yes",
        rib_density: "dense", fold_pick: "strong",
        beak_pick: "prominent", lateral_pick: "smooth"
      },
      images: [
        "cyrtospirifer/rockford/whitneyi_nathan_01.jpg",
        "cyrtospirifer/rockford/whitneyi_dave_01.jpg",
        "cyrtospirifer/rockford/whitneyi_jsm_01.png"
      ] },
    { name: "Schizophoria iowensis",
      blurb: "Orthid: subcircular, biconvex, narrow strophic hinge, moderate beak, many fine costellae, subtle fold + sulcus.",
      answers: {
        outline_pick: "subcircular", profile_pick: "biconvex",
        hinge_pick: "narrow-strophic", surface_ribs: "yes",
        rib_density: "dense", fold_pick: "weak",
        beak_pick: "moderate", lateral_pick: "smooth"
      },
      images: [
        "schizophoria/rockford/iowensis_nathan_01.jpg",
        "schizophoria/rockford/iowensis_dave_01.jpg",
        "schizophoria/rockford/iowensis_stigallrode_01.png"
      ] }
  ];

  const sections = SPECIES.map(sp => el("section", { class: "calibrate-section" }, [
    el("h2", { class: "calibrate-h" }, [
      el("em", {}, sp.name.split(" ")[0]),
      " ",
      sp.name.split(" ").slice(1).join(" ")
    ]),
    el("p", { class: "page-blurb" }, sp.blurb),
    el("h3", { class: "calibrate-row-h" }, "Parametric outlines"),
    el("div", { class: "build-tri-wrap" }, [
      el("figure", { class: "build-tri" }, [
        el("div", { class: "tri-svg", html: svgTopView(sp.answers) }),
        el("figcaption", {}, "Top")
      ]),
      el("figure", { class: "build-tri" }, [
        el("div", { class: "tri-svg", html: svgFrontView(sp.answers) }),
        el("figcaption", {}, "Front")
      ]),
      el("figure", { class: "build-tri" }, [
        el("div", { class: "tri-svg", html: svgSideView(sp.answers) }),
        el("figcaption", {}, "Side")
      ])
    ]),
    el("h3", { class: "calibrate-row-h" }, "Real specimens"),
    el("div", { class: "calibrate-images" },
      sp.images.map(img =>
        el("img", { src: `images/${img}`, alt: sp.name, loading: "lazy", class: "calibrate-photo" })
      )
    )
  ]));

  return el("div", { class: "view" }, [
    topBar({ title: "Calibration", sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, "Parametric vs real — calibration"),
      el("p", { class: "page-blurb" },
        "Two well-imaged Rockford brachiopods, with their parametric tri-view rendered from fixed slider settings next to real photos. Use this to spot where the parametric model is misaligned with the actual morphology."),
      ...sections,
      el("p", { class: "more-link" },
        el("a", { href: `${siteBase(sid)}/build` }, "← Back to build view"))
    ])
  ]);
}

// ---------- Morphospace view: analytical (fitted-from-3D) silhouettes ----------
//
// Every taxon with a `shape: {...}` field in the manifest carries a
// parameter tuple fitted by data/fit_harness/fit.py against a
// photogrammetry mesh. This view renders the analytical silhouettes
// (TOP / FRONT / SIDE) for every such taxon, alongside the parametric
// silhouettes from the categorical trait sliders, alongside the first
// available real specimen photo. Useful for spotting where the analytical
// fit improves on (or diverges from) the parametric model.
function viewMorphospace(sid) {
  const fauna = faunaForSite(sid);
  // Collect all taxa with a `shape` field
  const shaped = [];
  for (const group of fauna) {
    for (const sub of group.subgroups) {
      for (const taxon of sub.taxa) {
        if (taxon.shape) shaped.push({ group, sub, taxon });
      }
    }
  }
  if (shaped.length === 0) {
    return el("div", { class: "view" }, [
      topBar({ title: "Morphospace", sid }),
      siteSubBar(sid),
      el("main", { class: "page" }, [
        el("h2", { class: "page-title" }, "Morphospace"),
        el("p", {}, "No taxa at this site have fitted shape parameters yet.")
      ])
    ]);
  }

  // Build a parametric `answers` object from each taxon's traits so we can
  // render the parametric view alongside the analytical one. This is a
  // best-effort mapping — categorical traits → slider values.
  function answersFor(taxon) {
    const t = taxon.traits || {};
    const ans = {};
    if (Array.isArray(t.outline) ? t.outline.includes("wing-shaped") : t.outline === "wing-shaped") ans.outline_pick = "wing-shaped";
    else if (t.outline === "conical") ans.outline_pick = "conical";
    else if (t.outline === "pentagonal") ans.outline_pick = "pentagonal";
    else if (t.outline === "elongate-oval") ans.outline_pick = "elongate-oval";
    else ans.outline_pick = "subcircular";
    if (t.profile === "concavo-convex") ans.profile_pick = "concavo-convex";
    else if (t.profile === "plano-convex") ans.profile_pick = "plano-convex";
    else ans.profile_pick = "biconvex";
    if (Array.isArray(t.hinge) ? t.hinge.includes("strophic") : t.hinge === "strophic") {
      ans.hinge_pick = (t.outline === "wing-shaped" || t.outline === "conical") ? "wide-strophic" : "narrow-strophic";
    } else {
      ans.hinge_pick = "astrophic";
    }
    const fold = Array.isArray(t.fold_sulcus) ? t.fold_sulcus[0] : t.fold_sulcus;
    ans.fold_pick = fold === "strong" ? "strong" : fold === "weak" ? "weak" : "none";
    // interarea_form drives beak_pick — pyramidal interarea = tall back wall
    if (t.interarea_form === "pyramidal") ans.beak_pick = "pyramidal";
    else if (t.interarea_form === "low") ans.beak_pick = "moderate";
    else if (t.interarea_form === "absent") ans.beak_pick = "moderate";
    if (t.surface_ribs === "yes") { ans.surface_ribs = "yes"; ans.rib_density = "dense"; }
    if (t.surface_frills === "yes") ans.surface_frills = "yes";
    if (t.surface_spines === "yes") ans.surface_spines = "yes";
    return ans;
  }

  const sections = shaped.map(({ group, sub, taxon }) => {
    const photo = (taxon.images && taxon.images[0])
      ? imgPath(taxon, taxon.images[0], sid) : null;
    const ans = answersFor(taxon);
    return el("section", { class: "calibrate-section" }, [
      el("h2", { class: "calibrate-h" }, [
        el("em", {}, taxon.genus), " ", taxon.species
      ]),
      el("p", { class: "page-blurb" },
        `Fitted from 3-D photogrammetry. ${sub.title}.`),
      // MESH OVERLAY — the primary diagnostic. Mesh silhouette is the
      // filled gray polygon; the analytical model fit is the red dashed
      // outline overlaid on top. Where the red leaves the gray, the
      // model fails to capture the actual shape.
      taxon.shape && taxon.shape.overlay
        ? el("div", {}, [
            el("h3", { class: "calibrate-row-h" },
              "Model vs 3-D mesh (red dashed = analytical model; gray = mesh)"),
            el("img", { src: taxon.shape.overlay,
                         alt: `${taxon.genus} ${taxon.species} model overlay`,
                         loading: "lazy",
                         style: "width:100%; max-width:780px; display:block; margin: 0 auto;" })
          ])
        : null,
      el("h3", { class: "calibrate-row-h" }, "Parametric (categorical traits)"),
      el("div", { class: "build-tri-wrap" }, [
        el("figure", { class: "build-tri" }, [
          el("div", { class: "tri-svg", html: svgTopView(ans) }),
          el("figcaption", {}, "Top")
        ]),
        el("figure", { class: "build-tri" }, [
          el("div", { class: "tri-svg", html: svgFrontView(ans) }),
          el("figcaption", {}, "Front")
        ]),
        el("figure", { class: "build-tri" }, [
          el("div", { class: "tri-svg", html: svgSideView(ans) }),
          el("figcaption", {}, "Side")
        ])
      ]),
      photo
        ? el("div", {}, [
            el("h3", { class: "calibrate-row-h" }, "Real specimen"),
            el("div", { class: "calibrate-images" },
              [el("img", { src: photo, alt: `${taxon.genus} ${taxon.species}`,
                            loading: "lazy", class: "calibrate-photo" })])
          ])
        : null
    ]);
  });

  return el("div", { class: "view" }, [
    topBar({ title: "Morphospace", sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, "Morphospace — fitted analytical shapes"),
      el("p", { class: "page-blurb" },
        "Each taxon below has a parameter tuple fitted to a 3-D photogrammetric mesh from the Digital Atlas of Ancient Life. The model-vs-mesh overlay is the diagnostic: gray fill = actual mesh silhouette, red dashed outline = analytical model fit. Wherever the red dashed line leaves the gray area, the analytical model fails to capture that part of the real shell. The parametric row below shows what the categorical-trait sliders produce for the same taxon. See data/fit_harness/README.md for the fit methodology."),
      ...sections,
      el("p", { class: "more-link" },
        el("a", { href: `${siteBase(sid)}/calibrate` }, "← Calibration view"))
    ])
  ]);
}

function viewJump(sid) {
  const fauna = faunaForSite(sid);
  const sections = fauna.map(group =>
    el("section", { class: "result-section" }, [
      el("h3", {}, group.title),
      el("div", { class: "subgroup-grid" }, group.subgroups.map(s => subgroupCard(group, s, sid)))
    ])
  );
  return el("div", { class: "view" }, [
    topBar({ title: "Jump to group", sid }),
    siteSubBar(sid),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, "Jump to a known group"),
      pageBlurb("Tap the group your fossil belongs to."),
      ...sections
    ])
  ]);
}

function viewReferences() {
  const figures = Object.entries(FIGURES).map(([k, f]) =>
    el("figure", { class: "ref-figure", id: `fig-${k}` }, [
      el("a", { href: refPath(f.file), target: "_blank", rel: "noopener" }, [
        el("img", { src: refPath(f.file), alt: f.caption, loading: "lazy" })
      ]),
      el("figcaption", {}, f.caption)
    ])
  );
  return el("div", { class: "view" }, [
    topBar({ title: "Reference figures", back: true, home: true }),
    el("main", { class: "page" }, [
      el("h2", { class: "page-title" }, "Reference figures"),
      pageBlurb("Diagrams by Page Quinton & Michael Rygel (CC BY). Tap any figure for a closer look in a new tab."),
      el("div", { class: "ref-grid" }, figures),
      el("p", { class: "credits-note" }, [
        "Further reading: ",
        el("a", { href: "https://www.geological-digressions.com/brachiopod-morphology-for-sedimentologists/", target: "_blank", rel: "noopener" },
          "Geological Digressions — Brachiopod morphology for sedimentologists"),
        " is an excellent text-and-image companion to these diagrams."
      ])
    ])
  ]);
}

function viewAll(sid) {
  const fauna = faunaForSite(sid);
  const sections = fauna.map(group => {
    const subs = group.subgroups.map(sub => el("section", { class: "subgroup", id: `sub-${sub.id}` }, [
      el("h3", {}, sub.title),
      sub.blurb ? el("p", { class: "subgroup-blurb" }, sub.blurb) : null,
      el("div", { class: "taxa-grid all-grid" }, sub.taxa.map(t => el("article", { class: "taxon-card" }, [
        el("h4", { class: "taxon-name" }, [
          el("em", {}, t.genus), " ", t.species
        ]),
        t.images && t.images.length
          ? el("div", { class: "taxon-imgs" }, t.images.map(img => el("figure", { class: "taxon-img" }, [
              el("img", { src: imgPath(t, img, sid), alt: `${t.genus} ${t.species}`, loading: "lazy" }),
              el("figcaption", {}, srcLabel(img.src))
            ])))
          : el("p", { class: "no-photo-inline" }, "(photo wanted)"),
        t.note ? el("p", { class: "taxon-note" }, t.note) : null
      ])))
    ]));
    return el("section", { class: "section", id: `sec-${group.id}` }, [
      el("h2", {}, group.title),
      group.blurb ? el("p", { class: "section-blurb" }, group.blurb) : null,
      ...subs
    ]);
  });
  const creditItems = Object.entries(SOURCES)
    .filter(([k]) => k !== "unk")
    .map(([_, s]) => el("li", {}, s.url
      ? el("a", { href: s.url, target: "_blank", rel: "noopener" }, s.label)
      : s.label));
  return el("div", { class: "view view-all" }, [
    topBar({ title: "Full guide", sid }),
    el("main", { class: "page page-all" }, [
      el("p", { class: "print-hint screen-only" }, "Use your browser's Print → Save as PDF to make a carry-along copy."),
      ...sections,
      el("section", { class: "credits" }, [
        el("h2", {}, "Image credits"),
        el("ul", {}, creditItems),
        el("p", {}, [
          "Reference diagrams: Page Quinton & Michael Rygel (CC BY). Brachiopod morphology text & figures inspired in part by ",
          el("a", { href: "https://www.geological-digressions.com/brachiopod-morphology-for-sedimentologists/", target: "_blank", rel: "noopener" },
            "Geological Digressions — Brachiopod morphology for sedimentologists"),
          "."
        ])
      ])
    ])
  ]);
}

function viewNotFound() {
  return el("div", { class: "view" }, [
    topBar({ title: "Not found" }),
    el("main", { class: "page" }, [
      el("h2", {}, "Page not found"),
      el("p", {}, "That route doesn't match anything in the guide."),
      el("p", {}, el("a", { href: "#/" }, "← Go home"))
    ])
  ]);
}

// ---------- Router ----------
function parseHash() {
  let raw = location.hash.replace(/^#\/?/, "");
  let query = "";
  const qIdx = raw.indexOf("?");
  if (qIdx >= 0) { query = raw.slice(qIdx + 1); raw = raw.slice(0, qIdx); }
  const parts = raw.split("/").filter(Boolean).map(decodeURIComponent);
  parts.__query = query;
  return parts;
}

function route() {
  const root = document.getElementById("app");
  clear(root);
  const p = parseHash();
  let view;
  if (p.length === 0)                       view = viewSitePicker();
  else if (p[0] === "references")           view = viewReferences();
  else if (p[0] === "site" && p[1]) {
    const sid = p[1];
    if (!getSite(sid))                      view = viewNotFound();
    else if (p.length === 2)                view = viewSiteLanding(sid);
    else if (p[2] === "atlas")              view = viewAtlas(sid);
    else if (p[2] === "browse")             view = viewBrowse(sid);
    else if (p[2] === "group")              view = viewGroup(sid, p[3]);
    else if (p[2] === "sub")                view = viewSubgroup(sid, p[3], p[4]);
    else if (p[2] === "taxon")              view = viewTaxon(sid, p[3]);
    else if (p[2] === "key" && p[3] === "result") view = viewKeyResult(sid, p[4]);
    else if (p[2] === "key")                view = viewKey(sid, p[3]);
    else if (p[2] === "jump")               view = viewJump(sid);
    else if (p[2] === "filter" && p[3] === "results") view = viewFilterResults(sid, parseAnswers(p.__query));
    else if (p[2] === "filter")             view = viewFilter(sid, parseAnswers(p.__query));
    else if (p[2] === "build")              view = viewBuild(sid, parseAnswers(p.__query));
    else if (p[2] === "calibrate")          view = viewCalibrate(sid);
    else if (p[2] === "morphospace")        view = viewMorphospace(sid);
    else if (p[2] === "all")                view = viewAll(sid);
    else                                     view = viewNotFound();
  }
  else                                       view = viewNotFound();
  root.appendChild(view);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
