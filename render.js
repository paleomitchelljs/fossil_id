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
      el("p", { class: "hero-sub" },
        [site.subtitle, site.formation || site.location].filter(Boolean).join(" — ")),
      site.blurb ? el("p", { class: "hero-blurb" }, site.blurb) : null,
      SITES.length > 1
        ? el("p", { class: "hero-change" }, el("a", { href: "#/" }, "Change site →"))
        : null
    ]),
    el("nav", { class: "landing-actions" }, [
      el("a", { class: "big-action primary", href: `${siteBase(sid)}/key` }, [
        el("span", { class: "ba-title" }, "Help me ID it"),
        el("span", { class: "ba-sub" }, "Step through short yes/no questions to narrow down what you found.")
      ]),
      el("a", { class: "big-action", href: `${siteBase(sid)}/build` }, [
        el("span", { class: "ba-title" }, "Build a brachiopod"),
        el("span", { class: "ba-sub" }, "Tweak outline, profile, hinge, fold, and surface features and watch the matching-species count update. Brachiopods only.")
      ]),
      el("a", { class: "big-action", href: `${siteBase(sid)}/browse` }, [
        el("span", { class: "ba-title" }, "Browse by group"),
        el("span", { class: "ba-sub" }, "Walk through brachiopods, corals, mollusks, and the other groups at this site.")
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

// ============================================================
// Tri-view brachiopod visualizer  (rebuilt 2026-05)
// ============================================================
// One 3-D shape model. Three projections — top / front / side.
// Changing a parameter updates all three views consistently.
//
// Coords (all SVGs share viewBox 0 0 200 200):
//   TOP   (looking down at dorsal valve):  +x right, +y anterior.
//                                          Beak at small y (top of view).
//   FRONT (looking at anterior end):       +x right, +y ventral.
//                                          Dorsal valve at small y.
//   SIDE  (right lateral, looking outside):+x anterior, +y ventral.
//                                          Beak at small x (back).
//
// Anatomical conventions baked into the renderer (calibrated against the
// Day & Copper 1998 plates and Stigall & Rode 2005 plate referenced in the
// manifest):
//   * Umbo is a small bulge at the posterior midline — not a triangular spike.
//   * "Biconvex" defaults to DORSI-biconvex (dorsal more inflated than ventral);
//     equibiconvex is rare in fossil brachiopods.
//   * Sulcus on the dorsal valve (atrypid/orthid convention): a midline
//     depression rendered as a faint dashed line + a small anterior perimeter
//     indent in TOP view, an upward notch in the lower outline in FRONT view.
//   * Fold on the ventral valve (or, more generally, the matching uplift on
//     the opposite valve): raises the commissure into a uniplicate peak in
//     FRONT view; appears as a slight anterior commissure elevation in SIDE.
//   * Growth lines are CONCENTRIC arcs centered on the beak that parallel the
//     commissure perimeter (TOP) or each valve's curvature (FRONT/SIDE).
//     Frills are the same geometry with bolder strokes and slight ruffling.
//   * Ribs sweep across the FULL surface (TOP view), with fine longitudinal
//     traces on dorsal and ventral surfaces in SIDE view, and small
//     dorsoventral undulations of the valve outlines in FRONT view.
//   * Strophic shells have a flat hinge line in TOP and a visible interarea
//     wall at the back in SIDE; astrophic shells curve smoothly to a beak.
//
// Parametric morphospace
// ----------------------
// answersToShape(answers) → `s`, an object describing a single shell. All
// three views read from `s`. Adding new traits means extending `s` and
// teaching at least one view to render them.

// Rib presets — count = number of ribs around the dorsal perimeter; amp
// = how far each rib bumps out (px). The commissure zigzag is a real
// diagnostic feature: few coarse ribs produce a strongly crenulated
// commissure; many fine ribs produce a finely serrated commissure;
// smooth shells produce a straight commissure.
const RIB_SETTINGS = {
  sparse: { count: 10, amp: 4.0 },
  medium: { count: 20, amp: 2.4 },
  dense:  { count: 34, amp: 1.5 }
};

// Fold profile resolution — RICHER THAN THE USER-FACING SLIDER.
//
// The student picks one of {none, weak, strong} for fold strength,
// but the actual shape of a "strong fold" depends on the outline
// archetype. The same strength keyword maps to dramatically different
// profiles:
//
//   - Wing-shaped (Cyrtospirifer) "strong"  → tall sharp central peak,
//     narrow shoulder, near-half-rectangle plateau.
//   - Conical (Conispirifer)      "strong"  → even narrower peak.
//   - Subcircular (Gypidula, etc.) "strong" → BROAD smooth hump, more
//     modest rise. Atrypid/pentameroid folds lift the entire midline
//     gently, never producing a Cyrtospirifer-style spike — the fold
//     IS the commissure curvature, not a separate spike on a dome.
//
// shape:
//   * `rise`      — px height of the fold above the body envelope
//   * `shoulderU` — width of the easing transition (smoothstep) from
//                   plateau to body, in normalized u
//   * `halfU`     — half-width of the flat plateau
//   Total fold influence radius = halfU + shoulderU.
function resolveFoldParams(f, o) {
  if (f === "none") return { rise: 0, shoulderU: 0, halfU: 0 };

  const isTriangular = o === "wing-shaped" || o === "conical";

  if (isTriangular) {
    // Sharp tall peak that emerges from a triangular body envelope.
    // The fold itself is the dominant midline-height feature.
    if (f === "strong") {
      return o === "conical"
        ? { rise: 55, shoulderU: 0.18, halfU: 0.04 }
        : { rise: 50, shoulderU: 0.20, halfU: 0.05 };
    }
    return { rise: 16, shoulderU: 0.22, halfU: 0.06 };
  }

  // Subcircular / pentagonal / elongate-oval — the body itself is the
  // dome, the fold adds a broad smooth midline rise. The inner V-peak
  // commissure picks up the full rise * 1.8 coefficient (frontFoldSplit),
  // so these values are scaled to give the commissure a pronounced flex
  // even though the OUTER silhouette barely deforms.
  if (f === "strong") return { rise: 30, shoulderU: 0.55, halfU: 0.18 };
  return { rise: 14, shoulderU: 0.42, halfU: 0.10 };
}

// Beak/umbo prominence presets — drive the side view's posterior shape.
//   apexShift : where the dorsal/ventral apex sits along the AP axis
//               (0 = mid-shell, 0.5 = halfway back toward the beak).
//               Pyramidal forms (Cyrtina, Pyramidspirifer) have the apex
//               way back.
//   umboPx     : astrophic shells get a curled beak this tall (px).
//   interareaScale: strophic shells get their interareaH multiplied here.
const BEAK_SETTINGS = {
  subdued:   { apexShift: 0.05, umboPx: 3,  interareaScale: 0.6 },
  moderate:  { apexShift: 0.20, umboPx: 6,  interareaScale: 1.0 },
  prominent: { apexShift: 0.40, umboPx: 12, interareaScale: 1.6 },
  pyramidal: { apexShift: 0.55, umboPx: 18, interareaScale: 2.4 }
};

// Lateral profile kinks — features that only the SIDE view can show.
//   smooth:     no kink, dorsal/ventral curves are smooth parabolas
//   geniculate: sharp 90°-ish bend in the ventral valve at kinkAt (fraction
//               of length from beak). Typical of Douvillina-style
//               concavo-convex strophomenids.
//   resupinate: dorsal/ventral curvature INVERTS at kinkAt — the dorsal
//               valve starts convex and becomes concave anteriorly
//               (Strophonelloides reversa).
const LATERAL_PROFILE_SETTINGS = {
  smooth:     { type: "smooth"                            },
  geniculate: { type: "geniculate", kinkAt: 0.55, dropPx: 16 },
  resupinate: { type: "resupinate", kinkAt: 0.50, invertFactor: 1.0 }
};

// Stroke palette — centralised so the three views stay visually consistent.
const SK = {
  outlineW: 2.2,
  ribCol:   "#5a5a5a", ribW:    0.7,
  growthCol:"#8a8a8a", growthW: 0.7,
  frillCol: "#1f1f1f", frillW:  1.4,
  hingeCol: "#1a1a1a", hingeW:  2.0,
  beakCol:  "#1a1a1a",
  sulcusCol:"#7a7a7a", sulcusW: 0.7
};

function answersToShape(answers) {
  const features = featuresFromAnswers(answers);
  const o = answers.outline_pick || "subcircular";
  const p = answers.profile_pick || "biconvex";
  const h = answers.hinge_pick   || "astrophic";
  const f = answers.fold_pick    || "none";
  const b = answers.beak_pick    || "moderate";
  const k = answers.lateral_pick || "smooth";

  // Top-view half-dimensions, in px (viewBox 200×200). Per-outline base
  // dimensions, then nudged based on surface features so atrypids look
  // different from spinatryids look different from pentameroids:
  //   * Spinatryid (frills + spines): TRANSVERSE — wider than long
  //   * Atrypid (frills only): mild teardrop — slightly taller than wide
  //   * Default subcircular: square circle
  let halfWidth, halfLength;
  if (o === "wing-shaped")        { halfWidth = 90; halfLength = 60; }
  else if (o === "elongate-oval") { halfWidth = 46; halfLength = 86; }
  else if (o === "conical")       { halfWidth = 40; halfLength = 50; }
  else {
    halfWidth = 70; halfLength = 70;
    if (features.frills && features.spines) {
      // Spinatryid: transverse outline (wider than long, ~1.3:1)
      halfWidth = 80; halfLength = 60;
    } else if (features.frills) {
      // Atrypid: slightly taller-than-wide teardrop (~0.92:1)
      halfWidth = 66; halfLength = 72;
    }
  }

  // Hinge fraction — what proportion of the top edge is straight.
  // For wing-shaped / conical shells, the hinge IS the cardinal axis (the
  // wing tips or interarea base mark the lateral extremes), so hingeFrac
  // matches the full lateral extent. For subcircular strophic shells, the
  // hinge truncates the upper portion of an otherwise round outline → hingeFrac < 1.
  const hingeFrac  = h === "wide-strophic"   ? ((o === "wing-shaped" || o === "conical") ? 1.00 : 0.95)
                  : h === "narrow-strophic" ? 0.55
                  : 0;
  const beakPreset = BEAK_SETTINGS[b] || BEAK_SETTINGS.moderate;
  // Astrophic shells have an umbo bulge; strophic ones flatten into the hinge.
  // Beak prominence scales the bulge height.
  const beakProm   = h === "astrophic" ? beakPreset.umboPx : 0;
  // Side-view interarea wall (visible only on strophic shells). The base width
  // depends on hinge type; beak prominence scales it further so a "pyramidal"
  // wide-strophic shell (e.g. Cyrtina) shows a tall back wall.
  const baseInterarea = h === "wide-strophic"   ? 30
                     : h === "narrow-strophic" ? 16
                     : 0;
  const interareaH = baseInterarea * beakPreset.interareaScale;
  // Posterior shift of the dorsal/ventral apex — drives the side view shape.
  // 0 = symmetric lemon (apex at mid-shell), positive = apex pulled back toward
  // the beak (teardrop/triangle shape, typical of pyramidal forms).
  // For conical shells the dorsal/ventral apex sits AT the back wall
  // (the interarea is the maximum-DV point), so the side-view curves
  // descend monotonically from the back to the anterior tip — no
  // interior parabolic peak. Push apexShift toward the back regardless
  // of beak_pick (a conical shell with subdued beak still has its apex
  // at the back). Brach3 red overlay confirms this geometry.
  let apexShift = beakPreset.apexShift;
  if (o === "conical") apexShift = Math.max(apexShift, 0.92);

  // Valve convexity (px) — controls the side-view inflation of each
  // valve above/below the commissure plane. Real Iowa Devonian
  // specimens are STRONGLY inequivalve; the user's brach photos show
  // dorsal valves dramatically more inflated than ventral on most
  // taxa. The defaults below bias toward pronounced dorsibiconvexity
  // (2-3:1 ratio) instead of the near-symmetric 62/38 that produced
  // generic "lens" silhouettes in earlier renders.
  //
  // Per-outline ratios:
  //   subcircular / pentagonal / elongate-oval — strongly
  //     dorsibiconvex (atrypids, orthids, terebratulids, pentameroids,
  //     Theodossia). Dorsal apex sits ~3× the depth of the ventral.
  //   wing-shaped — moderate (alate spiriferids like Cyrtospirifer
  //     are closer to equivalve, just slightly dorsibiconvex)
  //   conical — ventro-biconvex (cone IS the ventral valve)
  //
  // surface_frills boosts dorsibiconvexity further (atrypids/spinatrypids
  // have notably inflated dorsal valves carrying the lamellae stack).
  let dorsalConv, ventralConv;
  if (p === "concavo-convex") {
    // Strophomenids and productids — overall FLAT shell. The previous
    // 24/64 split made the silhouette a deep U-pouch which doesn't
    // match the brach7 (Douvillina) photo where the side view is a
    // thin strip with a small anterior bend (the geniculate).
    // Dorsal is essentially flat / slightly concave (small positive
    // value, rather than negative — the side-view silhouette can't
    // dip below cy without self-crossing the commissure-plane closure).
    // Productids with spines get a deeper ventral cone via the spines
    // boost below.
    dorsalConv = 6;
    ventralConv = features.spines ? 38 : 22;
  } else if (p === "plano-convex") {
    dorsalConv = 70; ventralConv = 6;
  } else if (o === "conical") {
    dorsalConv = 24; ventralConv = 78;   // ventro-biconvex cone
  } else if (o === "wing-shaped") {
    dorsalConv = 56; ventralConv = 40;   // near-equivalve alate
  } else {
    // Subcircular / pentagonal / elongate-oval — strong dorsibiconvex
    dorsalConv = 72; ventralConv = 25;
    if (features.frills) {
      // Atrypids and spinatrypids — even more pronounced
      dorsalConv = 80; ventralConv = 22;
    }
  }

  const foldPreset = resolveFoldParams(f, o);
  const lateralPreset = LATERAL_PROFILE_SETTINGS[k] || LATERAL_PROFILE_SETTINGS.smooth;
  const ribCount = features.ribs ? (RIB_SETTINGS[features.density] || RIB_SETTINGS.medium).count : 0;
  const ribAmp   = features.ribs ? (RIB_SETTINGS[features.density] || RIB_SETTINGS.medium).amp   : 0;

  return {
    outline: o, profile: p, hinge: h, fold: f, beak: b, lateral: k,
    halfWidth, halfLength, hingeFrac, beakProm, interareaH, apexShift,
    dorsalConv, ventralConv,
    foldStr: f === "strong" ? 1 : f === "weak" ? 0.4 : 0,
    foldRise: foldPreset.rise,
    foldShoulderU: foldPreset.shoulderU,
    foldHalfU: foldPreset.halfU,
    // Lateral kink (side-view only) — geniculate or resupinate
    lateralType: lateralPreset.type,
    lateralKinkAt: lateralPreset.kinkAt || 0,
    lateralDropPx: lateralPreset.dropPx || 0,
    lateralInvert: lateralPreset.invertFactor || 0,
    ribCount, ribAmp,
    hasFrills:      features.frills,
    hasSpines:      features.spines,
    hasGrowthLines: features.lines || features.frills
  };
}

// Fold profile — flat plateau across |u| < halfU, then a Gaussian
// decay outside. The Gaussian's long tail prevents the silhouette
// "bifurcating divot" that an abrupt cutoff produces when the fold
// contribution drops to zero abruptly while the body envelope is still
// descending. Gaussians never reach zero, so the fold smoothly merges
// into the body slope.
//
// shoulderU = characteristic width of the Gaussian decay (1/e width).
function foldRiseAt(u, s) {
  if (s.foldRise === 0) return 0;
  const au = Math.abs(u);
  if (au <= s.foldHalfU) return s.foldRise;
  const d = au - s.foldHalfU;
  return s.foldRise * Math.exp(-Math.pow(d / s.foldShoulderU, 2));
}

function pointsToPath(pts, close = true) {
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  }
  return close ? d + " Z" : d;
}

// ============================================================
// TOP VIEW — dorsal valve seen from above
// ============================================================
// Build pipeline: outline shape (normalized -1..1) → hinge straightening
// (strophic forms) → sulcus indent at anterior midline → rib perimeter
// scallop → scale to screen coords → umbo bulge for astrophic.

function unitOutline(theta, s) {
  // theta = 0 at beak, π at anterior commissure; CW (right at π/2).
  const ct = Math.cos(theta), st = Math.sin(theta);
  if (s.outline === "wing-shaped") {
    // Alate (winged) outline — the hinge IS the cardinal axis. The base
    // outline is rectangular on the upper half (vertical sides at the
    // full lateral extent, from the equator up to the hinge line) and
    // tapers anteriorly on the lower half. applyHingeStraightening then
    // pulls the top of the rectangle onto the flat hinge line.
    let nx, ny;
    if (ct >= 0) {
      // Upper / hinge zone: vertical sides at x = ±1 from the equator
      // (ct = 0, ny = 0) up to the beak (ct = 1, ny = -1).
      nx = Math.sign(st || 1);
      ny = -ct;
    } else {
      // Lower / anterior zone: kite-like taper to the anterior point.
      const w = Math.pow(Math.max(0, 1 - Math.abs(ct)), 0.7);
      nx = Math.sign(st || 1) * w;
      ny = -ct;
    }
    return [nx, ny];
  }
  if (s.outline === "elongate-oval") return [st, -ct];
  if (s.outline === "conical") {
    // Cone-spiriferid plan view — the hinge IS the cardinal axis but the
    // body is narrow (the interarea wall takes up most of the apparent
    // length when viewed from the front). Upper half: vertical sides at
    // full lateral extent like wing-shaped, but the lateral extent is
    // already narrow (halfWidth 40 vs wing-shaped 90). Lower half:
    // rounded taper (exponent 0.65) to a blunted anterior — Conispirifer
    // / Cyrtina / Pyramidspirifer aren't dagger-sharp at the front.
    let nx, ny;
    if (ct >= 0) {
      nx = Math.sign(st || 1);
      ny = -ct;
    } else {
      const w = Math.pow(Math.max(0, 1 - Math.abs(ct)), 0.65);
      nx = Math.sign(st || 1) * w;
      ny = -ct;
    }
    return [nx, ny];
  }
  if (s.outline === "pentagonal") {
    // Pentagonal / subtriangular — narrow toward the beak, broadest at the
    // anterior-flanks, with straight-ish sides. Common in rhynchonellids
    // (Trichorhynchia) and some atrypids. Modeled as a superellipse with
    // n=1.4 (between diamond at n=1 and ellipse at n=2), shifted so the
    // widest point sits at y ≈ +0.3.
    const n = 1.4;
    const y_shift = 0.30;
    const yc = -ct - y_shift;            // shift the centre of the shape
    const yAbs = Math.min(Math.abs(yc), 1);
    const xFrac = Math.pow(Math.max(0, 1 - Math.pow(yAbs, n)), 1 / n);
    return [Math.sign(st || 1) * xFrac, -ct];
  }
  // subcircular — TEARDROP / shield shape with a meaningful narrowing
  // toward the beak. Real Pseudoatrypa / Spinatrypa / Theodossia have
  // a noticeable taper at the posterior (where the umbo sits) and
  // typically a slight anterior bulge (the widest part is anterior of
  // the equator). The previous near-circular formula collapsed all
  // taxa to the same outline — user critique noted "shells snap to
  // rigid geometric primitives. It forces Spinatrypa and Pseudoatrypa
  // into almost perfect circles."
  let r;
  if (ct >= 0) {
    // Posterior half: shrink toward the beak (20% narrower at the umbo)
    r = 1 - 0.20 * ct;
  } else {
    // Anterior half: slight outward bulge (widest just anterior of equator)
    r = 1 + 0.04 * (-ct) * (1 - (-ct));
  }
  return [r * st, -r * ct];
}

function applyHingeStraightening(nx, ny, s) {
  // Pull the very top of the outline onto a flat hinge line at ny = -0.95.
  // Range = top 25% of the perimeter; over that range, points are linearly
  // blended toward (clamp(nx, ±hingeHalfW), -0.95). The same hingeY is used
  // by topHingeLine() so the explicit hinge bar always coincides with the
  // straightened outline edge.
  if (s.hingeFrac < 0.05 || ny > 0) return [nx, ny];
  const topness = -ny;
  const range = 0.25;
  if (topness < 1 - range) return [nx, ny];
  const blend = Math.min(1, (topness - (1 - range)) / range);
  const hingeHalfW = s.hingeFrac;
  const hingeX = Math.max(-hingeHalfW, Math.min(hingeHalfW, nx));
  const hingeY = -0.95;
  return [
    nx * (1 - blend) + hingeX * blend,
    ny * (1 - blend) + hingeY * blend
  ];
}

function applySulcusIndent(nx, ny, theta, s) {
  if (s.foldStr === 0) return [nx, ny];
  const dt = theta - Math.PI;
  const range = 0.45;
  if (Math.abs(dt) > range) return [nx, ny];
  const w = Math.cos((dt / range) * (Math.PI / 2)) ** 2;
  const depth = s.foldStr * 0.07 * w;     // scales toward centroid
  return [nx * (1 - depth), ny * (1 - depth)];
}

function applyRibScallop(nx, ny, theta, s) {
  // Each rib bumps the perimeter outward where it crosses. The bump is full
  // amplitude at the anterior commissure (the diagnostic zone — students
  // look at the front edge to count and gauge ribs), fading toward the beak.
  // Bump is in screen-px equivalents, applied along the radial direction
  // with anisotropic scaling so it lands at the same px amplitude regardless
  // of whether the perimeter sits on the wide or short axis.
  if (s.ribCount === 0) return [nx, ny];
  const ct = Math.cos(theta);
  const anteriorStrength = Math.pow(Math.max(0, -ct), 0.5);   // peaks at anterior
  const sideStrength     = Math.pow(Math.max(0, 1 - Math.abs(ct)), 0.6) * 0.6;
  const ribness = Math.max(sideStrength, anteriorStrength);
  if (ribness < 1e-3) return [nx, ny];
  // Full px amplitude at peak; cos gives the rib spacing
  const amp_px = s.ribAmp * ribness * Math.cos(theta * s.ribCount);
  const len = Math.hypot(nx, ny);
  if (len < 1e-3) return [nx, ny];
  const ux = nx / len, uy = ny / len;
  // Anisotropic scaling: bump applies in screen px, so the normalized step
  // depends on whether we're moving in the wide or short direction.
  return [nx + (amp_px / s.halfWidth) * ux, ny + (amp_px / s.halfLength) * uy];
}

function topPerimeterAt(theta, s) {
  // Same pipeline as topOutlinePoints, evaluated at a single theta — used to
  // anchor ribs/growth lines on the rib-perturbed perimeter.
  const cx = 100, cy = 102;
  let [nx, ny] = unitOutline(theta, s);
  [nx, ny] = applyHingeStraightening(nx, ny, s);
  [nx, ny] = applySulcusIndent(nx, ny, theta, s);
  [nx, ny] = applyRibScallop(nx, ny, theta, s);
  return [cx + nx * s.halfWidth, cy + ny * s.halfLength];
}

function topOutlinePoints(s) {
  const N = 192;
  const cx = 100, cy = 102;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const theta = (i / N) * 2 * Math.PI;
    let [nx, ny] = unitOutline(theta, s);
    [nx, ny] = applyHingeStraightening(nx, ny, s);
    [nx, ny] = applySulcusIndent(nx, ny, theta, s);
    [nx, ny] = applyRibScallop(nx, ny, theta, s);
    pts.push([cx + nx * s.halfWidth, cy + ny * s.halfLength]);
  }
  // Umbo as a small rounded bulge (3-point nudge), not a triangular spike.
  if (s.beakProm > 0) {
    let topI = 0, minY = Infinity;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i][1] < minY) { minY = pts[i][1]; topI = i; }
    }
    const nudge = (i, f) => {
      const idx = (i + pts.length) % pts.length;
      pts[idx] = [pts[idx][0], pts[idx][1] - s.beakProm * f];
    };
    nudge(topI, 1.0);
    nudge(topI - 1, 0.7); nudge(topI + 1, 0.7);
    nudge(topI - 2, 0.4); nudge(topI + 2, 0.4);
  }
  return pts;
}

