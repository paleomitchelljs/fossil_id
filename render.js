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
function topOutlinePath(outline, hinge) {
  // Each path closes back to (100, 18) — the beak tip — for a small umbo bump.
  if (outline === "wing-shaped") {
    // Wings always strophic-style. Body tapers from wing tips down to bottom point.
    return "M 100,18 Q 110,22 115,32 L 195,42 Q 188,58 165,62 Q 165,95 145,128 Q 128,158 100,172 Q 72,158 55,128 Q 35,95 35,62 Q 12,58 5,42 L 85,32 Q 90,22 100,18 Z";
  }
  if (outline === "elongate-oval") {
    if (hinge === "wide-strophic")
      return "M 100,15 Q 115,18 122,32 L 162,32 Q 175,90 100,175 Q 25,90 38,32 L 78,32 Q 85,18 100,15 Z";
    if (hinge === "narrow-strophic")
      return "M 100,12 Q 115,15 122,28 L 138,28 Q 170,95 100,178 Q 30,95 62,28 L 78,28 Q 85,15 100,12 Z";
    // astrophic + elongate
    return "M 100,12 Q 115,15 122,28 Q 152,40 152,90 Q 152,140 100,178 Q 48,140 48,90 Q 48,40 78,28 Q 85,15 100,12 Z";
  }
  // subcircular (default)
  if (hinge === "wide-strophic")
    return "M 100,18 Q 112,22 118,32 L 178,32 Q 188,90 100,168 Q 12,90 22,32 L 82,32 Q 88,22 100,18 Z";
  if (hinge === "narrow-strophic")
    return "M 100,15 Q 112,18 118,30 L 138,30 Q 180,82 100,170 Q 20,82 62,30 L 82,30 Q 88,18 100,15 Z";
  // astrophic + subcircular (most common — round + smoothly curved back)
  return "M 100,18 Q 112,22 118,32 Q 168,42 178,90 Q 175,135 100,170 Q 25,135 22,90 Q 32,42 82,32 Q 88,22 100,18 Z";
}

// Density → number of ribs to draw (visual only — not a filter trait)
const RIB_COUNTS = { sparse: 7, medium: 13, dense: 22 };

// ---------- TOP view surface layers (each feature independent) ----------
function topGrowthLines() {
  return [
    '<path d="M 35,68 Q 100,88 165,68" fill="none" stroke="#666" stroke-width="0.9"/>',
    '<path d="M 30,95 Q 100,118 170,95" fill="none" stroke="#666" stroke-width="0.9"/>',
    '<path d="M 32,122 Q 100,145 168,122" fill="none" stroke="#666" stroke-width="0.9"/>'
  ].join("");
}
function topRibs(density) {
  const N = RIB_COUNTS[density] || RIB_COUNTS.medium;
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const angle = -1.05 + t * 2.1;
    const xMid = 100 + Math.sin(angle) * 55;
    const yMid = 90 + Math.cos(angle) * 35;
    const xEnd = 100 + Math.sin(angle) * 82;
    const yEnd = 95 + Math.cos(angle) * 72;
    out.push(`<path d="M 100,32 Q ${xMid.toFixed(1)},${yMid.toFixed(1)} ${xEnd.toFixed(1)},${yEnd.toFixed(1)}" fill="none" stroke="#444" stroke-width="0.85"/>`);
  }
  return out.join("");
}
function topFrills() {
  return [
    '<path d="M 28,128 Q 42,148 62,140 Q 80,152 100,144 Q 120,152 138,140 Q 158,148 172,128" fill="none" stroke="black" stroke-width="1.5"/>',
    '<path d="M 33,146 Q 48,160 68,154 Q 84,164 100,158 Q 116,164 132,154 Q 152,160 167,146" fill="none" stroke="black" stroke-width="1.2" opacity="0.7"/>'
  ].join("");
}
function topSpines() {
  const pts = [
    [55,55],[75,50],[95,52],[115,52],[135,50],[150,55],
    [45,75],[68,72],[90,70],[110,70],[132,72],[160,75],
    [42,98],[65,95],[88,94],[112,94],[135,95],[162,98],
    [50,120],[72,118],[95,116],[120,118],[145,120],
    [60,138],[85,136],[110,136],[138,138]
  ];
  let out = pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#333"/>`).join("");
  out += '<line x1="45" y1="75" x2="30" y2="60" stroke="#222" stroke-width="1.3"/>';
  out += '<line x1="160" y1="75" x2="175" y2="60" stroke="#222" stroke-width="1.3"/>';
  out += '<line x1="50" y1="120" x2="38" y2="138" stroke="#222" stroke-width="1.3"/>';
  out += '<line x1="145" y1="120" x2="158" y2="138" stroke="#222" stroke-width="1.3"/>';
  return out;
}
function topSurfaceLayer(features) {
  let out = "";
  if (features.lines)  out += topGrowthLines();
  if (features.ribs)   out += topRibs(features.density);
  if (features.frills) out += topFrills();
  if (features.spines) out += topSpines();
  return out;
}

