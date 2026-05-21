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
    el("a", { class: "sitebar-switch", href: "#/" }, "Change site →")
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
  // If only one site, redirect there.
  if (SITES.length === 1) {
    location.hash = siteBase(SITES[0].id);
    return el("div");
  }
  return el("div", { class: "view view-landing" }, [
    el("header", { class: "hero" }, [
      el("h1", {}, "Field Fossil Guide"),
      el("p", { class: "hero-sub" }, "Choose a locality to begin.")
    ]),
    el("nav", { class: "landing-actions" },
      SITES.map(s => el("a", { class: "big-action", href: siteBase(s.id) }, [
        el("span", { class: "ba-title" }, s.title),
        el("span", { class: "ba-sub" }, [s.subtitle, " — ", s.formation].filter(Boolean).join(""))
      ]))
    ),
    el("nav", { class: "landing-actions secondary" }, [
      el("a", { class: "big-action", href: "#/references" }, [
        el("span", { class: "ba-title" }, "Reference figures"),
        el("span", { class: "ba-sub" }, "Site-independent diagrams of symmetry, hinge types, shell convexity, group overviews.")
      ])
    ])
  ]);
}

function viewSiteLanding(sid) {
  const site = getSite(sid);
  if (!site) return viewNotFound();
  return el("div", { class: "view view-landing" }, [
    el("header", { class: "hero" }, [
      el("h1", {}, `Guide to ${site.title.split(" (")[0]} Fossils`),
      el("p", { class: "hero-sub" }, site.subtitle + " — " + (site.formation || site.location || "")),
      site.blurb ? el("p", { class: "hero-blurb" }, site.blurb) : null,
      SITES.length > 1
        ? el("p", { class: "hero-change" }, el("a", { href: "#/" }, "Change site →"))
        : null
    ]),
    el("nav", { class: "landing-actions" }, [
      el("a", { class: "big-action primary", href: `${siteBase(sid)}/key` }, [
        el("span", { class: "ba-title" }, "Help me ID it"),
        el("span", { class: "ba-sub" }, "Answer a few yes/no questions to narrow down what you found.")
      ]),
      el("a", { class: "big-action", href: `${siteBase(sid)}/build` }, [
        el("span", { class: "ba-title" }, "Build a brachiopod (visual)"),
        el("span", { class: "ba-sub" }, "Move sliders to shape a silhouette live; the matching-species count updates as you go. Brachiopods only.")
      ]),
      el("a", { class: "big-action", href: `${siteBase(sid)}/calibrate` }, [
        el("span", { class: "ba-title" }, "Calibration: parametric vs real"),
        el("span", { class: "ba-sub" }, "Side-by-side comparison of the build-view silhouettes against real specimen photos for Pseudoatrypa devoniana and Cyrtospirifer whitneyi. Diagnostic for spotting mismatches.")
      ]),
      el("a", { class: "big-action", href: `${siteBase(sid)}/jump` }, [
        el("span", { class: "ba-title" }, "I already know the group"),
        el("span", { class: "ba-sub" }, "Skip the key and jump straight to spiriferids, atrypids, gastropods, etc.")
      ]),
      el("a", { class: "big-action", href: `${siteBase(sid)}/browse` }, [
        el("span", { class: "ba-title" }, "Browse by group"),
        el("span", { class: "ba-sub" }, "Tap through brachiopods, corals, mollusks, and more.")
      ]),
      el("a", { class: "big-action", href: "#/references" }, [
        el("span", { class: "ba-title" }, "Reference figures"),
        el("span", { class: "ba-sub" }, "Diagrams of symmetry, hinge types, shell convexity, and group overviews.")
      ]),
      el("a", { class: "big-action", href: `${siteBase(sid)}/all` }, [
        el("span", { class: "ba-title" }, "Full guide (printable)"),
        el("span", { class: "ba-sub" }, "Everything on one page — best for Print → Save as PDF.")
      ])
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

// ---------- Build view: dynamic SVG + sliders ----------
//
// One top-down brachiopod silhouette synthesized live from the student's
// slider choices. Each slider has discrete preset stops (so it filters
// cleanly) but visually feels like a slider.

// =================================================================
// Tri-view silhouette synthesizer
// Top / Front / Side composed live from slider answers.
// Coords share viewBox 200x180 so the three SVGs line up visually.
// =================================================================

// ---------- TOP VIEW (dorsal) ----------
// Smooth bezier outline with a small umbo bump at top center.
// Parameters affecting top view: outline, hinge, surface, fold.
// =================================================================
// Parametric morphospace model
// =================================================================
// answersToShape(answers) returns a unified shape parameter object.
// Top / Front / Side views are all computed from this object so the
// outline, surface, and fold stay coherent across views.
//
// Ribs perturb the *actual perimeter* (not just interior overlay lines),
// the fold pulls the front commissure inward in all three views, and
// the side view shows real anatomy (beak, hinge line, dorsal+ventral
// curvature, commissure undulations from the fold).

// Each rib density preset = {count, amp}. "few big" = sparse high-amp;
// "many small" = dense low-amp. Total visual undulation roughly constant.
const RIB_SETTINGS = {
  sparse: { count: 6,  amp: 3.2 },   // few, big
  medium: { count: 12, amp: 2.0 },
  dense:  { count: 22, amp: 1.1 }    // many, small
};

function answersToShape(answers) {
  const features = featuresFromAnswers(answers);
  const o = answers.outline_pick || "subcircular";
  const p = answers.profile_pick || "biconvex";
  const h = answers.hinge_pick || "astrophic";
  const f = answers.fold_pick || "none";
  return {
    halfWidth:  o === "wing-shaped" ? 92 : o === "elongate-oval" ? 52 : 72,
    halfLength: o === "elongate-oval" ? 84 : 70,
    hingeFrac:  h === "wide-strophic" ? 0.92 : h === "narrow-strophic" ? 0.32 : 0,
    beakProm:   h === "astrophic" ? 9 : 4,
    dorsalConv:  p === "concavo-convex" ? 46 : p === "plano-convex" ? 52 : 38,
    ventralConv: p === "concavo-convex" ? -22 : p === "plano-convex" ? 0 : 38,
    foldStr:    f === "strong" ? 1 : f === "weak" ? 0.4 : 0,
    ribCount:   features.ribs ? (RIB_SETTINGS[features.density] || RIB_SETTINGS.medium).count : 0,
    ribAmp:     features.ribs ? (RIB_SETTINGS[features.density] || RIB_SETTINGS.medium).amp   : 0,
    hasFrills:  features.frills,
    hasSpines:  features.spines,
    hasGrowthLines: features.lines
  };
}

function pointsToPath(pts, close = true) {
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  }
  return close ? d + " Z" : d;
}

// ---------- TOP VIEW ----------
function topOutlinePoints(s) {
  const cx = 100, cy = 102;
  const N = 96;
  const pts = [];
  const hingeY = cy - s.halfLength + 8;

  for (let i = 0; i < N; i++) {
    const theta = (i / N) * 2 * Math.PI;     // 0=top, π=front
    const a = s.halfWidth, b = s.halfLength;
    let x = cx + a * Math.sin(theta);
    let y = cy - b * Math.cos(theta);

    // Hinge straightening
    if (s.hingeFrac > 0.05) {
      const topness = Math.max(0, Math.cos(theta));
      const flatness = topness ** 2.3;
      const hingeHalfW = a * s.hingeFrac;
      const baseTX = a * Math.sin(theta);
      const tx = Math.max(-hingeHalfW, Math.min(hingeHalfW, baseTX));
      x = x * (1 - flatness) + (cx + tx) * flatness;
      y = y * (1 - flatness) + hingeY * flatness;
    }

    // Rib perimeter bumps (max at front, zero at beak)
    if (s.ribCount > 0) {
      const ribness = Math.sin(theta / 2) ** 2;
      const ribPhase = theta * s.ribCount;
      const nx = Math.sin(theta), ny = -Math.cos(theta);
      const bump = s.ribAmp * ribness * Math.sin(ribPhase);
      x += nx * bump; y += ny * bump;
    }

    // Fold: front sulcus pulled inward, flanks pushed outward
    if (s.foldStr > 0) {
      const dt = theta - Math.PI;
      const range = 0.7;
      if (Math.abs(dt) < range) {
        const w = 1 - Math.abs(dt) / range;
        const nx = Math.sin(theta), ny = -Math.cos(theta);
        const offset = Math.abs(dt) < 0.22
          ? -s.foldStr * 8 * w
          :  s.foldStr * 2.5 * w;
        x += nx * offset; y += ny * offset;
      }
    }

    pts.push([x, y]);
  }

  // Beak prominence: nudge the top-center point upward
  if (s.beakProm > 0) pts[0] = [pts[0][0], pts[0][1] - s.beakProm];
  return pts;
}

function topRibInteriorLines(s) {
  if (s.ribCount === 0) return "";
  let out = "";
  // Lines from beak fanning to front+lateral commissure
  const cx = 100, cy = 102;
  const beakX = cx, beakY = cy - s.halfLength + 14;
  for (let i = 0; i < s.ribCount; i++) {
    const t = (i + 0.5) / s.ribCount;
    const theta = Math.PI * (0.18 + t * 0.64);  // 0.18π..0.82π
    const ex = cx + s.halfWidth * 0.92 * Math.sin(theta);
    const ey = cy - s.halfLength * 0.92 * Math.cos(theta);
    out += `<path d="M ${beakX},${beakY.toFixed(1)} Q ${((beakX + ex)/2).toFixed(1)},${((beakY + ey)/2 - 5).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="#555" stroke-width="0.7"/>`;
  }
  // Mirror to left side
  for (let i = 0; i < s.ribCount; i++) {
    const t = (i + 0.5) / s.ribCount;
    const theta = Math.PI * (0.18 + t * 0.64);
    const ex = cx - s.halfWidth * 0.92 * Math.sin(theta);
    const ey = cy - s.halfLength * 0.92 * Math.cos(theta);
    out += `<path d="M ${beakX},${beakY.toFixed(1)} Q ${((beakX + ex)/2).toFixed(1)},${((beakY + ey)/2 - 5).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="#555" stroke-width="0.7"/>`;
  }
  return out;
}

function topGrowthLines(s) {
  // Concentric arcs centered above the front (near beak's anterior trajectory),
  // each one paralleling the perimeter at a deeper position. Real growth lines
  // wrap around the umbo.
  const cx = 100, cy = 102;
  const beakY = cy - s.halfLength + 12;
  const out = [];
  for (let k = 1; k <= 4; k++) {
    const f = 0.28 + k * 0.18;
    const rx = s.halfWidth * f;
    const ry = s.halfLength * f * 0.95;
    out.push(`<path d="M ${(cx - rx).toFixed(1)},${(beakY + ry * 0.4).toFixed(1)} Q ${cx},${(beakY + ry * 1.1).toFixed(1)} ${(cx + rx).toFixed(1)},${(beakY + ry * 0.4).toFixed(1)}" fill="none" stroke="#666" stroke-width="0.85"/>`);
  }
  return out.join("");
}

function topSpines(s) {
  // Golden-angle scatter inside the outline (sunflower-like natural distribution).
  const cx = 100, cy = 102;
  let out = "";
  const N = 32;
  for (let i = 0; i < N; i++) {
    const a = i * 137.5 * Math.PI / 180;     // golden angle
    const r = Math.sqrt((i + 0.5) / N) * 0.82;
    const x = cx + r * Math.cos(a) * s.halfWidth;
    const y = cy + r * Math.sin(a) * s.halfLength;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.9" fill="#333"/>`;
  }
  // Protruding spines from a few perimeter positions
  for (let i = 0; i < 5; i++) {
    const theta = Math.PI * (0.3 + i * 0.35);
    const x1 = cx + s.halfWidth * 0.86 * Math.sin(theta);
    const y1 = cy - s.halfLength * 0.86 * Math.cos(theta);
    const x2 = cx + s.halfWidth * 1.02 * Math.sin(theta);
    const y2 = cy - s.halfLength * 1.02 * Math.cos(theta);
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#222" stroke-width="1.3"/>`;
  }
  return out;
}


function svgTopView(answers) {
  const s = answersToShape(answers);
  const pts = topOutlinePoints(s);
  const outlinePath = pointsToPath(pts);
  const clipId = "brachTopClip";
  let inner = "";
  if (s.hasGrowthLines) inner += topGrowthLines(s);
  if (s.ribCount > 0)   inner += topRibInteriorLines(s);
  if (s.hasSpines)      inner += topSpines(s);
  if (s.foldStr > 0) {
    const beakY = 102 - s.halfLength + 14;
    const frontY = 102 + s.halfLength - 8;
    inner += `<line x1="100" y1="${beakY.toFixed(1)}" x2="100" y2="${frontY.toFixed(1)}" stroke="black" stroke-width="${(s.foldStr * 1.8 + 0.8).toFixed(1)}" opacity="${(0.4 + s.foldStr * 0.5).toFixed(2)}"/>`;
  }
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-top">
    <defs><clipPath id="${clipId}"><path d="${outlinePath}"/></clipPath></defs>
    <path d="${outlinePath}" fill="#fffef7" stroke="black" stroke-width="2.4" stroke-linejoin="round"/>
    <g clip-path="url(#${clipId})">${inner}</g>
  </svg>`;
}

// ---------- FRONT VIEW ----------
function frontEdgePoints(s, isTop) {
  const cx = 100, cy = 100;
  const halfW = s.halfWidth;
  const conv = isTop ? s.dorsalConv : s.ventralConv;
  const sign = isTop ? -1 : 1;
  const N = 64;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = cx + (t - 0.5) * 2 * halfW;
    const rc = Math.abs(t - 0.5) * 2;
    let y = cy + sign * conv * (1 - rc ** 2);
    if (s.ribCount > 0) {
      const ribness = Math.cos((t - 0.5) * Math.PI) ** 2;
      y += sign * s.ribAmp * ribness * Math.sin(t * s.ribCount * Math.PI);
    }
    if (s.foldStr > 0) {
      const cn = Math.max(0, 1 - Math.abs(t - 0.5) * 5);
      if (isTop) y -= s.foldStr * 10 * cn;
      else       y += s.foldStr * 10 * cn;
    }
    pts.push([x, y]);
  }
  return pts;
}

function frontGrowthLines(s) {
  // Horizontal-ish arcs nested on the dorsal apex (upper half) and ventral apex (lower).
  const cx = 100, cy = 100;
  let out = "";
  for (let k = 1; k <= 3; k++) {
    const f = 0.3 + k * 0.18;
    const w = s.halfWidth * 0.85 * f;
    const dY = cy - s.dorsalConv * f * 0.6;
    out += `<path d="M ${(cx - w).toFixed(1)},${(cy - 4).toFixed(1)} Q ${cx},${dY.toFixed(1)} ${(cx + w).toFixed(1)},${(cy - 4).toFixed(1)}" fill="none" stroke="#666" stroke-width="0.85"/>`;
    if (s.ventralConv !== 0) {
      const vY = cy + s.ventralConv * f * 0.6;
      out += `<path d="M ${(cx - w).toFixed(1)},${(cy + 4).toFixed(1)} Q ${cx},${vY.toFixed(1)} ${(cx + w).toFixed(1)},${(cy + 4).toFixed(1)}" fill="none" stroke="#666" stroke-width="0.85"/>`;
    }
  }
  return out;
}

function frontFrills(s) {
  const cx = 100, cy = 100;
  const N = 50;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = cx + (t - 0.5) * 2 * s.halfWidth * 0.88;
    const wave = Math.sin(t * 22) * 1.5;
    const y = cy + 4 + wave;
    d += (i === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return `<path d="${d}" fill="none" stroke="black" stroke-width="1.2" opacity="0.7"/>`;
}

function frontSpines(s) {
  // Golden-angle scatter on the dorsal valve (upper half of front view).
  const cx = 100, cy = 100;
  let out = "";
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a = i * 137.5 * Math.PI / 180;
    const r = Math.sqrt((i + 0.5) / N) * 0.75;
    const xf = r * Math.cos(a);
    const yf = -Math.abs(r * Math.sin(a));  // negative = upper half only
    const x = cx + xf * s.halfWidth * 0.9;
    const y = cy + yf * s.dorsalConv * 0.85;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="#333"/>`;
  }
  return out;
}


function svgFrontView(answers) {
  const s = answersToShape(answers);
  const topEdge = frontEdgePoints(s, true);
  const bottomEdge = frontEdgePoints(s, false).reverse();
  const outlinePath = pointsToPath(topEdge.concat(bottomEdge));
  const clipId = "brachFrontClip";
  let inner = "";
  if (s.hasGrowthLines) inner += frontGrowthLines(s);
  if (s.hasFrills) inner += frontFrills(s);
  if (s.hasSpines) inner += frontSpines(s);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-front">
    <defs><clipPath id="${clipId}"><path d="${outlinePath}"/></clipPath></defs>
    <path d="${outlinePath}" fill="#fffef7" stroke="black" stroke-width="2.4" stroke-linejoin="round"/>
    <g clip-path="url(#${clipId})">${inner}</g>
  </svg>`;
}

// ---------- SIDE VIEW (rebuilt) ----------
function svgSideView(answers) {
  const s = answersToShape(answers);
  const cx = 100, cy = 100;
  const halfL = s.halfLength;
  const beakX = cx - halfL, frontX = cx + halfL;
  const N = 64;
  const top = [], bottom = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = beakX + t * 2 * halfL;
    const rc = (x - cx) / halfL;
    let dApex = cy - s.dorsalConv  * (1 - rc * rc) * 0.92;
    let vApex = cy + s.ventralConv * (1 - rc * rc) * 0.92;

    // Rib perimeter undulations on both dorsal and ventral curves.
    // Ribness peaks at the middle and fades to zero at beak (back) and commissure (front).
    if (s.ribCount > 0) {
      const ribness = (1 - rc * rc);
      const phase = t * s.ribCount * Math.PI;
      dApex -= s.ribAmp * ribness * Math.sin(phase);
      vApex += s.ribAmp * ribness * Math.sin(phase);
    }

    // Fold is a MIDLINE feature — mostly invisible from a strict lateral view.
    // Only the tip of the anterior commissure shows a slight notch when fold is strong.
    if (s.foldStr > 0 && rc > 0.85) {
      const phase = (rc - 0.85) / 0.15;
      dApex -= s.foldStr * 2 * phase;
      vApex += s.foldStr * 2 * phase;
    }
    top.push([x, dApex]);
    bottom.push([x, vApex]);
  }
  const outlinePath = pointsToPath(top.concat(bottom.reverse()));
  const clipId = "brachSideClip";

  // Beak / hinge mark at the back
  let beakSvg = "", hingeBar = "";
  if (s.hingeFrac >= 0.5) {
    hingeBar = `<line x1="${beakX.toFixed(1)}" y1="${(cy - 14).toFixed(1)}" x2="${beakX.toFixed(1)}" y2="${(cy + 14).toFixed(1)}" stroke="black" stroke-width="3.5"/>`;
  } else if (s.beakProm > 0) {
    const bx = beakX - 5;
    beakSvg = `<path d="M ${beakX.toFixed(1)},${(cy - 7).toFixed(1)} L ${bx.toFixed(1)},${cy.toFixed(1)} L ${beakX.toFixed(1)},${(cy + 7).toFixed(1)} Z" fill="#1a1a1a" opacity="0.5"/>`;
  }

  // Interior surface texture
  let inner = "";
  // Growth lines: nested arcs paralleling the anterior commissure (right edge).
  // Each arc curves from the dorsal margin to the ventral margin.
  if (s.hasGrowthLines) {
    for (let k = 1; k <= 4; k++) {
      const xL = frontX - k * (halfL * 0.18);
      const rc = (xL - cx) / halfL;
      const dY = cy - s.dorsalConv  * (1 - rc * rc) * 0.92 + 3;
      const vY = cy + s.ventralConv * (1 - rc * rc) * 0.92 - 3;
      // Curve bowing slightly toward the front (since growth lines parallel the commissure)
      const ctrlX = xL + 3;
      inner += `<path d="M ${xL.toFixed(1)},${dY.toFixed(1)} Q ${ctrlX.toFixed(1)},${cy.toFixed(1)} ${xL.toFixed(1)},${vY.toFixed(1)}" fill="none" stroke="#666" stroke-width="0.8"/>`;
    }
  }
  if (s.hasFrills) {
    // A wavy line just inside the anterior commissure
    const xR = frontX - halfL * 0.07;
    const rc = (xR - cx) / halfL;
    const dY = cy - s.dorsalConv  * (1 - rc * rc) * 0.92 + 3;
    const vY = cy + s.ventralConv * (1 - rc * rc) * 0.92 - 3;
    // Wavy vertical curve
    let d = `M ${xR.toFixed(1)},${dY.toFixed(1)}`;
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      const y = dY + (vY - dY) * u;
      const offset = Math.sin(u * 8) * 2.5;
      d += ` L ${(xR + offset).toFixed(1)},${y.toFixed(1)}`;
    }
    inner += `<path d="${d}" fill="none" stroke="black" stroke-width="1.2" opacity="0.7"/>`;
  }
  if (s.hasSpines) {
    // Spine bases scattered along the dorsal valve surface; a few protruding
    for (let i = 1; i < 9; i++) {
      const t = i / 9;
      const x = beakX + t * 2 * halfL;
      const rc = (x - cx) / halfL;
      const dApex = cy - s.dorsalConv * (1 - rc * rc) * 0.92;
      // dot just below dorsal curve
      inner += `<circle cx="${x.toFixed(1)}" cy="${(dApex + 4).toFixed(1)}" r="1.6" fill="#333"/>`;
      // Every 2nd, add a small protruding spine
      if (i % 2 === 0)
        inner += `<line x1="${x.toFixed(1)}" y1="${dApex.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(dApex - 9).toFixed(1)}" stroke="#222" stroke-width="1.1"/>`;
      // Second row on ventral surface
      const vApex = cy + s.ventralConv * (1 - rc * rc) * 0.92;
      if (s.ventralConv > 5) {
        inner += `<circle cx="${x.toFixed(1)}" cy="${(vApex - 4).toFixed(1)}" r="1.4" fill="#444"/>`;
      }
    }
  }

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-side">
    <defs><clipPath id="${clipId}"><path d="${outlinePath}"/></clipPath></defs>
    <path d="${outlinePath}" fill="#fffef7" stroke="black" stroke-width="2.4" stroke-linejoin="round"/>
    <g clip-path="url(#${clipId})">${inner}</g>
    ${beakSvg}
    ${hingeBar}
  </svg>`;
}

// Shape sliders: discrete preset stops, one choice active at a time.
function buildShapeSliders() {
  return [
    { qid: "outline_pick", label: "Outline",
      stops: [
        { value: "wing-shaped",   short: "Winged" },
        { value: "subcircular",   short: "Round" },
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

  // Tri-view SVGs
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
      blurb: "Atrypid: subcircular, biconvex, astrophic, many fine ribs with concentric frills, broad anterior fold.",
      answers: {
        outline_pick: "subcircular", profile_pick: "biconvex",
        hinge_pick: "astrophic", surface_ribs: "yes",
        surface_frills: "yes", rib_density: "dense", fold_pick: "strong"
      },
      images: [
        "pseudoatrypa/rockford/devoniana_nathan_01.jpg",
        "pseudoatrypa/rockford/devoniana_dave_01.jpg",
        "pseudoatrypa/rockford/devoniana_daycopper_01.png"
      ] },
    { name: "Cyrtospirifer whitneyi",
      blurb: "Spiriferid: wing-shaped (alate), biconvex, wide strophic hinge, many fine radial ribs, deep fold + sulcus.",
      answers: {
        outline_pick: "wing-shaped", profile_pick: "biconvex",
        hinge_pick: "wide-strophic", surface_ribs: "yes",
        rib_density: "dense", fold_pick: "strong"
      },
      images: [
        "cyrtospirifer/rockford/whitneyi_nathan_01.jpg",
        "cyrtospirifer/rockford/whitneyi_dave_01.jpg",
        "cyrtospirifer/rockford/whitneyi_jsm_01.png"
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
    else if (p[2] === "all")                view = viewAll(sid);
    else                                     view = viewNotFound();
  }
  else                                       view = viewNotFound();
  root.appendChild(view);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