function topRibLines(s) {
  if (s.ribCount === 0) return "";
  const cx = 100, cy = 102;
  const beakY = cy - s.halfLength + 4;
  const beakX = cx;
  let out = "";
  // Ribs sweep across the FULL perimeter, including over the anterior midline
  // (the old code split into mirrored halves with a gap — fixed here).
  for (let i = 0; i < s.ribCount; i++) {
    const t = (i + 0.5) / s.ribCount;
    const margin = 0.04 * Math.PI;
    const theta = margin + t * (2 * Math.PI - 2 * margin);
    const [ex, ey] = topPerimeterAt(theta, s);
    const dx = ex - beakX, dy = ey - beakY;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue;
    // Gentle curvature: bend the rib outward following the shell surface.
    const px = dy / len, py = -dx / len;
    const side = Math.sign(ex - beakX) || 1;
    const bend = Math.min(7, len * 0.04);
    const ctlX = (beakX + ex) / 2 + px * side * bend;
    const ctlY = (beakY + ey) / 2 + py * side * bend;
    out += `<path d="M ${beakX.toFixed(1)},${beakY.toFixed(1)} Q ${ctlX.toFixed(1)},${ctlY.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${SK.ribCol}" stroke-width="${SK.ribW}"/>`;
  }
  return out;
}