function topFoldLayer(fold) {
  if (!fold || fold === "none") return "";
  if (fold === "weak") {
    return [
      '<line x1="100" y1="32" x2="100" y2="160" stroke="#444" stroke-width="1.2" stroke-dasharray="4,3"/>',
      '<path d="M 85,165 Q 100,158 115,165" fill="none" stroke="black" stroke-width="1.4"/>'
    ].join("");
  }
  if (fold === "strong") {
    return [
      '<line x1="100" y1="28" x2="100" y2="166" stroke="black" stroke-width="2.2"/>',
      '<path d="M 65,162 L 100,128 L 135,162" fill="none" stroke="black" stroke-width="2.4"/>'
    ].join("");
  }
  return "";
}

function svgTopView(answers) {
  const outline = answers.outline_pick || "subcircular";
  const hinge   = answers.hinge_pick   || "astrophic";
  const fold    = answers.fold_pick    || "none";
  const features = featuresFromAnswers(answers);
  const path = topOutlinePath(outline, hinge);
  const clipId = "brachTopClip";
  return `<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-top">
    <defs><clipPath id="${clipId}"><path d="${path}"/></clipPath></defs>
    <path d="${path}" fill="#fffef7" stroke="black" stroke-width="2.4" stroke-linejoin="round"/>
    <g clip-path="url(#${clipId})">
      ${topSurfaceLayer(features)}
      ${topFoldLayer(fold)}
    </g>
  </svg>`;
}

// ---------- FRONT VIEW (anterior) ----------
// Shows the commissure line where the two valves meet, looking at the
// shell front-on. Profile sets the overall vertical extent; fold sets
// the commissure's shape (straight / wave / V).
function svgFrontView(answers) {
  const outline = answers.outline_pick || "subcircular";
  const profile = answers.profile_pick || "biconvex";
  const fold    = answers.fold_pick    || "none";

  // Width depends on outline
  const halfW = outline === "wing-shaped" ? 92 :
                outline === "elongate-oval" ? 55 : 75;
  const leftX = 100 - halfW, rightX = 100 + halfW;

  // Profile sets dorsal + ventral curve depths
  let dorsalDepth, ventralDepth;
  if (profile === "biconvex")        { dorsalDepth = 45; ventralDepth = 45; }
  else if (profile === "plano-convex") { dorsalDepth = 55; ventralDepth = 0; }
  else /* concavo-convex */            { dorsalDepth = 55; ventralDepth = -25; }

  // Single closed outline: from left commissure, curve up over the dorsal valve
  // to the right commissure, then curve down under the ventral valve back to start.
  // Negative ventralDepth makes the bottom curve go UP into the shell (concave).
  const outlinePath = `M ${leftX},95 ` +
    `Q 100,${95 - dorsalDepth} ${rightX},95 ` +
    `Q 100,${95 + ventralDepth} ${leftX},95 Z`;

  // Commissure line on top
  let commPath, commWidth, commDash;
  if (fold === "weak") {
    commPath = `M ${leftX},95 Q ${leftX + halfW * 0.4},100 100,82 Q ${rightX - halfW * 0.4},100 ${rightX},95`;
    commWidth = 2.0; commDash = "";
  } else if (fold === "strong") {
    commPath = `M ${leftX},95 L ${leftX + halfW * 0.55},100 L 100,52 L ${rightX - halfW * 0.55},100 L ${rightX},95`;
    commWidth = 2.4; commDash = "";
  } else {
    commPath = `M ${leftX},95 L ${rightX},95`;
    commWidth = 1.5; commDash = "5,3";
  }

  const clipId = "brachFrontClip";
  return `<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-front">
    <defs><clipPath id="${clipId}"><path d="${outlinePath}"/></clipPath></defs>
    <path d="${outlinePath}" fill="#fffef7" stroke="black" stroke-width="2.4" stroke-linejoin="round"/>
    <g clip-path="url(#${clipId})">
      ${frontSurfaceLayer(featuresFromAnswers(answers), leftX, rightX, dorsalDepth, ventralDepth)}
    </g>
    <path d="${commPath}" fill="none" stroke="black" stroke-width="${commWidth}" stroke-dasharray="${commDash}"/>
  </svg>`;
}

