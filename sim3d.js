// sim3d.js — embeddable 3D brachiopod valve growth model.
// Ported from the standalone Sim/brachiopod_growth.html and wrapped as a
// mountable module (window.Sim3D) that renders into a container <canvas>.
// render.js drives it: builds the sliders, calls setParams(), and reads
// simTraits()/traitsToParams() to narrow species against the manifest.
//
// Requires THREE (loaded before this file). Model length L is normalized to 1.

const Sim3D = (function () {
  "use strict";

  // ---- parameters ---------------------------------------------------------
  const DEFAULTS = {
    width: 0.55, hinge: 0.12, wpos: 0.5, front: 0.7,
    convV: 0.24, convD: 0.22, beak: 0.12,
    fold: 0.0, plic: 0, ribs: 0, ribDepth: 0.02,
    growthN: 0, growthDepth: 0.01, bumps: 0, delth: 0
  };

  // Slider definitions with labelled categorical regions (`regions` partitions
  // the range; render.js draws the boundary labels under each slider).
  const GROUPS = [
    { title: "Outline & proportion", params: [
      { key: "width", min: 0.30, max: 1.30, step: 0.01, label: "Width : length",
        regions: [{ to: 0.475, name: "elongate" }, { to: 0.72, name: "subcircular" }, { to: 1.30, name: "transverse / winged" }] },
      { key: "hinge", min: 0.0, max: 1.0, step: 0.01, label: "Hinge width",
        regions: [{ to: 0.45, name: "astrophic (curved)" }, { to: 1.0, name: "strophic (straight)" }] },
      { key: "wpos", min: 0.0, max: 1.0, step: 0.01, label: "Widest point",
        regions: [{ to: 0.25, name: "at hinge" }, { to: 1.0, name: "mid / anterior" }] },
      { key: "front", min: 0.1, max: 1.0, step: 0.01, label: "Anterior breadth",
        regions: [{ to: 0.4, name: "tapered" }, { to: 1.0, name: "rounded" }] }
    ]},
    { title: "Profile (inflation)", params: [
      { key: "convV", min: 0.0, max: 0.75, step: 0.005, label: "Ventral convexity",
        regions: [{ to: 0.06, name: "flat" }, { to: 0.75, name: "convex" }] },
      { key: "convD", min: -0.25, max: 0.75, step: 0.005, label: "Dorsal convexity",
        regions: [{ to: -0.02, name: "concave" }, { to: 0.06, name: "flat" }, { to: 0.75, name: "convex" }] },
      { key: "beak", min: 0.0, max: 0.65, step: 0.005, label: "Beak / interarea",
        regions: [{ to: 0.18, name: "subdued" }, { to: 0.4, name: "prominent" }, { to: 0.65, name: "pyramidal" }] }
    ]},
    { title: "Commissure (fold & sulcus)", params: [
      { key: "fold", min: 0.0, max: 0.40, step: 0.005, label: "Fold / sulcus",
        regions: [{ to: 0.05, name: "none" }, { to: 0.16, name: "weak" }, { to: 0.40, name: "strong" }] },
      { key: "plic", min: 0, max: 8, step: 1, label: "Plications",
        regions: [{ to: 1, name: "uniplicate" }, { to: 8, name: "plicate" }] }
    ]},
    { title: "Cardinal area", params: [
      { key: "delth", min: 0, max: 2, step: 1, label: "Delthyrium",
        names: ["closed", "open", "foramen"] }
    ]},
    { title: "Ornament", params: [
      { key: "ribs", min: 0, max: 32, step: 1, label: "Costae (rib count)",
        regions: [{ to: 1, name: "smooth" }, { to: 18, name: "coarse" }, { to: 32, name: "fine" }] },
      { key: "ribDepth", min: 0.0, max: 0.06, step: 0.002, label: "Rib depth" },
      { key: "growthN", min: 0, max: 24, step: 1, label: "Growth lines (count)",
        regions: [{ to: 1, name: "none" }, { to: 9, name: "frills" }, { to: 24, name: "striae" }] },
      { key: "growthDepth", min: 0.0, max: 0.04, step: 0.001, label: "Growth-line relief" },
      { key: "bumps", min: 0.0, max: 1.5, step: 0.05, label: "Spiny tubercles",
        regions: [{ to: 0.05, name: "none" }, { to: 1.5, name: "spinose" }] }
    ]}
  ];
  const INT_KEYS = ["plic", "ribs", "growthN", "delth"];

  // ---- geometry (verbatim from the standalone) ----------------------------
  const NU = 100, NV = 200, L = 1.0;
  const smooth = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };

  function halfWidth(u, p) {
    const body = p.width, hingeHW = p.hinge * body, frontHW = p.front * body, wp = p.wpos;
    if (u <= wp) { const t = wp > 1e-4 ? u / wp : 1; return hingeHW + (body - hingeHW) * smooth(t); }
    const t = wp < 1 - 1e-4 ? (u - wp) / (1 - wp) : 0; return body + (frontHW - body) * smooth(t);
  }

  function valvePoint(sign, u, v, p, out) {
    const hw = halfWidth(u, p);
    let x = hw * v;
    const frontRound = 0.18;
    let y = L * u - frontRound * L * (u * u) * (v * v);
    y -= 0.5 * L;
    const bulge = Math.sin(Math.PI * u) * (1 - v * v);
    const conv = sign > 0 ? p.convV : p.convD;
    let z = sign * conv * bulge;
    if (sign > 0 && p.beak > 0) {
      // raised umbo / interarea as a smooth posterior shoulder. (A gaussian
      // here decayed faster than the valve convexity rose, leaving a valley
      // between beak and body at high beak; a smoothstep ramp merges them.)
      const reach = 0.5;
      const ramp = u < reach ? 1 - smooth(u / reach) : 0;
      const b = ramp * Math.pow(Math.cos(v * Math.PI / 2), 2);
      z += p.beak * b; y -= p.beak * 0.45 * b;
    }
    if (p.fold > 0 && p.plic > 0) z += p.fold * Math.pow(u, 3) * Math.cos(p.plic * Math.PI * v) * L;
    if (p.ribs > 0 && p.ribDepth > 0) {
      const wave = Math.cos(p.ribs * Math.PI * v);
      const win = Math.sin(Math.PI * Math.pow(u, 1.15)) * Math.pow(1 - v * v, 0.25);
      z += sign * p.ribDepth * wave * win * L;
    }
    if (p.growthN > 0 && p.growthDepth > 0) {
      const wave = Math.cos(p.growthN * 2 * Math.PI * u);
      const win = Math.pow(Math.sin(Math.PI * u), 0.3) * Math.pow(1 - v * v, 0.2);
      z += sign * p.growthDepth * wave * win * L;
    }
    if (p.bumps > 0) {
      const su = Math.sin(14 * Math.PI * u), sv = Math.sin(26 * Math.PI * v);
      const spot = Math.pow(Math.max(0, su) * Math.max(0, sv), 3);
      const win = Math.sin(Math.PI * u) * Math.pow(1 - v * v, 0.2);
      z += sign * p.bumps * 0.05 * spot * win * L;
    }
    out[0] = x; out[1] = y; out[2] = z;
  }

  function buildValveGeometry(sign, p) {
    const positions = new Float32Array((NU + 1) * (NV + 1) * 3);
    const tmp = [0, 0, 0]; let k = 0;
    for (let i = 0; i <= NU; i++) { const u = i / NU;
      for (let j = 0; j <= NV; j++) { const v = -1 + 2 * j / NV; valvePoint(sign, u, v, p, tmp);
        positions[k++] = tmp[0]; positions[k++] = tmp[1]; positions[k++] = tmp[2]; } }
    const indices = []; const row = NV + 1;
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      if (sign > 0) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setIndex(indices); g.computeVertexNormals(); return g;
  }

  function inDelthyrium(s, v, delth) {
    if (delth === 1) return Math.abs(v) < 0.32 * (1 - s);
    if (delth === 2) { const ds = (s - 0.78) * 1.4; return v * v + ds * ds < 0.030; }
    return false;
  }

  function buildInterarea(p) {
    const NS = 24; const pv = [0, 0, 0], pd = [0, 0, 0];
    const positions = new Float32Array((NS + 1) * (NV + 1) * 3); let k = 0;
    for (let i = 0; i <= NS; i++) { const s = i / NS;
      for (let j = 0; j <= NV; j++) { const v = -1 + 2 * j / NV;
        valvePoint(-1, 0, v, p, pd); valvePoint(+1, 0, v, p, pv);
        positions[k++] = pd[0] + (pv[0] - pd[0]) * s;
        positions[k++] = pd[1] + (pv[1] - pd[1]) * s;
        positions[k++] = pd[2] + (pv[2] - pd[2]) * s; } }
    const indices = []; const row = NV + 1;
    for (let i = 0; i < NS; i++) { const sc = (i + 0.5) / NS;
      for (let j = 0; j < NV; j++) { const vc = -1 + 2 * (j + 0.5) / NV;
        if (inDelthyrium(sc, vc, p.delth)) continue;
        const a = i * row + j, b = a + 1, c = a + row, d = c + 1; indices.push(a, b, c, b, d, c); } }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setIndex(indices); g.computeVertexNormals(); return g;
  }

  // ---- scene / mount ------------------------------------------------------
  let renderer, scene, model, persp, dorsalCam, frontCam, sideCam;
  let matV, matD, matInter, meshV, meshD, meshI;
  let container, canvas, raf = null, P = Object.assign({}, DEFAULTS);
  let az = 0.9, pol = 1.15, dist = 3.0, dragging = false, lx = 0, ly = 0, spin = true;

  function rebuild() {
    for (const o of [meshV, meshD, meshI]) if (o) { model.remove(o); o.geometry.dispose(); }
    meshV = new THREE.Mesh(buildValveGeometry(+1, P), matV);
    meshD = new THREE.Mesh(buildValveGeometry(-1, P), matD);
    meshI = new THREE.Mesh(buildInterarea(P), matInter);
    model.add(meshV, meshD, meshI);
  }

  function placeOrtho() {
    dorsalCam.position.set(0, 0, -3); dorsalCam.up.set(0, 1, 0); dorsalCam.lookAt(0, 0, 0);
    frontCam.position.set(0, 3, 0); frontCam.up.set(0, 0, -1); frontCam.lookAt(0, 0, 0);
    sideCam.position.set(3, 0, 0); sideCam.up.set(0, 0, 1); sideCam.lookAt(0, 0, 0);
  }
  function fitOrtho(cam, aspect) {
    const half = 0.95; let w = half, h = half;
    if (aspect > 1) w = half * aspect; else h = half / aspect;
    cam.left = -w; cam.right = w; cam.top = h; cam.bottom = -h; cam.updateProjectionMatrix();
  }
  function placePersp() {
    persp.position.set(dist * Math.sin(pol) * Math.sin(az), dist * Math.cos(pol), dist * Math.sin(pol) * Math.cos(az));
    persp.lookAt(0, 0, 0);
  }

  // Layout inside the container: perspective on top (larger), 3 ortho views below.
  function rects(W, H) {
    const split = Math.round(H * 0.40);      // bottom (ortho) strip height
    const cw = Math.floor(W / 3);
    return {
      persp:  { x: 0, y: split, w: W, h: H - split },
      dorsal: { x: 0, y: 0, w: cw, h: split },
      front:  { x: cw, y: 0, w: cw, h: split },
      side:   { x: 2 * cw, y: 0, w: W - 2 * cw, h: split }
    };
  }
  function renderView(cam, vp) {
    renderer.setViewport(vp.x, vp.y, vp.w, vp.h);
    renderer.setScissor(vp.x, vp.y, vp.w, vp.h);
    renderer.setScissorTest(true);
    renderer.render(scene, cam);
  }
  function frame() {
    raf = requestAnimationFrame(frame);
    const W = container.clientWidth, H = container.clientHeight;
    if (W < 2 || H < 2) return;
    renderer.setSize(W, H, false);
    if (spin && !dragging) az += 0.004;
    const v = rects(W, H);
    persp.aspect = v.persp.w / v.persp.h; persp.updateProjectionMatrix(); placePersp();
    fitOrtho(dorsalCam, v.dorsal.w / v.dorsal.h);
    fitOrtho(frontCam, v.front.w / v.front.h);
    fitOrtho(sideCam, v.side.w / v.side.h);
    renderView(persp, v.persp);
    renderView(dorsalCam, v.dorsal);
    renderView(frontCam, v.front);
    renderView(sideCam, v.side);
    renderer.setScissorTest(false);
  }

  function mount(containerEl) {
    container = containerEl;
    canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    container.appendChild(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x141414);
    model = new THREE.Group(); scene.add(model);
    matV = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide });
    matD = new THREE.MeshStandardMaterial({ color: 0x7fa6c9, roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide });
    matInter = new THREE.MeshStandardMaterial({ color: 0xb9b2a6, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide });
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(2, 3, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xcdd6e5, 0.35); fill.position.set(-3, -1, -2); scene.add(fill);
    persp = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    dorsalCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    frontCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    sideCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    placeOrtho();

    canvas.addEventListener("pointerdown", e => {
      // perspective pane occupies the top (offsetY 0 .. persp.h on screen)
      const v = rects(container.clientWidth, container.clientHeight);
      if (e.offsetY > v.persp.h) return;           // only orbit in the perspective pane
      dragging = true; lx = e.clientX; ly = e.clientY; spin = false;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", e => {
      if (!dragging) return;
      az -= (e.clientX - lx) * 0.01; pol -= (e.clientY - ly) * 0.01;
      pol = Math.max(0.15, Math.min(Math.PI - 0.15, pol)); lx = e.clientX; ly = e.clientY;
    });
    canvas.addEventListener("pointerup", () => dragging = false);

    rebuild(); if (!raf) frame();
  }

  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = null;
    if (renderer) renderer.dispose();
    renderer = scene = model = null; container = canvas = null;
  }
  function setParams(np) { P = Object.assign({}, DEFAULTS, np); if (renderer) rebuild(); }
  function setSpin(on) { spin = !!on; }

  // ---- trait <-> param mapping -------------------------------------------
  const firstOf = v => Array.isArray(v) ? v[0] : v;

  // taxon.traits (categorical, from manifest) -> continuous params for display
  function traitsToParams(traits) {
    const p = Object.assign({}, DEFAULTS);
    const t = traits || {};
    switch (firstOf(t.outline)) {
      case "wing-shaped":   p.width = 0.95; p.hinge = 0.85; p.wpos = 0.08; p.front = 0.30; break;
      case "conical":       p.width = 0.90; p.hinge = 0.92; p.wpos = 0.05; p.front = 0.25; p.beak = 0.30; break;
      case "elongate-oval": p.width = 0.42; p.hinge = 0.10; p.wpos = 0.55; p.front = 0.60; break;
      case "pentagonal":    p.width = 0.56; p.hinge = 0.15; p.wpos = 0.46; p.front = 0.55; break;
      default:              p.width = 0.55; p.hinge = 0.14; p.wpos = 0.50; p.front = 0.72;  // subcircular
    }
    switch (firstOf(t.profile)) {
      case "plano-convex":   p.convV = 0.28; p.convD = 0.03; break;
      case "concavo-convex": p.convV = 0.12; p.convD = -0.12; p.hinge = 0.92; p.wpos = 0.02; break;
      default:               p.convV = 0.26; p.convD = 0.24;  // biconvex
    }
    const hinge = firstOf(t.hinge);
    if (hinge === "astrophic") { if (p.hinge > 0.3) p.hinge = 0.14; }
    else if (hinge === "strophic" || hinge === "wide-strophic" || hinge === "narrow-strophic") {
      if (p.hinge < 0.5) p.hinge = (hinge === "narrow-strophic") ? 0.55 : 0.85;
    }
    if (t.fold_sulcus === "strong") { p.fold = 0.24; p.plic = 1; }
    else if (t.fold_sulcus === "weak") { p.fold = 0.08; p.plic = 1; }
    if (t.interarea_form === "pyramidal") p.beak = Math.max(p.beak, 0.40);
    else if (t.interarea_form === "low") p.beak = Math.max(p.beak, 0.18);
    if (t.surface_ribs === "yes") {
      p.ribs = (firstOf(t.outline) === "wing-shaped" || firstOf(t.outline) === "conical") ? 16 : 24;
      p.ribDepth = (firstOf(t.outline) === "wing-shaped" || firstOf(t.outline) === "conical") ? 0.030 : 0.014;
    }
    if (t.surface_frills === "yes") { p.growthN = 7; p.growthDepth = 0.016; }
    if (t.surface_spines === "yes") { p.bumps = 1.0; }
    // delthyrium follows hinge style
    p.delth = (p.convD < -0.02) ? 0 : (p.hinge >= 0.5 ? 1 : 2);
    return p;
  }

  // continuous params -> categorical traits, for narrowing against the manifest
  function simTraits(p) {
    const out = {};
    const aspect = 2 * p.width;
    out.hinge = p.hinge >= 0.45 ? "strophic" : "astrophic";
    out.profile = p.convD < -0.02 ? "concavo-convex" : (Math.min(p.convV, p.convD) < 0.06 ? "plano-convex" : "biconvex");
    out.fold_sulcus = p.fold >= 0.16 ? "strong" : "weak";
    if (p.beak >= 0.4 && p.hinge >= 0.6) out.outline = "conical";
    else if (p.hinge >= 0.6 && aspect >= 1.5) out.outline = "wing-shaped";
    else if (aspect <= 0.95) out.outline = "elongate-oval";
    else out.outline = "subcircular";
    if (p.hinge >= 0.6) out.interarea_form = p.beak >= 0.4 ? "pyramidal" : "low";
    if (p.ribs > 0 && p.ribDepth > 0) { out.surface_ribs = "yes"; out.umbones = "ribbed"; }
    if (p.growthN > 0 && p.growthDepth >= 0.012) out.surface_frills = "yes";
    if (p.bumps > 0) out.surface_spines = "yes";
    return out;
  }

  return { DEFAULTS, GROUPS, INT_KEYS, mount, unmount, setParams, setSpin, traitsToParams, simTraits };
})();