function topGrowthArcs(s, count, strokeW, strokeCol) {
  // Concentric arcs centered on the beak — each is a scaled copy of the
  // outline. The arc spans most of the perimeter (skipping a small wedge
  // over the beak itself).
  const cx = 100, cy = 102;
  const N = 64;
  let out = "";
  for (let k = 1; k <= count; k++) {
    const f = k / (count + 1);
    let path = "";
    const tMin = 0.08, tMax = 1.92;
    for (let i = 0; i <= N; i++) {
      const tt = tMin + (tMax - tMin) * (i / N);
      const theta = tt * Math.PI;
      let [nx, ny] = unitOutline(theta, s);
      [nx, ny] = applyHingeStraightening(nx, ny, s);
      [nx, ny] = applySulcusIndent(nx, ny, theta, s);
      // Scale toward the beak (normalized beak is at (0, -1))
      const bx = 0, by = -1;
      const px = bx + (nx - bx) * f;
      const py = by + (ny - by) * f;
      const x = cx + px * s.halfWidth;
      const y = cy + py * s.halfLength;
      path += (i === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    }
    out += `<path d="${path}" fill="none" stroke="${strokeCol}" stroke-width="${strokeW}"/>`;
  }
  return out;
}

function topSulcusMark(s) {
  // Subtle dashed midline indicating the sulcus on the dorsal valve.
  // Replaces the old thick black bar that dominated the view.
  if (s.foldStr === 0) return "";
  const cx = 100, cy = 102;
  const y1 = cy - s.halfLength * 0.40;
  const y2 = cy + s.halfLength * 0.82;
  const sw = (0.55 + s.foldStr * 0.45).toFixed(2);
  return `<line x1="${cx}" y1="${y1.toFixed(1)}" x2="${cx}" y2="${y2.toFixed(1)}" stroke="${SK.sulcusCol}" stroke-width="${sw}" stroke-dasharray="3,2"/>`;
}

function topSpines(s) {
  // Spinatryid spines arise from intersections of growth lamellae with
  // radial ribs — a coherent grid pattern, NOT random dots. Previous
  // Vogel-spiral placement disrupted the structural outline (user
  // critique). New placement: at fixed radial fractions (lamellae) on a
  // subset of the rib angles, concentrated on the anterior + lateral
  // commissure where lamellae are thickest.
  const cx = 100, cy = 102;
  let out = "";
  // Spine angular range — skip the back ~80° around the hinge area
  // (theta=0 is the beak / posterior; we span from theta ≈ 0.22π
  // out around to theta ≈ 1.78π, i.e., 320° of the perimeter)
  const thetaMin = Math.PI * 0.22;
  const thetaMax = Math.PI * 1.78;
  const ribCount = Math.max(8, s.ribCount || 16);
  // Spines per lamella — every ~third rib, so they read as discrete
  const spinesPerRing = Math.max(6, Math.min(14, Math.floor(ribCount / 3)));
  // Three concentric lamella positions
  const rings = [0.55, 0.74, 0.90];
  for (const ringR of rings) {
    for (let i = 0; i < spinesPerRing; i++) {
      const tFrac = i / (spinesPerRing - 1);
      const theta = thetaMin + tFrac * (thetaMax - thetaMin);
      const [nx, ny] = unitOutline(theta, s);
      const x = cx + nx * s.halfWidth * ringR;
      const y = cy + ny * s.halfLength * ringR;
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.4" fill="#222"/>`;
    }
  }
  // Perimeter spine stubs projecting outward — the most prominent spines,
  // visible as protrusions at the shell edge. Fewer than ring spines.
  const NP = Math.max(5, Math.floor(spinesPerRing * 0.7));
  for (let i = 0; i < NP; i++) {
    const tFrac = i / (NP - 1);
    // Slightly narrower angular range for perimeter stubs (lateral+anterior)
    const theta = Math.PI * 0.35 + tFrac * Math.PI * 1.30;
    const [ex, ey] = topPerimeterAt(theta, s);
    const dx = ex - cx, dy = ey - cy;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue;
    const ox = dx / len * 6.5, oy = dy / len * 6.5;
    out += `<line x1="${ex.toFixed(1)}" y1="${ey.toFixed(1)}" x2="${(ex + ox).toFixed(1)}" y2="${(ey + oy).toFixed(1)}" stroke="#222" stroke-width="1.3" stroke-linecap="round"/>`;
  }
  return out;
}

function topHingeLine(s) {
  if (s.hingeFrac < 0.5) return "";
  const cx = 100, cy = 102;
  const hingeY = cy - s.halfLength * 0.95;
  const hingeHalfW = s.halfWidth * s.hingeFrac;
  return `<line x1="${(cx - hingeHalfW).toFixed(1)}" y1="${hingeY.toFixed(1)}" x2="${(cx + hingeHalfW).toFixed(1)}" y2="${hingeY.toFixed(1)}" stroke="${SK.hingeCol}" stroke-width="${SK.hingeW}"/>`;
}

function topUmboDot(s) {
  // Beak marker. For astrophic shells (curved hinge), the umbo is a visible
  // little bump — we draw a small filled wedge. For strophic shells, the umbo
  // sits on the straight hinge line; we render it as a small triangular notch
  // pointing posteriorly.
  const cx = 100, cy = 102;
  const beakY = cy - s.halfLength + (s.beakProm > 0 ? -s.beakProm * 0.4 : 4);
  if (s.beakProm > 0) {
    // Astrophic — small triangular umbo bulge above the outline.
    const h = 6;
    const w = 4;
    return `<path d="M ${cx},${(beakY - h).toFixed(1)} L ${(cx - w).toFixed(1)},${(beakY + 1).toFixed(1)} L ${(cx + w).toFixed(1)},${(beakY + 1).toFixed(1)} Z" fill="${SK.beakCol}"/>`;
  }
  // Conical (Conispirifer / Cyrtina / Pyramidspirifer) — the dorsal beak
  // sits at the apex of the interarea wall, which is visible in SIDE view
  // not top view. From above, the hinge line is the back edge with no
  // bump above it. Skip the triangle.
  if (s.outline === "conical") return "";
  // Strophic — small dorsal-beak triangle riding on top of the hinge bar.
  const hingeY = cy - s.halfLength * 0.95;
  const h = 7, w = 5;
  return `<path d="M ${cx},${(hingeY - h).toFixed(1)} L ${(cx - w).toFixed(1)},${hingeY.toFixed(1)} L ${(cx + w).toFixed(1)},${hingeY.toFixed(1)} Z" fill="${SK.beakCol}"/>`;
}

function svgTopView(answers) {
  const s = answersToShape(answers);
  const pts = topOutlinePoints(s);
  const outlinePath = pointsToPath(pts);
  const clipId = "brachTopClip_" + Math.floor(Math.random() * 1e6);

  let inner = "";
  // Layer order: growth (background) → ribs → frills (bolder, on top of ribs)
  //              → sulcus midline → spines.
  if (s.hasGrowthLines && !s.hasFrills) inner += topGrowthArcs(s, 6, SK.growthW, SK.growthCol);
  if (s.ribCount > 0)                   inner += topRibLines(s);
  if (s.hasFrills)                      inner += topGrowthArcs(s, 5, SK.frillW, SK.frillCol);
  inner += topSulcusMark(s);
  if (s.hasSpines)                      inner += topSpines(s);

  // Hinge line + umbo dot drawn on top of everything for clarity.
  const overlay = topHingeLine(s) + topUmboDot(s);

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-top">
    <defs><clipPath id="${clipId}"><path d="${outlinePath}"/></clipPath></defs>
    <path d="${outlinePath}" fill="#fffef7" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round"/>
    <g clip-path="url(#${clipId})">${inner}</g>
    ${overlay}
  </svg>`;
}

// ============================================================
// FRONT VIEW — anterior end seen from the front
// ============================================================
// Dorsal valve on top, ventral on bottom. Width = full shell width.
// Default biconvex is DORSI-biconvex. Fold/sulcus convention:
//   * Dorsal valve has a midline RIDGE (fold) → small peak on the upper outline.
//   * Ventral valve has a midline TROUGH (sulcus) → the lower outline lifts
//     UPWARD at center (depression dips into the shell). Strong sulcus
//     produces a pronounced V-notch in the bottom — matches Day & Copper
//     plate B5 of Pseudoatrypa.
//   * The commissure becomes uniplicate (peaks at center).

// ============================================================
// Front-view silhouette templates (per outline archetype)
// ============================================================
// The front view's silhouette is built as the sum of two contributions:
//   - a valve "body" envelope that depends on the outline archetype
//   - the fold (or sulcus, on the ventral side) that creates the central
//     commissure peak
//
// Earlier the renderer had only one body model — a parabolic dome
// `valveConv * (1 - u²)` — which works for atrypid/orthid subcircular
// shells where the body IS a low dome and the fold is a mild rise on
// top. But for alate spiriferids (Cyrtospirifer-style) and conical
// spirifers (Conispirifer / Cyrtina / Pyramidspirifer) the body is
// fundamentally triangular — wings sweep DOWN from a central peak with
// no underlying dome. Applying the dome formula there produces the
// wrong silhouette: a wide low arch with a narrow cone glued on top.
//
// `frontBodyShape(u, s)` returns a unit-amplitude shape factor (0..1)
// for the body at lateral position u ∈ [-1, 1]:
//   - subcircular / pentagonal / elongate-oval → parabolic dome (1 - u²)
//   - wing-shaped → linear triangle (1 - |u|), wings descend to wingtips
//   - conical → narrow triangle, shape drops faster than linear
//
// The valve convexity (px) then scales this shape, and the fold is
// added on top with full weight (the fold's own narrow rise creates
// the central peak).

function frontBodyShape(u, s) {
  const au = Math.abs(u);
  if (s.outline === "wing-shaped") {
    // Linear taper — triangular wings. Slightly convex (0.95 exponent)
    // so the wings have a faint curve rather than being pure straight
    // lines, which reads better as a real shell.
    return Math.max(0, 1 - Math.pow(au, 0.95));
  }
  if (s.outline === "conical") {
    // Narrower than wing-shaped (the body itself is narrow) and the
    // taper is sharper, so most of the silhouette rises into the
    // central pyramidal peak. The halfWidth is also smaller, so this
    // shape factor controls only the relative curvature.
    return Math.max(0, 1 - Math.pow(au, 1.3));
  }
  // Dome model — subcircular / pentagonal / elongate-oval
  return Math.max(0, 1 - au * au);
}

// frontFoldSplit — distribute the fold's rise between three places it
// can visually manifest in the front view:
//   * outerDorsal  : how much the dorsal silhouette rises at center
//   * outerVentral : how much the ventral silhouette pulls UP at center
//                    (the sulcus indent visible in the outer outline)
//   * commissure   : how much the internal commissure line peaks at center
//                    (the V where dorsal & ventral surfaces meet INSIDE)
//
// The user's red-overlay diagnostics showed that:
//
//  • For dome shells (Gypidula / atrypids / orthids — subcircular,
//    pentagonal, elongate-oval) the OUTER silhouette is a smooth dome
//    with no visible fold influence. The fold lives entirely in the
//    INTERNAL commissure line — a clear V/peak inside the dome where
//    dorsal and ventral surfaces meet at the midline.
//
//  • For triangular shells (wing-shaped, conical) the OUTER silhouette
//    IS the commissure (no separate inner line). The dorsal outline
//    rises into a central peak; the ventral outline pulls UP at center
//    creating a W-shape with lateral lobes and a midline V-indent.
function frontFoldSplit(s) {
  if (s.outline === "wing-shaped") {
    // Alate spiriferid (Cyrtospirifer) — anterior view shows a near
    // diamond/kite with the dorsal triangle peaked by the fold and the
    // ventral triangle pointing DOWN to the sulcus. The sulcus produces
    // only a subtle V-indent on the bottom outline (brach4 anterior),
    // not a Conispirifer-style deep W.
    return { outerDorsal: 0.30, outerVentral: 0.25, commissure: 0.30 };
  }
  if (s.outline === "conical") {
    // Dorsal: modest fold contribution (the conical's dorsal valve is
    // small/flat — most DV depth lives in the ventral cone seen in side
    // view). Ventral: the sulcus carves a V into the bottom outline but
    // the absolute depth has to match the foreshortened front-view
    // ventral body (see frontVentralY's ventralScale).
    return { outerDorsal: 0.30, outerVentral: 0.50, commissure: 0.15 };
  }
  // Dome outlines — atrypids, orthids, pentameroids, terebratulids.
  // The user's brach1/brach6 critique notes that real specimens have
  // a deep U/V deflection of the anterior margin — the outer silhouette
  // genuinely deforms, it isn't just a smooth dome with an interior V.
  // Outer contributions raised so the front view shows real margin
  // deflection; commissure line still arches higher than the outer
  // because the dorsal-meets-ventral seam runs through the fold's apex.
  return { outerDorsal: 0.45, outerVentral: 0.40, commissure: 1.40 };
}

// frontValveScale — front-view foreshortening.
//
// The side view shows full DV depth; the front view's anterior
// projection captures only a fraction of that depth depending on
// HOW FORESHORTENED the cone is. apexShift modulation applies
// PRIMARILY to outlines where the body genuinely tapers along AP
// (conical, wing-shaped). For dome outlines (subcircular, etc.) the
// body is centered regardless of beak prominence — globose shells
// stay tall in front view, which is what the user critique flagged.
function frontValveScale(s) {
  if (s.outline === "conical") {
    // Conical — ventral cone is heavily foreshortened. Higher apexShift
    // (more pyramidal) pushes the apex even further back, so the
    // anterior projection captures less of the cone depth → flatter.
    const apexCentered = 1.0 - Math.min(1.0, s.apexShift / 0.6);
    const factor = 0.55 + 0.45 * apexCentered;
    return { dorsal: factor, ventral: 0.35 * factor };
  }
  if (s.outline === "wing-shaped") {
    // Wing-shaped — moderate foreshortening from the lateral extent;
    // less sensitive to apexShift since wings are at full lateral.
    return { dorsal: 0.60, ventral: 0.55 };
  }
  // Dome outlines — front view shows the full body cross-section, no
  // foreshortening. Globose specimens (Pseudoatrypa, Theodossia) read
  // as tall in front view, matching the photo's apparent volume.
  return { dorsal: 1.0, ventral: 1.0 };
}

function frontDorsalY(u, s) {
  const scale = frontValveScale(s);
  if (s.outline === "wing-shaped" || s.outline === "conical") {
    // Triangular outlines: dorsal silhouette is a SINGLE smooth triangle.
    // Peak height = foreshortened body + fold contribution. The body's
    // shape function provides the descent to wingtips.
    const peak = s.dorsalConv * scale.dorsal + foldRiseAt(0, s) * frontFoldSplit(s).outerDorsal;
    return peak * frontBodyShape(u, s);
  }
  // Dome outlines: smooth dome + minimal fold contribution to outer
  const body = s.dorsalConv * frontBodyShape(u, s);
  const fold = foldRiseAt(u, s) * frontFoldSplit(s).outerDorsal;
  return body + fold;
}

function frontVentralY(u, s) {
  // Ventral keeps the additive body+sulcus model. The sulcus creates a
  // V-indent at center on triangular outlines; for wing-shaped the
  // contribution is small (brach4 anterior shows a near-diamond with
  // subtle V); for conical the contribution is moderate (brach3 shows
  // a clear W). Body foreshortening (frontValveScale) keeps the lobe
  // depth proportional to the projected ventral height.
  const scale = frontValveScale(s);
  const body = s.ventralConv * scale.ventral * frontBodyShape(u, s);
  const fold = foldRiseAt(u, s) * frontFoldSplit(s).outerVentral;
  return body - fold;
}

function frontDorsalCurve(s) {
  const cx = 100, cy = 100;
  const halfW = s.halfWidth;
  const N = 120;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = (i / N - 0.5) * 2;          // -1..1
    const x = cx + u * halfW;
    let y = cy - frontDorsalY(u, s);
    if (s.ribCount > 0) {
      const ribness = Math.cos(u * Math.PI / 2) ** 2;
      const phase = (u + 1) * Math.PI * s.ribCount / 2;
      y -= s.ribAmp * 0.55 * ribness * Math.sin(phase);
    }
    pts.push([x, y]);
  }
  return pts;
}

function frontVentralCurve(s) {
  const cx = 100, cy = 100;
  const halfW = s.halfWidth;
  const N = 120;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = (i / N - 0.5) * 2;
    const x = cx + u * halfW;
    let y = cy + frontVentralY(u, s);
    if (s.ribCount > 0) {
      const ribness = Math.cos(u * Math.PI / 2) ** 2;
      const phase = (u + 1) * Math.PI * s.ribCount / 2;
      y += s.ribAmp * 0.55 * ribness * Math.sin(phase);
    }
    pts.push([x, y]);
  }
  return pts;
}

function frontCommissureLine(s) {
  // Internal commissure line — the V/peak inside the outer silhouette
  // where the dorsal and ventral surfaces meet at the midline. For
  // dome-bodied shells (atrypids, pentameroids) this is the PRIMARY
  // way the fold reads on the front view because the outer silhouette
  // stays a smooth dome. For triangular shells (wing-shaped/conical)
  // the outer outline already carries the fold so the internal line
  // is suppressed (commissureCoef ~0.2).
  const cx = 100, cy = 100;
  const halfW = s.halfWidth;
  const split = frontFoldSplit(s);
  const N = 240;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const u = (i / N - 0.5) * 2;
    const x = cx + u * halfW;
    let y = cy - foldRiseAt(u, s) * split.commissure;
    if (s.ribCount > 0) {
      const ribness = Math.cos(u * Math.PI / 2) ** 2;
      y += s.ribAmp * 0.7 * ribness * Math.cos((u + 1) * Math.PI * s.ribCount / 2);
    }
    d += (i === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
  }
  const dash = s.foldStr > 0 ? "" : "3,2";
  const sw   = s.foldStr > 0 ? 1.6 : 1.0;
  return `<path d="${d}" fill="none" stroke="#333" stroke-width="${sw}" stroke-dasharray="${dash}"/>`;
}

function frontGrowthArcs(s) {
  // Growth lines arc BACK and UP toward the hinge (where the dorsal apex is
  // when seen end-on). Each line is a scaled-down copy of the dorsal valve
  // outline, contracted toward the apex point. Older growth lines are
  // narrower AND sit higher — they don't touch the lateral commissure.
  const cx = 100, cy = 100;
  const halfW = s.halfWidth;
  const N = 64;
  const dorsalApex = Math.max(0, s.dorsalConv) + foldRiseAt(0, s) * 0.95;
  const y_apex = cy - dorsalApex;
  const K = 5;
  const arcs = [];
  for (let k = 1; k <= K; k++) {
    const f = k / (K + 1);
    let d = "";
    for (let i = 0; i <= N; i++) {
      const u = (i / N - 0.5) * 2;
      const y_silhouette = cy - frontDorsalY(u, s);
      const x = cx + (1 - f) * u * halfW;
      const y = y_apex + (1 - f) * (y_silhouette - y_apex);
      d += (i === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    }
    arcs.push(`<path d="${d}" fill="none" stroke="${SK.growthCol}" stroke-width="${SK.growthW}"/>`);
  }
  return arcs.join("");
}

function frontFrills(s) {
  // Bolder lamellae — same geometry as growth arcs, drawn fewer + thicker.
  const cx = 100, cy = 100;
  const halfW = s.halfWidth;
  const N = 48;
  const arcs = [];

  function valveArc(sign, k, K) {
    const f = k / (K + 1);
    const conv = sign === -1 ? s.dorsalConv : s.ventralConv;
    if (Math.abs(conv) < 5) return null;
    let d = "";
    for (let i = 0; i <= N; i++) {
      const u = (i / N - 0.5) * 2;
      const shape = frontBodyShape(u, s);
      const x = cx + u * halfW * (1 - 0.12 * f);
      let y = cy + sign * Math.abs(conv) * shape * (1 - f);
      if (sign === -1 && conv < 0) y = cy + Math.abs(conv) * shape * (1 - f);
      if (sign === +1 && conv < 0) y = cy - Math.abs(conv) * shape * (1 - f);
      const riseScale = sign === -1 ? 0.95 : 0.9;
      y -= foldRiseAt(u, s) * riseScale * (1 - f);
      d += (i === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  }

  for (let k = 1; k <= 2; k++) {
    const dD = valveArc(-1, k, 2);
    if (dD) arcs.push(`<path d="${dD}" fill="none" stroke="${SK.frillCol}" stroke-width="${SK.frillW * 0.85}" opacity="0.85"/>`);
    const dV = valveArc(+1, k, 2);
    if (dV) arcs.push(`<path d="${dV}" fill="none" stroke="${SK.frillCol}" stroke-width="${SK.frillW * 0.85}" opacity="0.85"/>`);
  }
  return arcs.join("");
}

function frontSpines(s) {
  const cx = 100, cy = 100;
  let out = "";
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a = i * 137.5 * Math.PI / 180;
    const r = Math.sqrt((i + 0.5) / N) * 0.78;
    const xf = r * Math.cos(a);
    const yf = r * Math.sin(a);
    const x = cx + xf * s.halfWidth * 0.85;
    const conv = yf < 0 ? Math.max(0, s.dorsalConv) : Math.max(0, s.ventralConv);
    const y = cy + Math.sign(yf) * Math.abs(yf) * conv * 0.95;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.4" fill="#222"/>`;
  }
  return out;
}