// Surface decoration for the front view. The shell front shows the
// commissure plane; ribs/frills/spines appear on the dorsal valve
// (upper half) and ventral valve (lower half).
// Front view surface — features rendered on the dorsal valve (upper half).
function frontGrowthLines(leftX, rightX, dorsalDepth) {
  const w = rightX - leftX;
  return [
    `<path d="M ${leftX + w*0.1},88 Q 100,${95 - dorsalDepth * 0.85} ${rightX - w*0.1},88" fill="none" stroke="#666" stroke-width="0.8"/>`,
    `<path d="M ${leftX + w*0.2},82 Q 100,${95 - dorsalDepth * 0.65} ${rightX - w*0.2},82" fill="none" stroke="#666" stroke-width="0.8"/>`,
    `<path d="M ${leftX + w*0.3},76 Q 100,${95 - dorsalDepth * 0.45} ${rightX - w*0.3},76" fill="none" stroke="#666" stroke-width="0.8"/>`
  ].join("");
}
function frontRibs(leftX, rightX, dorsalDepth, density) {
  const w = rightX - leftX;
  const N = RIB_COUNTS[density] || RIB_COUNTS.medium;
  let out = "";
  for (let i = 1; i < N; i++) {
    const x = leftX + (w * i) / N;
    const ratio = Math.abs(x - 100) / (w/2);
    const yTop = 95 - dorsalDepth * (1 - ratio * ratio) + 4;
    out += `<line x1="${x.toFixed(1)}" y1="${yTop.toFixed(1)}" x2="${x.toFixed(1)}" y2="93" stroke="#444" stroke-width="0.7"/>`;
  }
  return out;
}
function frontFrills(leftX, rightX) {
  const w = rightX - leftX;
  return `<path d="M ${leftX + w*0.1},90 Q ${leftX + w*0.25},85 ${leftX + w*0.4},88 Q 100,83 ${rightX - w*0.4},88 Q ${rightX - w*0.25},85 ${rightX - w*0.1},90" fill="none" stroke="black" stroke-width="1.3"/>`;
}
function frontSpines(leftX, rightX, dorsalDepth) {
  const w = rightX - leftX;
  const pts = [];
  for (let i = 2; i < 9; i++) {
    const x = leftX + (w * i) / 10;
    const ratio = Math.abs(x - 100) / (w/2);
    const yTop = 95 - dorsalDepth * (1 - ratio * ratio) + 6;
    pts.push([x, yTop]);
    pts.push([x, yTop + 8]);
  }
  let out = pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8" fill="#333"/>`).join("");
  out += `<line x1="${leftX + w * 0.2}" y1="${95 - dorsalDepth * 0.5}" x2="${leftX + w * 0.05}" y2="${95 - dorsalDepth * 0.7 - 8}" stroke="#222" stroke-width="1.2"/>`;
  out += `<line x1="${rightX - w * 0.2}" y1="${95 - dorsalDepth * 0.5}" x2="${rightX - w * 0.05}" y2="${95 - dorsalDepth * 0.7 - 8}" stroke="#222" stroke-width="1.2"/>`;
  return out;
}
function frontSurfaceLayer(features, leftX, rightX, dorsalDepth, ventralDepth) {
  let out = "";
  if (features.lines)  out += frontGrowthLines(leftX, rightX, dorsalDepth);
  if (features.ribs)   out += frontRibs(leftX, rightX, dorsalDepth, features.density);
  if (features.frills) out += frontFrills(leftX, rightX);
  if (features.spines) out += frontSpines(leftX, rightX, dorsalDepth);
  return out;
}

// ---------- SIDE VIEW (lateral) ----------
// Beak/hinge at left, anterior commissure at right; profile drives the
// overall shape (biconvex lens / plano-convex D / concavo-convex crescent).
function svgSideView(answers) {
  const profile = answers.profile_pick || "biconvex";
  const hinge   = answers.hinge_pick   || "astrophic";
  const surface = answers.surface_pick || "smooth";

  // Beak shape at back (left) — straight if strophic, pointed if astrophic
  const beakX = hinge === "astrophic" ? 22 : 26;
  const beakDip = hinge === "astrophic" ? 8 : 0;

  let path, dorsalCurveY = 15, ventralCurveY = 175, sideBaseY = 95;
  if (profile === "biconvex") {
    sideBaseY     = 95;
    dorsalCurveY  = 15 - beakDip/2;
    ventralCurveY = 175 + beakDip/2;
    path = `M ${beakX},95 Q 100,${dorsalCurveY} 180,95 Q 100,${ventralCurveY} ${beakX},95 Z`;
  } else if (profile === "plano-convex") {
    sideBaseY = 135;
    dorsalCurveY = 25;
    ventralCurveY = 135;
    path = `M ${beakX},135 Q 100,${dorsalCurveY} 180,135 L ${beakX},135 Z`;
  } else /* concavo-convex */ {
    sideBaseY = 130;
    dorsalCurveY = 15;
    ventralCurveY = 75;
    path = `M ${beakX},130 Q 100,${dorsalCurveY} 180,130 Q 100,${ventralCurveY} ${beakX},130 Z`;
  }

  const clipId = "brachSideClip";
  return `<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-side">
    <defs><clipPath id="${clipId}"><path d="${path}"/></clipPath></defs>
    <path d="${path}" fill="#fffef7" stroke="black" stroke-width="2.4" stroke-linejoin="round"/>
    <g clip-path="url(#${clipId})">
      ${sideSurfaceLayer(featuresFromAnswers(answers), beakX, dorsalCurveY, sideBaseY)}
    </g>
    ${hinge === "wide-strophic"
      ? '<line x1="22" y1="80" x2="22" y2="110" stroke="black" stroke-width="3.5"/>'
      : ""}
  </svg>`;
}

