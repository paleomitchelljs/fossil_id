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
  for (const c of [].concat(children)) {
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
      const href = opt.result
        ? `${siteBase(sid)}/key/result/${opt.result.subgroups.join(",")}`
        : `${siteBase(sid)}/key/${opt.next}`;
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
  const raw = location.hash.replace(/^#\/?/, "");
  return raw.split("/").filter(Boolean).map(decodeURIComponent);
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
    else if (p[2] === "all")                view = viewAll(sid);
    else                                     view = viewNotFound();
  }
  else                                       view = viewNotFound();
  root.appendChild(view);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