function svgFrontView(answers) {
  const s = answersToShape(answers);
  const top = frontDorsalCurve(s);
  const bot = frontVentralCurve(s).reverse();
  const outlinePath = pointsToPath(top.concat(bot));
  const clipId = "brachFrontClip_" + Math.floor(Math.random() * 1e6);

  let inner = "";
  if (s.hasGrowthLines && !s.hasFrills) inner += frontGrowthArcs(s);
  if (s.hasFrills)                      inner += frontFrills(s);
  if (s.hasSpines)                      inner += frontSpines(s);

  const commissure = frontCommissureLine(s);

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-front">
    <defs><clipPath id="${clipId}"><path d="${outlinePath}"/></clipPath></defs>
    <path d="${outlinePath}" fill="#fffef7" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round"/>
    <g clip-path="url(#${clipId})">${inner}</g>
    ${commissure}
  </svg>`;
}

// ============================================================
// SIDE VIEW — right lateral, looking from outside
// ============================================================
// Beak at left (posterior), anterior commissure at right.
// Strophic shells show an interarea wall at the back; astrophic shells curve
// smoothly to a beak tip. Default biconvex = dorsibiconvex so the silhouette
// is taller above the midline than below.
//
// Rib pattern: the side view does NOT draw ribs as parallel longitudinal
// stripes (that read as growth lines, not ribs). Instead, ribs are encoded
// in the anterior commissure edge: each rib produces a small zigzag notch
// where it crosses the commissure. Smooth shells have a straight commissure;
// dense ribs make fine teeth; sparse ribs make coarse crenulations. This is
// a diagnostic field-ID cue.

// ============================================================
// Side view — two-valve model
// ============================================================
//
// Each valve is drawn as its own closed shape. The dorsal valve sits
// above the commissure plane (cy), the ventral valve below. They meet
// at the anterior commissure (frontX) and, for strophic shells, at the
// hinge point (beakX, cy) with an interarea face on each valve. For
// astrophic shells the two beaks meet directly at (beakX, cy) and coil
// opposite directions.
//
// Each valve's outline includes its OWN beak curl as part of the path,
// so the iconic brachiopod beak-coiling reads natively in side view
// instead of being a stuck-on overlay.

// commissureY(u, s) — the y-coordinate of the commissure plane as a
// FUNCTION OF AP position u ∈ [-1, +1]. For most shells this is just
// cy (flat plane). But strophomenids with geniculate trails curl the
// commissure downward at the anterior; resupinate forms swing it
// upward. Treating the commissure as a renderable curve (not a flat
// datum) lets the side view handle concavo-convex/geniculate shells
// without the two-halves-around-cy straightjacket that was glitching
// brach7. Both valves close along this curve.
function commissureY(u, s) {
  const cy = 100;
  if (s.lateralType === "geniculate" && u > 2 * s.lateralKinkAt - 1) {
    const kinkU = 2 * s.lateralKinkAt - 1;
    const t = (u - kinkU) / (1 - kinkU);
    // Commissure follows ~60% of the ventral trail drop — the dorsal
    // partially follows the ventral down, so the meeting plane drops
    // less than the ventral trail itself
    return cy + s.lateralDropPx * Math.pow(t, 1.25) * 0.60;
  }
  if (s.lateralType === "resupinate" && u > 2 * s.lateralKinkAt - 1) {
    const kinkU = 2 * s.lateralKinkAt - 1;
    const t = (u - kinkU) / (1 - kinkU);
    return cy - 10 * Math.pow(t, 1.2);   // commissure rises at anterior
  }
  return cy;
}

// Returns { fill, stroke }: a closed path for fill (with the commissure
// closure included) and an OPEN path for the stroke (silhouette + beak
// curl + optional interarea face only — no horizontal commissure line).
// Splitting these is what removes the "T-bar through the middle"
// artifact: the commissure isn't a true outer edge, so it shouldn't be
// stroked even though the closed fill needs it.
function sideValveClosedPath(s, isDorsal) {
  const cx = 100, cy = 100;
  const halfL = s.halfLength;
  const beakX = cx - halfL;
  const frontX = cx + halfL;
  const sign = isDorsal ? -1 : 1;
  const conv = isDorsal ? s.dorsalConv : s.ventralConv;

  // === Cubic Bezier silhouette ===
  // Each valve's outer outline is now TWO cubic-Bezier segments
  // (back-anchor → apex, apex → anterior tip) instead of joined
  // half-parabolas. Bezier handles give organic control over taper
  // sharpness, flat regions near the apex, and asymmetric front/back
  // shaping that parabolas couldn't express.
  //
  // C¹ continuity at the apex is enforced by placing both control
  // points adjacent to the apex on the SAME horizontal line (y = apexY)
  // — so the tangent at the apex is horizontal on both sides.
  // Similarly the back-anchor and anterior-tip endpoints get
  // horizontal-tangent control points for smooth attachment to the
  // closure path.

  // Apex position
  const apexU = -s.apexShift;
  const apexX = beakX + (1 + apexU) / 2 * 2 * halfL;
  const apexY = cy + sign * conv * 0.95;

  // Anchors
  const backAnchorY = s.interareaH > 0 ? cy + sign * s.interareaH * 0.5 : cy;
  const anteriorHalf = s.foldStr * 11;
  const frontTipY = commissureY(1, s) + sign * anteriorHalf;

  // Handle lengths per outline — different shells have different
  // natural curvature profiles. backH = at back-anchor; apexBackH /
  // apexFrontH = at the apex (both sides); frontH = at anterior tip.
  // Larger handle = flatter / more drawn-out curve; smaller = sharper.
  let backH, apexBackH, apexFrontH, frontH;
  if (s.outline === "conical") {
    // Conical (Conispirifer) — sharp posterior (interarea wall is the
    // back), long gradual taper to anterior point
    backH = halfL * 0.10;
    apexBackH = halfL * 0.25;
    apexFrontH = halfL * 0.55;
    frontH = halfL * 0.20;
  } else if (s.outline === "wing-shaped") {
    // Wing-shaped (Cyrtospirifer) — modest back, balanced front
    backH = halfL * 0.18;
    apexBackH = halfL * 0.32;
    apexFrontH = halfL * 0.42;
    frontH = halfL * 0.35;
  } else {
    // Dome outlines — globose biconvex. Long handles around the apex
    // produce a flat-topped/curving body (not parabolic balloon),
    // shorter handles at the endpoints give natural taper to the
    // commissure/hinge.
    backH = halfL * 0.22;
    apexBackH = halfL * 0.50;
    apexFrontH = halfL * 0.50;
    frontH = halfL * 0.25;
  }

  // Clamp handles so they don't exceed segment distance
  const backDist = Math.max(1, apexX - beakX);
  const frontDist = Math.max(1, frontX - apexX);
  backH = Math.min(backH, backDist * 0.45);
  apexBackH = Math.min(apexBackH, backDist * 0.65);
  apexFrontH = Math.min(apexFrontH, frontDist * 0.65);
  frontH = Math.min(frontH, frontDist * 0.45);

  // Sample the silhouette by Bezier parameter t (not by uniform x)
  function bz(t, p0, p1, p2, p3) {
    const omt = 1 - t;
    return omt*omt*omt*p0 + 3*omt*omt*t*p1 + 3*omt*t*t*p2 + t*t*t*p3;
  }
  const N_BACK = 36;
  const N_FRONT = 48;
  const sil = [];

  // Back segment: beak/back-anchor → apex
  for (let i = 0; i <= N_BACK; i++) {
    const t = i / N_BACK;
    const x = bz(t, beakX, beakX + backH, apexX - apexBackH, apexX);
    const y = bz(t, backAnchorY, backAnchorY, apexY, apexY);
    sil.push([x, y]);
  }
  // Front segment: apex → anterior tip (skip first to avoid duplicate)
  for (let i = 1; i <= N_FRONT; i++) {
    const t = i / N_FRONT;
    const x = bz(t, apexX, apexX + apexFrontH, frontX - frontH, frontX);
    let y = bz(t, apexY, apexY, frontTipY, frontTipY);

    // Lateral kinks applied as Y-perturbation in the front segment
    const u = (x - cx) / halfL;
    if (!isDorsal && s.lateralType === "geniculate" && u > 2 * s.lateralKinkAt - 1) {
      const kinkU = 2 * s.lateralKinkAt - 1;
      const tt = (u - kinkU) / (1 - kinkU);
      const ease = Math.pow(tt, 1.25);
      y += s.lateralDropPx * ease;
    }
    if (s.lateralType === "resupinate" && u > 2 * s.lateralKinkAt - 1) {
      const kinkU = 2 * s.lateralKinkAt - 1;
      const tt = (u - kinkU) / (1 - kinkU);
      // Smoothly mirror the offset-from-cy across cy (the valve flips)
      const offset = y - cy;
      y = y * (1 - tt) + (cy - offset * 0.6) * tt;
    }
    sil.push([x, y]);
  }

  // === Beak coil — SEPARATE closed path, overlaps body interior ===
  // The coil is its own filled/stroked shape drawn ON TOP of the body
  // fill. Its inner return curve sweeps PAST the anchor into the body
  // interior, producing the tight "hooked beak tucks into the body"
  // geometry that the user critique flagged as missing. The body's own
  // outline (`stroke` below) terminates at the anchor and doesn't
  // include the coil, so the visible curl reads as a distinct hook
  // overlapping the body — exactly like brach6 (Theodossia)'s photo.
  let coil = "";
  if (s.beak !== "subdued") {
    const isWingShaped = s.outline === "wing-shaped";
    const isConical = s.outline === "conical";
    const baseFrac = isDorsal
      ? (isWingShaped ? 0.42 : isConical ? 0.30 : 0.28)
      : (isWingShaped ? 0.28 : isConical ? 0.20 : 0.18);
    const astroBoost = s.interareaH === 0 ? 1.7 : 1.0;
    const hookExt = halfL * baseFrac * astroBoost;
    const ax = beakX, ay = backAnchorY;
    // Tip extends BACK and AWAY from cy
    const tipX = ax - hookExt;
    const tipY = ay + sign * hookExt * 0.55;
    // Outer Bezier: anchor → tip via control points that bulge AWAY
    // from cy first (the outer rim of the hook arcs up/down past the
    // body), then sweep around to the tip.
    const oC1x = ax + hookExt * 0.10, oC1y = ay + sign * hookExt * 1.25;
    const oC2x = ax - hookExt * 1.15, oC2y = ay + sign * hookExt * 0.85;
    // Inner return Bezier: tip → anchor via control points that sweep
    // TOWARD cy and FORWARD (positive x past the anchor into the body
    // interior). This is the "tucking" motion that produces visible
    // overlap with the body fill — a real coiled hook, not a stuck-on
    // protrusion.
    const iC1x = ax - hookExt * 0.55, iC1y = ay - sign * hookExt * 0.05;
    const iC2x = ax + hookExt * 0.20, iC2y = ay - sign * hookExt * 0.15;
    coil = `M ${ax.toFixed(1)},${ay.toFixed(1)} ` +
           `C ${oC1x.toFixed(1)},${oC1y.toFixed(1)} ${oC2x.toFixed(1)},${oC2y.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ` +
           `C ${iC1x.toFixed(1)},${iC1y.toFixed(1)} ${iC2x.toFixed(1)},${iC2y.toFixed(1)} ${ax.toFixed(1)},${ay.toFixed(1)} Z`;
  }

  // === Body STROKE (open, silhouette + interarea face only) ===
  let stroke = `M ${frontX.toFixed(1)},${frontTipY.toFixed(1)}`;
  for (let i = sil.length - 1; i >= 0; i--) {
    stroke += ` L ${sil[i][0].toFixed(1)},${sil[i][1].toFixed(1)}`;
  }
  if (s.interareaH > 0) {
    stroke += ` L ${beakX.toFixed(1)},${cy.toFixed(1)}`;
  }

  // === Body FILL (closed, doesn't include the coil) ===
  // Closure goes from the back-anchor → hinge point (beakX, cy) →
  // along the COMMISSURE CURVE back to the anterior. For flat
  // commissure shells this is just a horizontal line at cy; for
  // geniculate/resupinate shells it follows the actual commissureY(u).
  let fill = stroke;
  // Sample the commissure from the hinge (u=-1) forward to anterior (u=1)
  const M = 40;
  for (let i = 1; i <= M; i++) {
    const u = -1 + (2 * i / M);
    const x = beakX + ((u + 1) / 2) * 2 * halfL;
    const y = commissureY(u, s);
    fill += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  fill += ` L ${frontX.toFixed(1)},${frontTipY.toFixed(1)} Z`;

  return { fill, stroke, coil };
}

function svgSideView(answers) {
  const s = answersToShape(answers);
  const cx = 100, cy = 100;
  const halfL = s.halfLength;
  const beakX = cx - halfL;
  const frontX = cx + halfL;

  // Per-valve paths — each returns { fill, stroke }. fill is a closed
  // path (includes commissure closure) used for the body color; stroke
  // is an open path (silhouette + curl + optional interarea face) for
  // the visible outline. Keeping these separate hides the commissure
  // line at cy that would otherwise stroke through the middle.
  const dorsal = sideValveClosedPath(s, true);
  const ventral = sideValveClosedPath(s, false);

  // Legacy dorsalY / ventralY for decoration helpers (ribs, spines).
  // Kept as smooth-parabola functions of x; not used for outline drawing.
  const peakU = -s.apexShift;
  function smoothParabola(u, conv) {
    if (u <= peakU) {
      const t = (u - (-1)) / (peakU - (-1));
      return cy - conv * (1 - (1 - t) ** 2) * 0.95;
    }
    const t = (u - peakU) / (1 - peakU);
    return cy - conv * (1 - t ** 2) * 0.95;
  }

  const dorsalY = (x) => {
    const u = (x - cx) / halfL;
    let y = smoothParabola(u, s.dorsalConv);
    if (s.lateralType === "resupinate" && u > 2 * s.lateralKinkAt - 1) {
      // Anterior third inverts: the dorsal valve curves DOWN instead of up.
      const t = (u - (2 * s.lateralKinkAt - 1)) / (1 - (2 * s.lateralKinkAt - 1));
      const baseY = smoothParabola(u, s.dorsalConv);
      const flipped = cy + (cy - baseY) * 0.6;   // mirrored across cy
      y = baseY * (1 - t) + flipped * t;
    }
    return y;
  };

  const ventralY = (x) => {
    const u = (x - cx) / halfL;
    let y;
    if (s.lateralType === "geniculate" && u > 2 * s.lateralKinkAt - 1) {
      // Sharp angular bend in the ventral valve at kinkAt — typical of
      // Douvillina-style concavo-convex strophomenids. Before the kink the
      // ventral is gently convex; after the kink the trail drops sharply.
      const kinkU = 2 * s.lateralKinkAt - 1;
      const kinkY = cy + Math.max(0, s.ventralConv) * 0.55;
      const t = (u - kinkU) / (1 - kinkU);
      y = kinkY + s.lateralDropPx * t;
    } else {
      y = smoothParabola(u, -s.ventralConv);   // ventral apex below cy
      if (s.lateralType === "resupinate" && u > 2 * s.lateralKinkAt - 1) {
        const t = (u - (2 * s.lateralKinkAt - 1)) / (1 - (2 * s.lateralKinkAt - 1));
        const baseY = smoothParabola(u, -s.ventralConv);
        const flipped = cy - (baseY - cy) * 0.6;
        y = baseY * (1 - t) + flipped * t;
      }
    }
    return y;
  };

  // Interarea-induced offset at the back (used by overlay decoration).
  const interareaTop = cy - s.interareaH * 0.5;
  const interareaBot = cy + s.interareaH * 0.5;
  const anteriorHalf = 5 + s.foldStr * 9;

  // Anterior commissure zigzag — drawn as a separate overlay between the
  // two valves' anterior tips so the rib teeth pattern reads on the front
  // edge of the shell.
  const commXInner = cx + halfL * 0.96;
  const commXOuter = frontX;
  let zigzagPath = "";
  if (s.ribCount > 0 && s.ribAmp > 0) {
    const visibleTeeth = Math.max(4, Math.min(16, Math.round(s.ribCount * 0.6)));
    const yStart = cy - anteriorHalf;
    const yEnd   = cy + anteriorHalf;
    const totalSteps = visibleTeeth * 2 + 1;
    const amp = Math.min(s.ribAmp, halfL * 0.10);
    let zd = `M ${commXOuter.toFixed(1)},${yStart.toFixed(1)}`;
    for (let i = 1; i < totalSteps; i++) {
      const u = i / totalSteps;
      const y = yStart + (yEnd - yStart) * u;
      const x = (i % 2 === 1) ? commXOuter + amp * 0.4 : commXInner;
      zd += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
    }
    zd += ` L ${commXOuter.toFixed(1)},${yEnd.toFixed(1)}`;
    zigzagPath = `<path d="${zd}" fill="none" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round"/>`;
  }

  const clipId = "brachSideClip_" + Math.floor(Math.random() * 1e6);

  let inner = "";

  // ---- Growth lines / frills ----
  //
  // Dropped from the side view. Growth lines on a 3D shell are concentric
  // loops on the dorsal (or ventral) surface around the umbo. Projected to
  // a strict lateral plane (y, z), each loop's two halves collapse onto a
  // single curve that emanates from the umbo point — a fan, not nested
  // concentric arcs. Frills have the same projection problem. Rather than
  // ship a stylization that misrepresents the geometry, the side view now
  // omits both. The diagnostic rib info still shows up in the anterior
  // commissure zigzag and the longitudinal rib traces below.

  // ---- Longitudinal rib traces on dorsal/ventral surfaces ----
  //
  // Ribs run from the beak area to the anterior commissure along each
  // valve's surface. The visible ribs in a lateral view are those whose
  // lateral position (around the perimeter) puts them on the near side of
  // the shell. We stack a few fine traces between the dorsal apex curve
  // and the commissure level (and the same on the ventral side), each
  // representing a rib at a different lateral position.
  if (s.ribCount > 0 && s.ribAmp > 0) {
    const visibleRibs = Math.min(10, Math.max(4, Math.round(s.ribCount * 0.45)));
    const steps = 36;
    // Dorsal-surface ribs
    for (let r = 0; r < visibleRibs; r++) {
      const depthFrac = (r + 0.5) / visibleRibs;     // 0 = apex, 1 = commissure
      let d = "";
      for (let j = 0; j <= steps; j++) {
        const u = j / steps;
        const x = beakX + u * 2 * halfL;
        const dY = dorsalY(x);
        const valveDepth = Math.max(0, cy - dY);
        // Each rib trace sits at a fixed depth fraction below the dorsal
        // apex curve, so the family of traces parallels the dorsal profile
        // (concentric stripes are visually distinct from growth lines now
        // that those have been removed).
        const y = dY + depthFrac * valveDepth;
        d += (j === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
      }
      inner += `<path d="${d}" fill="none" stroke="${SK.ribCol}" stroke-width="${SK.ribW * 0.85}"/>`;
    }
    // Ventral-surface ribs (only if the ventral valve is meaningfully convex)
    if (s.ventralConv > 8) {
      for (let r = 0; r < visibleRibs; r++) {
        const depthFrac = (r + 0.5) / visibleRibs;
        let d = "";
        for (let j = 0; j <= steps; j++) {
          const u = j / steps;
          const x = beakX + u * 2 * halfL;
          const vY = ventralY(x);
          const valveDepth = Math.max(0, vY - cy);
          const y = vY - depthFrac * valveDepth;
          d += (j === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
        }
        inner += `<path d="${d}" fill="none" stroke="${SK.ribCol}" stroke-width="${SK.ribW * 0.85}"/>`;
      }
    }
  }

  // ---- Spines ----
  if (s.hasSpines) {
    const NS = 20;
    for (let i = 0; i < NS; i++) {
      const a = i * 137.5 * Math.PI / 180;
      const r = Math.sqrt((i + 0.5) / NS) * 0.75;
      const xf = r * Math.cos(a);
      const yf = -Math.abs(r * Math.sin(a));
      const x = cx + xf * halfL * 0.92;
      const yTop = dorsalY(x);
      const y = cy + yf * (cy - yTop) * 0.9;
      inner += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="#222"/>`;
    }
    for (let i = 0; i < 5; i++) {
      const t = 0.18 + i * 0.18;
      const x = beakX + t * 2 * halfL;
      const dY = dorsalY(x);
      inner += `<line x1="${x.toFixed(1)}" y1="${dY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(dY - 8).toFixed(1)}" stroke="#222" stroke-width="1.2"/>`;
    }
  }

  // ---- Beak / interarea overlay ----
  //
  // The back interarea has to read as distinctly different from the
  // anterior commissure (which may have rib-zigzag teeth that look like
  // a similar trapezoidal protrusion). We do three things to disambiguate:
  //   - the interarea is drawn DARKER and with PARALLEL HATCH LINES
  //     (interareas in real shells are striated)
  //   - the interarea extends FURTHER posteriorly than the rib teeth
  //     extend anteriorly
  //   - a small "← P" posterior label sits just behind the interarea
  let overlay = "";
  // Each valve's beak curl is now drawn by sideValveClosedPath itself —
  // no separate hook overlay needed.
  if (s.interareaH > 0) {
    // Larger tilt — the interarea looks like a real flat wall, deeper than
    // any rib-zigzag teeth at the anterior.
    const tilt = 10;
    const x0 = beakX, y0a = interareaTop, y0b = interareaBot;
    const x1 = beakX - tilt;
    // Wall fill (paler than shell so it reads as a separate surface)
    overlay += `<path d="M ${x0.toFixed(1)},${y0a.toFixed(1)} L ${x1.toFixed(1)},${(y0a - 1).toFixed(1)} L ${x1.toFixed(1)},${(y0b + 1).toFixed(1)} L ${x0.toFixed(1)},${y0b.toFixed(1)} Z" fill="#cdc6b1" stroke="${SK.hingeCol}" stroke-width="1.6"/>`;
    // Vertical hatching lines on the interarea — real interareas are
    // striated by growth lines perpendicular to the hinge.
    const nHatch = 5;
    for (let i = 1; i < nHatch; i++) {
      const hx = x0 + (x1 - x0) * (i / nHatch);
      overlay += `<line x1="${hx.toFixed(1)}" y1="${(y0a + 1).toFixed(1)}" x2="${hx.toFixed(1)}" y2="${(y0b - 1).toFixed(1)}" stroke="${SK.hingeCol}" stroke-width="0.6" opacity="0.55"/>`;
    }
    // Delthyrium triangle (dark notch in the middle of the interarea)
    const mid = (interareaTop + interareaBot) / 2;
    const trW = 7;
    overlay += `<path d="M ${(x0 - tilt * 0.35).toFixed(1)},${(mid - trW * 0.6).toFixed(1)} L ${(x1 + tilt * 0.15).toFixed(1)},${mid.toFixed(1)} L ${(x0 - tilt * 0.35).toFixed(1)},${(mid + trW * 0.6).toFixed(1)} Z" fill="#1a1a1a" opacity="0.7"/>`;
    // Tiny posterior-direction tick mark
    overlay += `<line x1="${(x1 - 4).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(x1 - 1).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${SK.hingeCol}" stroke-width="1.4"/>`;
    overlay += `<path d="M ${(x1 - 4).toFixed(1)},${cy.toFixed(1)} L ${(x1 - 1).toFixed(1)},${(cy - 2).toFixed(1)} L ${(x1 - 1).toFixed(1)},${(cy + 2).toFixed(1)} Z" fill="${SK.hingeCol}"/>`;
  } else if (s.beakProm > 0) {
    // Astrophic curved beak — small protruding tip at posterior.
    const beakTipX = beakX - 5;
    overlay += `<path d="M ${beakX.toFixed(1)},${(cy - 5).toFixed(1)} Q ${beakTipX.toFixed(1)},${cy.toFixed(1)} ${beakX.toFixed(1)},${(cy + 5).toFixed(1)} Z" fill="#1a1a1a" opacity="0.55"/>`;
  }
  // Anterior commissure edge — when the shell is smooth (no rib zigzag),
  // draw a faint vertical edge so the front face still reads as a flat
  // commissure join rather than a pointed tip.
  if ((s.foldStr > 0 || s.interareaH > 0) && s.ribCount === 0) {
    overlay += `<line x1="${frontX.toFixed(1)}" y1="${(cy - anteriorHalf).toFixed(1)}" x2="${frontX.toFixed(1)}" y2="${(cy + anteriorHalf).toFixed(1)}" stroke="#444" stroke-width="0.9" stroke-dasharray="3,2"/>`;
  }

  // Two-valve render order:
  //   1. Fill both valve bodies (no stroke)
  //   2. Decoration clipped to body fills
  //   3. Interarea overlay between the valves at the back
  //   4. Beak coils — drawn ON TOP, with fill (so the inner-arc
  //      sweeps past the anchor and visually overlaps the body) and
  //      stroke (the visible hook outline)
  //   5. Body silhouette stroke (outer edges of each valve)
  //   6. Anterior commissure zigzag (if ribs)
  const unionFill = dorsal.fill + " " + ventral.fill;
  const ventralCoilSvg = ventral.coil
    ? `<path d="${ventral.coil}" fill="#fffef7" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round"/>` : "";
  const dorsalCoilSvg = dorsal.coil
    ? `<path d="${dorsal.coil}" fill="#fffef7" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round"/>` : "";
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="brach-view brach-side">
    <defs><clipPath id="${clipId}"><path d="${unionFill}"/></clipPath></defs>
    <path d="${ventral.fill}" fill="#fffef7" stroke="none"/>
    <path d="${dorsal.fill}" fill="#fffef7" stroke="none"/>
    <g clip-path="url(#${clipId})">${inner}</g>
    ${overlay}
    ${ventralCoilSvg}
    ${dorsalCoilSvg}
    <path d="${ventral.stroke}" fill="none" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${dorsal.stroke}" fill="none" stroke="black" stroke-width="${SK.outlineW}" stroke-linejoin="round" stroke-linecap="round"/>
    ${zigzagPath}
  </svg>`;
}

// ============================================================
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
    <path d="${d}" fill="#fffef7" stroke="black" stroke-width="2.2" stroke-linejoin="round"/>
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
    <path d="${d}" fill="#fffef7" stroke="black" stroke-width="2.2" stroke-linejoin="round"/>
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
    <path d="${d}" fill="#fffef7" stroke="black" stroke-width="2.2" stroke-linejoin="round"/>
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