// Surface decoration for the side view. Decorations appear along the
// dorsal (top) curve, which is the surface visible from the side.
// Side view surface — features drawn along the dorsal (top) curve.
// baseY is the endpoint Y of the dorsal curve (95 for biconvex, 135 for plano-convex, 130 for concavo-convex).
function sideGrowthLines(beakX, dorsalCurveY, baseY) {
  const yAt = (t) => (1-t)*(1-t)*baseY + 2*t*(1-t)*dorsalCurveY + t*t*baseY;
  const xAt = (t) => (1-t)*(1-t)*beakX + 2*t*(1-t)*100 + t*t*180;
  let out = "";
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const x = xAt(t), y = yAt(t);
    out += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + 5).toFixed(1)}" stroke="#666" stroke-width="0.7"/>`;
  }
  return out;
}
function sideRibs(beakX, dorsalCurveY, baseY, density) {
  const yAt = (t) => (1-t)*(1-t)*baseY + 2*t*(1-t)*dorsalCurveY + t*t*baseY;
  const xAt = (t) => (1-t)*(1-t)*beakX + 2*t*(1-t)*100 + t*t*180;
  const N = RIB_COUNTS[density] || RIB_COUNTS.medium;
  let out = "";
  for (let i = 1; i < N; i++) {
    const t = i / N;
    const x = xAt(t), y = yAt(t);
    out += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + 9).toFixed(1)}" stroke="#444" stroke-width="0.7"/>`;
  }
  return out;
}
function sideFrills(beakX, dorsalCurveY, baseY) {
  const yAt = (t) => (1-t)*(1-t)*baseY + 2*t*(1-t)*dorsalCurveY + t*t*baseY;
  const xAt = (t) => (1-t)*(1-t)*beakX + 2*t*(1-t)*100 + t*t*180;
  return `<path d="M ${xAt(0.6).toFixed(1)},${(yAt(0.6) + 1).toFixed(1)} Q ${xAt(0.7).toFixed(1)},${(yAt(0.7) - 3).toFixed(1)} ${xAt(0.8).toFixed(1)},${(yAt(0.8) + 1).toFixed(1)} Q ${xAt(0.9).toFixed(1)},${(yAt(0.9) - 2).toFixed(1)} ${xAt(0.97).toFixed(1)},${(yAt(0.97) + 1).toFixed(1)}" fill="none" stroke="black" stroke-width="1.2"/>`;
}
function sideSpines(beakX, dorsalCurveY, baseY) {
  const yAt = (t) => (1-t)*(1-t)*baseY + 2*t*(1-t)*dorsalCurveY + t*t*baseY;
  const xAt = (t) => (1-t)*(1-t)*beakX + 2*t*(1-t)*100 + t*t*180;
  let out = "";
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const x = xAt(t), y = yAt(t);
    out += `<circle cx="${x.toFixed(1)}" cy="${(y + 6).toFixed(1)}" r="1.8" fill="#333"/>`;
    if (i % 3 === 0) {
      out += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - 8).toFixed(1)}" stroke="#222" stroke-width="1.2"/>`;
    }
  }
  return out;
}
function sideSurfaceLayer(features, beakX, dorsalCurveY, baseY) {
  let out = "";
  if (features.lines)  out += sideGrowthLines(beakX, dorsalCurveY, baseY);
  if (features.ribs)   out += sideRibs(beakX, dorsalCurveY, baseY, features.density);
  if (features.frills) out += sideFrills(beakX, dorsalCurveY, baseY);
  if (features.spines) out += sideSpines(beakX, dorsalCurveY, baseY);
  return out;
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
        el("a", { class: "restart-link", href: `${siteBase(sid)}/filter` }, "Use the question wizard instead")
      ])
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
    else if (p[2] === "all")                view = viewAll(sid);
    else                                     view = viewNotFound();
  }
  else                                       view = viewNotFound();
  root.appendChild(view);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
