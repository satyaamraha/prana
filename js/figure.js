/* Prana — articulated 3D figure engine.
 *
 * Poses are authored with segment angles in degrees in ONE plane:
 *   0 = pointing down, 90 = forward (side view: right), 180 = up, -90 = backward.
 *   v:'s' (default) → angles live in the sagittal plane (side view);
 *   v:'f'           → angles live in the frontal plane (front view: + = screen right).
 * Keys: t1/t2 lower/upper spine, hd head, la1/la2 & ra1/ra2 upper/fore arms,
 * ll1/ll2 & rl1/rl2 thigh/shin, lf/rf feet (side poses).
 * The skeleton is built in 3D (X forward, Y down, Z lateral), rested on the floor
 * (lowest body surface at Y = 0), and projected through a camera that can orbit:
 * side, front, three-quarter, or a slow 360° turn. Hands with `ik:{l:{dx},r:{dx}}`
 * are planted on the floor dx units forward of the shoulder.
 */
(function () {
  'use strict';
  const L = { t1: 26, t2: 26, neck: 5, head: 10, ua: 28, fa: 30, th: 44, sh: 42, ft: 13, sw: 16, hw: 9, shOff: 4 };
  const RAD = { hip: 7, mid: 7, neck: 6, head: 10, sh: 6, el: 3.5, ha: 3.5, kn: 4.5, an: 3.5, to: 3 };
  const NUM = ['t1', 't2', 'hd', 'la1', 'la2', 'ra1', 'ra2', 'll1', 'll2', 'rl1', 'rl2', 'lf', 'rf', 'lift', 'dx'];
  const DEF = { v: 's', t1: 180, la1: -3, la2: -3, ra1: 3, ra2: 4, ll1: -2, ll2: -2, rl1: 2, rl2: 2, lift: 0, dx: 0 };
  const PTS = [['hip', 'hip'], ['mid', 'mid'], ['neck', 'neck'], ['head', 'head'], ['lsh', 'sh'], ['rsh', 'sh'],
    ['lel', 'el'], ['lha', 'ha'], ['rel', 'el'], ['rha', 'ha'], ['lkn', 'kn'], ['lan', 'an'], ['lto', 'to'], ['rkn', 'kn'], ['ran', 'an'], ['rto', 'to']];
  const ANCHOR = { hip: 'hip', ltoe: 'lto', rtoe: 'rto', lhand: 'lha', rhand: 'rha', lto: 'lto', rto: 'rto', lha: 'lha', rha: 'rha', head: 'head', lkn: 'lkn', rkn: 'rkn' };
  /** Camera presets: th = yaw around the vertical axis, ph = downward pitch. */
  const VIEWS = { side: { th: 0, ph: 0 }, front: { th: 90, ph: 0 }, back: { th: 270, ph: 0 }, q: { th: 38, ph: 13 } };
  /** Orthogonal angles offered alongside the main view. */
  const ORTHO = ['front', 'side', 'back', 'top'];
  const ORBIT_DEG_PER_S = 36;

  // segments drawn as individual strokes so they can be depth-sorted and highlighted
  const SEGS = [['hips', 'lhp', 'rhp', 'hips'], ['shoulders', 'lsh', 'rsh', 'shoulders']];
  for (const s of ['l', 'r']) {
    SEGS.push([s + 'th', s + 'hp', s + 'kn', 'thigh'], [s + 'sn', s + 'kn', s + 'an', 'shin'], [s + 'ft', s + 'an', s + 'to', 'foot'],
      [s + 'ua', s + 'sh', s + 'el', 'uarm'], [s + 'fa', s + 'el', s + 'ha', 'farm']);
  }

  const D2R = Math.PI / 180;
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);
  const add3 = (p, len, d) => [p[0] + len * d[0], p[1] + len * d[1], p[2] + len * d[2]];
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  function dir3(a, plane) {
    const s = Math.sin(a * D2R), c = Math.cos(a * D2R);
    return plane === 'f' ? [0, c, -s] : [s, c, 0];
  }

  function normalize(p) {
    const q = Object.assign({}, DEF, p);
    if (q.t2 == null) q.t2 = q.t1;
    if (q.hd == null) q.hd = q.t2;
    if (q.v === 'f') { if (q.lf == null) q.lf = 0; if (q.rf == null) q.rf = 0; }
    else { if (q.lf == null) q.lf = q.ll2 + 90; if (q.rf == null) q.rf = q.rl2 + 90; }
    return q;
  }

  function build(q) {
    const pl = q.v === 'f' ? 'f' : 's';
    const D = (a) => dir3(a, pl);
    const P = {};
    P.hip = [0, 0, 0];
    P.mid = add3(P.hip, L.t1, D(q.t1));
    P.neck = add3(P.mid, L.t2, D(q.t2));
    P.head = add3(P.neck, L.neck + L.head, D(q.hd));
    const sc = add3(P.neck, -L.shOff, D(q.t2));
    const latS = pl === 's' ? [0, 0, -1] : D(q.t2 + 90);
    const latH = pl === 's' ? [0, 0, -1] : D(q.t1 + 90);
    P.lsh = add3(sc, L.sw, latS); P.rsh = add3(sc, -L.sw, latS);
    P.lhp = add3(P.hip, L.hw, latH); P.rhp = add3(P.hip, -L.hw, latH);
    for (const s of ['l', 'r']) {
      P[s + 'el'] = add3(P[s + 'sh'], L.ua, D(q[s + 'a1']));
      P[s + 'ha'] = add3(P[s + 'el'], L.fa, D(q[s + 'a2']));
      P[s + 'kn'] = add3(P[s + 'hp'], L.th, D(q[s + 'l1']));
      P[s + 'an'] = add3(P[s + 'kn'], L.sh, D(q[s + 'l2']));
      if (pl === 's') P[s + 'to'] = add3(P[s + 'an'], L.ft, D(q[s + 'f']));
      else {
        const out = (s === 'l' ? 1 : -1) * latH[2];
        P[s + 'to'] = add3(P[s + 'an'], L.ft * 0.85, norm3([0.93, 0.12, out * 0.35]));
      }
    }
    // eyes: on the face side of the head
    const up = norm3(sub3(P.head, P.neck));
    const fwd = pl === 's' ? D(q.hd - 90) : [1, 0, 0];
    const lat = norm3(cross(up, fwd));
    const eyeBase = add3(add3(P.head, 5, fwd), 1.6, up);
    P.eyl = add3(eyeBase, 3.4, lat); P.eyr = add3(eyeBase, -3.4, lat);
    return P;
  }

  function twoLink(S, T, a, b, bend) {
    const dx = T[0] - S[0], dy = T[1] - S[1];
    let d = Math.hypot(dx, dy);
    const base = Math.atan2(dx, dy) / D2R;
    const mv = (p, len, ang) => [p[0] + len * Math.sin(ang * D2R), p[1] + len * Math.cos(ang * D2R)];
    if (d >= a + b - 0.01) { const e = mv(S, a, base); return { e, h: mv(e, b, base), a1: base, a2: base }; }
    d = Math.max(d, Math.abs(a - b) + 0.01);
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    const A = Math.acos(Math.max(-1, Math.min(1, cosA))) / D2R;
    const a1 = base - bend * A;
    const e = mv(S, a, a1);
    const a2 = Math.atan2(T[0] - e[0], T[1] - e[1]) / D2R;
    return { e, h: mv(e, b, a2), a1, a2 };
  }

  /** Build skeleton, rest it on the floor (Y = 0), plant IK hands. */
  function solve(q) {
    const P = build(q);
    const ik = q.ik || {};
    let floor = -1e9;
    for (const [k, r] of PTS) {
      if (ik[k[0]] && (k.endsWith('el') || k.endsWith('ha'))) continue;
      const y = P[k][1] + RAD[r];
      if (y > floor) floor = y;
    }
    const sy = -floor - (q.lift || 0), sx = q.dx || 0;
    for (const k in P) P[k] = [P[k][0] + sx, P[k][1] + sy, P[k][2]];
    const out = Object.assign({}, q);
    for (const s of ['l', 'r']) {
      const o = ik[s]; if (!o) continue;
      const S = P[s + 'sh'];
      const res = twoLink([S[0], S[1]], [S[0] + (o.dx || 0), -RAD.ha], L.ua, L.fa, o.bend == null ? 1 : o.bend);
      P[s + 'el'] = [res.e[0], res.e[1], S[2]]; P[s + 'ha'] = [res.h[0], res.h[1], S[2]];
      out[s + 'a1'] = res.a1; out[s + 'a2'] = res.a2;
    }
    return { P, q: out };
  }

  function prep(pose) {
    const q = normalize(pose);
    const r = solve(q);
    return { q: r.q, ik: q.ik || null, v: q.v, P: r.P, anchor: pose.anchor || null };
  }

  function lerpK(A, B, u) {
    const q = { v: u < 0.5 ? A.v : B.v };
    for (const k of NUM) q[k] = lerp(A.q[k] || 0, B.q[k] || 0, u);
    let ik = null;
    if (A.ik && B.ik) {
      for (const s of ['l', 'r']) {
        if (A.ik[s] && B.ik[s]) {
          ik = ik || {};
          ik[s] = { dx: lerp(A.ik[s].dx || 0, B.ik[s].dx || 0, u), bend: B.ik[s].bend };
        }
      }
    }
    q.ik = ik;
    return q;
  }

  /** Transition between two held poses the way a body would move: each joint is
   * blended relative to its parent within its natural range (so a knee never bends
   * backwards and a torso never swings down through the legs), and the trunk turns
   * the short way round. Loops (exercise reps) keep the plain blend in lerpK. */
  const wrapTo = (a, lo) => { let x = (a - lo) % 360; if (x < 0) x += 360; return x + lo; };
  // [key, parent, low end of the natural range of (key − parent)]: hip −270 ⇒ flexion −90…270, knee −270 ⇒ flexion −90…270
  const JOINTS = [
    ['t2', 't1', -180], ['hd', 't2', -180],
    ['la1', 't2', -120, 'L'], ['ra1', 't2', -120, 'R'], ['la2', 'la1', -90], ['ra2', 'ra1', -90],
    ['ll1', 't1', -270], ['rl1', 't1', -270], ['ll2', 'll1', -270], ['rl2', 'rl1', -270], ['lf', 'll2', -60], ['rf', 'rl2', -60]
  ];
  // shoulder: 0 = arm alongside the body, + = raised forward (side view) / outward (front view, right arm)
  function toJoints(q) {
    const J = { t1: q.t1 };
    for (const [k, par, lo, side] of JOINTS) {
      let rel = (q[k] || 0) - (q[par] || 0);
      if (side) { rel += 180; if (q.v === 'f' && side === 'L') rel = -rel; }
      J[k] = wrapTo(rel, lo);
    }
    return J;
  }
  function lerpJ(A, B, u, arc) {
    const q = lerpK(A, B, u);
    const a = toJoints(A.q), b = toJoints(B.q);
    let d = wrapTo(b.t1 - a.t1, -180);
    q.t1 = a.t1 + d * u;
    for (const [k, par, , side] of JOINTS) {
      let rel = lerp(a[k], b[k], u);
      if (side) { if (q.v === 'f' && side === 'L') rel = -rel; rel -= 180; }
      q[k] = q[par] + rel;
    }
    // a foot that travels along the floor is lifted instead: bend hip and knee mid-step
    if (arc) {
      const b = Math.min(1, 2.5 * Math.sin(Math.PI * u));   // lift early, land late
      for (const s of ['l', 'r']) {
        if (!arc[s]) continue;
        const hipFlex = wrapTo(q[s + 'l1'] - q.t1 + 180, -90), kneeFlex = wrapTo(q[s + 'l1'] - q[s + 'l2'], -90);
        const lift = Math.min(35, Math.max(0, 165 - hipFlex)) * b;   // never fold a joint past its range
        const bend = Math.min(70, Math.max(0, 175 - kneeFlex)) * b;
        q[s + 'l1'] += lift; q[s + 'l2'] += lift - bend; q[s + 'f'] += lift - bend;
      }
    }
    return q;
  }
  /** Which feet must step (on the floor before and after, but far apart) when the anchor stays put. */
  function stepArcs(A, B, key) {
    if (A.v !== 's' || B.v !== 's') return null;
    const dx = A.P[key][0] - B.P[key][0];
    const down = (P, s) => P[s + 'an'][1] + RAD.an >= -2 || P[s + 'to'][1] + RAD.to >= -2;
    let arc = null;
    for (const s of ['l', 'r']) {
      if (key === s + 'to' || key === s + 'an') continue;
      if (down(A.P, s) && down(B.P, s) && Math.abs(B.P[s + 'an'][0] + dx - A.P[s + 'an'][0]) > 25) (arc = arc || {})[s] = true;
    }
    return arc;
  }

  /** Which parts of the body rest on the floor (solved skeleton, floor at Y = 0). */
  function supportOf(P) {
    const on = (k, r) => P[k][1] + RAD[r] >= -4;
    const g = new Set();
    if (on('lan', 'an') || on('lto', 'to') || on('ran', 'an') || on('rto', 'to')) g.add('feet');
    if (on('lkn', 'kn') || on('rkn', 'kn')) g.add('knees');
    if (on('lha', 'ha') || on('rha', 'ha')) g.add('hands');
    const pelvis = on('hip', 'hip') || on('mid', 'mid');
    return { g, pelvis };
  }
  /** How far (units) the body's centre of mass is outside the parts touching the floor. */
  function imbalance(P, v) {
    const ax = v === 'f' ? 2 : 0, m = (a, b) => (P[a][ax] + P[b][ax]) / 2;
    let sum = m('hip', 'neck') * 46 + P.head[ax] * 8, W = 54;
    for (const s of ['l', 'r']) {
      sum += m(s + 'hp', s + 'kn') * 10 + m(s + 'kn', s + 'an') * 4.5 + m(s + 'an', s + 'to') * 1.5 + m(s + 'sh', s + 'el') * 3 + m(s + 'el', s + 'ha') * 2.5;
      W += 21.5;
    }
    const c = sum / W;
    let lo = 1e9, hi = -1e9;
    // parts within a few units of the floor read as touching it
    const touch = (x, y, r) => { if (y + r >= -12) { lo = Math.min(lo, x); hi = Math.max(hi, x); } };
    for (const [k, r] of PTS) touch(P[k][ax], P[k][1], RAD[r]);
    for (const t of [0.25, 0.5, 0.75]) for (const [a, b] of [['hip', 'mid'], ['mid', 'neck']]) touch(lerp(P[a][ax], P[b][ax], t), lerp(P[a][1], P[b][1], t), 7);
    return Math.max(0, lo - c, c - hi);   // how far the centre of mass is outside the support
  }
  /** Can one pose flow into the other by blending joints? Otherwise (rolling over,
   * lying down to standing…) a cross-fade is shown instead of an impossible morph. */
  const MORPH_TOL = 40;   // units the centre of mass may drift past the support mid-move
  const SLIDE_MAX = { an: 30, kn: 30, ha: 30, to: 45 };   // how far a part may slide while on the floor
  function canMorph(A, B, arc, key) {
    // chest direction: ±180 = facing the ceiling, 0 = facing the floor (side-view poses)
    const face = (K) => (K.v === 'f' ? 90 : Math.abs(wrapTo(K.q.t1 - 90, -180)));
    const fa = face(A), fb = face(B), up = (f) => f >= 120, down = (f) => f <= 60;
    if ((up(fa) && down(fb)) || (down(fa) && up(fb))) return false;   // rolling over
    const a = supportOf(A.P), b = supportOf(B.P);
    let shared = 0;
    for (const x of a.g) if (b.g.has(x)) shared++;
    const onBack = up(fa) && up(fb);   // lying on the back throughout: lower/lift hips, slide legs
    if (!onBack && !(shared >= 2 || (shared >= 1 && a.pelvis === b.pelvis))) return false;
    // and every in-between frame must be something a body could hold
    for (const u of [0.25, 0.5, 0.75]) if (imbalance(solve(lerpJ(A, B, ease(u), arc)).P, A.v) > MORPH_TOL) return false;
    // nothing may skate along the floor (the anchor stays pinned; stepping feet are lifted)
    const ax = A.v === 'f' ? 2 : 0, pin = A.P[key][ax], last = {}, slid = {};
    const parts = PTS.filter(([k]) => SLIDE_MAX[k.slice(1)] && (k[0] === 'l' || k[0] === 'r'));
    for (const [k, r] of parts) if (A.P[k][1] + RAD[r] >= -1.5) last[k] = A.P[k][ax];
    for (let i = 1; i <= 10; i++) {
      const P = solve(lerpJ(A, B, ease(i / 10), arc)).P, shift = pin - P[key][ax];
      for (const [k, r] of parts) {
        if (P[k][1] + RAD[r] >= -1.5) {
          const x = P[k][ax] + shift;
          if (k in last && (slid[k] = (slid[k] || 0) + Math.abs(x - last[k])) > SLIDE_MAX[k.slice(1)]) return false;
          last[k] = x;
        } else delete last[k];
      }
    }
    return true;
  }

  /** Project 3D points: cam {th, ph, flip, ox, oz}. Returns [screenX, screenY, depth]. */
  function project(P, cam) {
    const ct = Math.cos(cam.th * D2R), st = Math.sin(cam.th * D2R);
    const cp = Math.cos(cam.ph * D2R), sp = Math.sin(cam.ph * D2R);
    const f = cam.flip ? -1 : 1, out = {};
    for (const k in P) {
      const X = P[k][0] + (cam.ox || 0), Y = P[k][1], Z = P[k][2] + (cam.oz || 0);
      const d = X * st + Z * ct;
      out[k] = [f * (X * ct - Z * st), Y * cp + d * sp, d * cp - Y * sp];
    }
    return out;
  }
  const projPt = (p, cam) => project({ p }, cam).p;

  function bbox(Pp) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [k, r] of PTS) {
      const p = Pp[k], rr = r === 'head' ? RAD.head : RAD[r] + 3;
      x0 = Math.min(x0, p[0] - rr); x1 = Math.max(x1, p[0] + rr);
      y0 = Math.min(y0, p[1] - rr); y1 = Math.max(y1, p[1] + rr);
    }
    return { x0, x1, y0, y1 };
  }
  const unionBB = (a, b) => (a ? { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) } : b);

  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const crs = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const q of p) { while (lo.length >= 2 && crs(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && crs(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  function boxPoly(x0, x1, y0, y1, z0, z1, cam) {
    const c = [];
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) { const p = projPt([x, y, z], cam); c.push([p[0], p[1]]); }
    return hull(c).map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ');
  }

  // ---------------------------------------------------------------------------
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const r1 = (n) => Math.round(n * 10) / 10;

  const BOX_W = 250, BOX_H = 222, BOX_TOP = -212;
  const all = new Set();
  let rafId = 0, lastTs = 0;
  function frame(ts) {
    const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    for (const f of all) f._tick(dt);
    if (all.size) rafId = requestAnimationFrame(frame); else { rafId = 0; lastTs = 0; }
  }
  function ensureLoop() { if (!rafId) rafId = requestAnimationFrame(frame); }

  class Figure {
    constructor(container, o = {}) {
      this.o = Object.assign({ flip: false, anchor: 'hip', idle: true, speed: 1, fit: 'fixed', prop: null, mat: false, view: 'auto', hl: null, onPhase: null }, o);
      const svg = this.svg = el('svg', { class: 'fig-svg', viewBox: '-125 -212 250 222', preserveAspectRatio: 'xMidYMax meet', role: 'img', 'aria-label': o.label || 'Movement demonstration' });
      this.floorE = el('ellipse', { class: 'fig-floor-e' }, svg);
      this.floor = el('line', { class: 'fig-floor' }, svg);
      this.matEl = el('polygon', { class: 'fig-mat' }, svg);
      this.wallEl = el('polygon', { class: 'fig-prop' }, svg);
      this.shadow = el('ellipse', { class: 'fig-shadow' }, svg);
      const g = this.g = el('g', { class: 'fig' }, svg);
      this.items = {};
      for (const [name, , , type] of SEGS) this.items[name] = { el: el('line', { class: 'seg s-' + type }, g), type };
      this.items.torso = { el: el('path', { class: 'seg s-torso' }, g), type: 'torso' };
      this.items.head = { el: el('circle', { class: 'head', r: L.head }, g), type: 'head' };
      this.eyes = [el('circle', { class: 'eye', r: 1.8 }, g), el('circle', { class: 'eye', r: 1.8 }, g)];
      this.order = '';
      container.appendChild(svg);
      this.t = 0; this.playing = true; this.visible = true; this.mode = null; this.cam = null; this.phase = -1;
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver((es) => { this.visible = es[es.length - 1].isIntersecting; });
        this.io.observe(svg);
      }
    }

    // ---- camera -----------------------------------------------------------------
    _angles(v) {
      const view = this.o.view || 'auto';
      const base = v === 'f' ? 90 : 0;
      if (view === 'orbit') return { th: base + 38 + this.t * ORBIT_DEG_PER_S, ph: 13, orbit: true };
      if (view === 'q') return { th: base + VIEWS.q.th, ph: VIEWS.q.ph };
      if (view === 'auto') return { th: base, ph: 0 };
      if (view === 'top') return { th: base, ph: 90, top: true };   // looking straight down, same heading as auto
      // explicit side/front: a front-authored pose seen "from the side" is base+90
      const want = VIEWS[view] || VIEWS.side;
      return { th: want.th, ph: want.ph };
    }

    /** The concrete angle being shown ('auto' resolves to side or front). */
    resolvedView() {
      const view = this.o.view || 'auto';
      if (view !== 'auto') return view;
      const K = this.mode === 'loop' && this.kf ? this.kf[0].K : this.cur ? this.cur.K : null;
      return K && K.v === 'f' ? 'front' : 'side';
    }

    setView(view) {
      if (this.o.view === view) return;
      this.o.view = view;
      if (this.mode === 'loop') this._fitLoop();
      else if (this.mode === 'show' && this.cur) { this.from = null; this.cam = this._camFor(this._bboxShow(this.cur.K, this.cur.W, this.cur.flip)); this._applyCam(this.cam); }
      this._tick(0);
    }
    setHighlight(hl) { this.o.hl = hl; this.order = ''; this._tick(0); }
    setSpeed(s) { this.o.speed = s; }

    _camFor(bb) {
      if (this.o.view === 'top' && this.o.fit !== 'tight') {
        // overhead: centre the body, keep a steady scale through the movement
        const w = Math.max(150, bb.x1 - bb.x0 + 50);
        const hgt = Math.max(w * BOX_H / BOX_W, bb.y1 - bb.y0 + 30);
        const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
        return { x: cx - w / 2, y: cy - hgt / 2, w, h: hgt };
      }
      if (this.o.fit === 'tight') {
        const pad = 10;
        let w = bb.x1 - bb.x0 + pad * 2, hgt = bb.y1 - bb.y0 + pad * 2;
        const cx = (bb.x0 + bb.x1) / 2;
        // wide rows (floor moves) match the row's shape so a horizontal body fills it
        let ar = 1.25;
        if (this.o.fillRow) { const r = this.svg.getBoundingClientRect(); if (r.width && r.height) ar = Math.min(2.6, Math.max(1.25, r.width / r.height)); }
        if (w / hgt < ar) w = hgt * ar; else hgt = w / ar;
        if (this.o.view === 'top') return { x: cx - w / 2, y: (bb.y0 + bb.y1) / 2 - hgt / 2, w, h: hgt };
        const bottom = Math.max(8, bb.y1 + pad);
        return { x: cx - w / 2, y: bottom - hgt, w, h: hgt };
      }
      const cx = (bb.x0 + bb.x1) / 2;
      const base = this.o.boxW || BOX_W;      // narrower box = bigger figure (used by the two-view panels)
      let w = base;
      const need = bb.x1 - bb.x0 + 24;
      if (need > w) w = need;
      const top = Math.min(BOX_TOP * (w / BOX_W), bb.y0 - 10);
      const bottom = Math.max(10, bb.y1 + 10);
      const hgt = Math.max(w * BOX_H / BOX_W, bottom - top);
      return { x: cx - w / 2, y: bottom - hgt, w, h: hgt };
    }

    _applyCam(c) {
      this.svg.setAttribute('viewBox', `${r1(c.x)} ${r1(c.y)} ${r1(c.w)} ${r1(c.h)}`);
      this.floor.setAttribute('x1', r1(c.x + 4)); this.floor.setAttribute('x2', r1(c.x + c.w - 4));
      this.floor.setAttribute('y1', 1.5); this.floor.setAttribute('y2', 1.5);
    }

    // ---- loop mode: repeating keyframes (exercise demos) ---------------------
    loop(frames, o = {}) {
      Object.assign(this.o, o);
      this.mode = 'loop';
      this.cur = null; this.from = null; this.phase = -1; this.order = '';
      this.kf = frames.map((f) => ({ K: prep(f.pose), h: f.h || 0, t: f.t || 0, label: f.label || null, anchor: f.anchor || null }));
      this.cycle = this.kf.reduce((a, k) => a + k.h + k.t, 0) || 1;
      // Each step can pin its own body part (feet while squatting, hands while jumping back).
      // Offsets chain so the pinned part never jumps when the pin changes.
      const base = ANCHOR[this.o.anchor] || 'hip';
      let off = [0, 0];
      this.kf.forEach((k, i) => {
        k.key = ANCHOR[k.anchor] || base;
        if (i) {
          const prev = this.kf[i - 1].key, P = k.K.P;
          off = [off[0] + P[k.key][0] - P[prev][0], off[1] + P[k.key][2] - P[prev][2]];
        }
        k.off = off;
      });
      this._seg = 0;
      this.t = 0;
      this._fitLoop();
      this._tick(0);
      if (this.kf.length > 1 || this.o.idle || this.o.view === 'orbit') { all.add(this); ensureLoop(); }
      return this;
    }

    _loopCam(q, tOverride) {
      const a = this._angles(this.kf[0].K.v);
      const { P } = solve(q);
      const seg = (this.kf && this.kf[this._seg || 0]) || null;
      const key = seg ? seg.key : ANCHOR[this.o.anchor] || 'hip', off = seg ? seg.off : [0, 0];
      return { P, cam: { th: tOverride != null ? tOverride : a.th, ph: a.ph, flip: !!this.o.flip, ox: off[0] - P[key][0], oz: off[1] - P[key][2] } };
    }

    _fitLoop() {
      let bb = null;
      const a = this._angles(this.kf[0].K.v);
      const yaws = a.orbit ? [0, 45, 90, 135, 180, 225, 270, 315] : [a.th];
      for (let i = 0; i <= 16; i++) {
        const q = this._sample((i / 16) * this.cycle);
        for (const th of yaws) {
          const { P, cam } = this._loopCam(q, th);
          bb = unionBB(bb, bbox(project(P, cam)));
        }
      }
      this.cam = this._camFor(bb);
      this._applyCam(this.cam);
    }

    _sample(time) {
      const kf = this.kf, n = kf.length;
      if (n === 1) { this._seg = 0; return Object.assign({}, kf[0].K.q, { ik: kf[0].K.ik }); }
      let t = ((time % this.cycle) + this.cycle) % this.cycle;
      for (let i = 0; i < n; i++) {
        const k = kf[i];
        if (t < k.h) { this._phaseIdx = i; this._seg = i; return Object.assign({}, k.K.q, { ik: k.K.ik }); }
        t -= k.h;
        if (t < k.t) {
          this._phaseIdx = (i + 1) % n; this._seg = i;
          return lerpK(k.K, kf[(i + 1) % n].K, ease(t / k.t));
        }
        t -= k.t;
      }
      this._phaseIdx = 0; this._seg = 0;
      return Object.assign({}, kf[0].K.q, { ik: kf[0].K.ik });
    }

    _idle(q) {
      const s = Math.sin((this.t / 4.6) * Math.PI * 2);
      q.t2 = (q.t2 || 0) + s * 1.1;
      q.hd = (q.hd || 0) + s * 1.6;
      if (!(q.ik && q.ik.l)) q.la1 = (q.la1 || 0) + s * 0.7;
      if (!(q.ik && q.ik.r)) q.ra1 = (q.ra1 || 0) - s * 0.7;
    }

    // ---- show mode: hold a pose, smoothly transition between poses -------------
    show(pose, o = {}) {
      const K = prep(pose);
      const flip = o.flip != null ? !!o.flip : !!this.o.flip;
      const anchorKey = ANCHOR[o.anchor || pose.anchor || 'hip'] || 'hip';
      const dur = o.dur != null ? o.dur : 1.1;
      this.mode = 'show'; this.order = '';
      const prev = this.cur ? this._curState() : null;
      let arc = null, jump = false;
      if (prev && dur > 0 && this.cur.K.v === K.v && this.cur.flip === flip) {
        arc = stepArcs(prev.K, K, anchorKey);
        jump = !canMorph(prev.K, K, arc, anchorKey);
      }
      if (!this.cur || this.cur.K.v !== K.v || this.cur.flip !== flip || dur === 0 || jump) {
        const W = [-K.P[anchorKey][0], -K.P[anchorKey][2]];
        const viewChanged = (this.cur && (this.cur.K.v !== K.v || this.cur.flip !== flip)) || jump;
        this.from = null;
        this.cur = { K, W, flip };
        this.cam = this._camFor(this._bboxShow(K, W, flip));
        this._applyCam(this.cam);
        if (viewChanged) this._fade();
      } else {
        const Wn = [prev.W[0] + prev.P[anchorKey][0] - K.P[anchorKey][0], prev.W[1] + prev.P[anchorKey][2] - K.P[anchorKey][2]];
        // the anchor (planted hand/foot) stays exactly where it is for the whole move
        const pin = [prev.W[0] + prev.P[anchorKey][0], prev.W[1] + prev.P[anchorKey][2]];
        this.from = { K: prev.K, W: prev.W, camFrom: this.cam, start: this.t, dur, arc, key: anchorKey, pin };
        this.cur = { K, W: Wn, flip };
        this.from.camTo = this._camFor(this._bboxShow(K, Wn, flip));
      }
      all.add(this); ensureLoop();
      this._tick(0);
      return this;
    }

    _curState() {
      if (this.from) {
        const u = Math.min(1, (this.t - this.from.start) / this.from.dur);
        if (u < 1) {
          const e = ease(u);
          const q = lerpJ(this.from.K, this.cur.K, e, this.from.arc);
          const s = solve(q), f = this.from;
          return { K: { q: s.q, ik: q.ik, v: q.v, P: s.P }, W: [f.pin[0] - s.P[f.key][0], f.pin[1] - s.P[f.key][2]], P: s.P };
        }
      }
      return { K: this.cur.K, W: this.cur.W, P: this.cur.K.P };
    }

    _bboxShow(K, W, flip) {
      const a = this._angles(K.v);
      const yaws = a.orbit ? [0, 45, 90, 135, 180, 225, 270, 315] : [a.th];
      let bb = null;
      for (const th of yaws) bb = unionBB(bb, bbox(project(K.P, { th, ph: a.ph, flip, ox: W[0], oz: W[1] })));
      return bb;
    }

    _fade() {
      this.g.style.transition = 'none'; this.g.style.opacity = '0';
      requestAnimationFrame(() => { this.g.style.transition = 'opacity .45s ease'; this.g.style.opacity = '1'; });
    }

    _tick(dt) {
      if (this.playing) this.t += dt * (this.o.speed || 1);
      if (!this.visible && dt) return;
      if (this.mode === 'loop') {
        const q = this._sample(this.t);
        if (this.o.idle) this._idle(q);
        const { P, cam } = this._loopCam(q);
        this._render(P, cam, this.kf[0].K.v);
        if (this.o.onPhase && this._phaseIdx !== this.phase) {
          this.phase = this._phaseIdx;
          const k = this.kf[this.phase];
          this.o.onPhase(this.phase, k && k.label);
        }
      } else if (this.mode === 'show' && this.cur) {
        let q, W, pin = null;
        if (this.from) {
          const u = Math.min(1, (this.t - this.from.start) / this.from.dur);
          const e = ease(u);
          q = lerpJ(this.from.K, this.cur.K, e, this.from.arc);
          W = [lerp(this.from.W[0], this.cur.W[0], e), lerp(this.from.W[1], this.cur.W[1], e)];
          if (u < 1) pin = this.from;
          const a = this.from.camFrom, b = this.from.camTo;
          this.cam = { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), w: lerp(a.w, b.w, e), h: lerp(a.h, b.h, e) };
          this._applyCam(this.cam);
          if (u >= 1) this.from = null;
        } else {
          q = Object.assign({}, this.cur.K.q, { ik: this.cur.K.ik });
          W = this.cur.W;
        }
        if (this.o.idle) this._idle(q);
        const { P } = solve(q);
        if (pin) W = [pin.pin[0] - P[pin.key][0], pin.pin[1] - P[pin.key][2]];
        const a = this._angles(this.cur.K.v);
        this._render(P, { th: a.th, ph: a.ph, flip: this.cur.flip, ox: W[0], oz: W[1] }, q.v);
      }
    }

    _render(P, cam, v) {
      const Pp = project(P, cam);
      const it = this.items;
      const hl = this.o.hl ? new Set(this.o.hl) : null;
      // torso curve through the mid-spine
      const ctrl = [2 * Pp.mid[0] - (Pp.hip[0] + Pp.neck[0]) / 2, 2 * Pp.mid[1] - (Pp.hip[1] + Pp.neck[1]) / 2];
      it.torso.el.setAttribute('d', `M${r1(Pp.hip[0])} ${r1(Pp.hip[1])}Q${r1(ctrl[0])} ${r1(ctrl[1])} ${r1(Pp.neck[0])} ${r1(Pp.neck[1])}`);
      const torsoDepth = (Pp.hip[2] + Pp.mid[2] + Pp.neck[2]) / 3;
      it.torso.depth = torsoDepth;
      for (const [name, a, b] of SEGS) {
        const e = it[name].el;
        e.setAttribute('x1', r1(Pp[a][0])); e.setAttribute('y1', r1(Pp[a][1]));
        e.setAttribute('x2', r1(Pp[b][0])); e.setAttribute('y2', r1(Pp[b][1]));
        it[name].depth = (Pp[a][2] + Pp[b][2]) / 2 - (name === 'hips' || name === 'shoulders' ? 0.2 : 0);
      }
      it.head.el.setAttribute('cx', r1(Pp.head[0])); it.head.el.setAttribute('cy', r1(Pp.head[1]));
      it.head.depth = Pp.head[2];
      // classes: far side dimmed, worked muscles highlighted
      for (const name in it) {
        const x = it[name];
        if (name === 'head') continue;
        const far = x.depth < torsoDepth - 4;
        const cls = 'seg s-' + x.type + (far ? ' far' : '') + (hl && hl.has(x.type) ? ' hl' : '');
        if (x.cls !== cls) { x.el.setAttribute('class', cls); x.cls = cls; }
      }
      // painter's algorithm: far → near
      const names = Object.keys(it).sort((a, b) => it[a].depth - it[b].depth);
      const key = names.join(',');
      if (key !== this.order) {
        this.order = key;
        for (const n of names) {
          this.g.appendChild(it[n].el);
          if (n === 'head') { this.g.appendChild(this.eyes[0]); this.g.appendChild(this.eyes[1]); }
        }
      }
      // eyes visible only on the camera-facing side of the head
      [Pp.eyl, Pp.eyr].forEach((p, i) => {
        const e = this.eyes[i];
        if (p[2] > Pp.head[2] + 0.6) { e.style.display = ''; e.setAttribute('cx', r1(p[0])); e.setAttribute('cy', r1(p[1])); }
        else e.style.display = 'none';
      });
      // floor, contact shadow, props
      const lowX = [], lows = ['lto', 'rto', 'lan', 'ran', 'lkn', 'rkn', 'hip', 'lha', 'rha', 'head', 'mid'];
      for (const k of lows) if (P[k][1] > -16) lowX.push(Pp[k][0]);
      const flat = cam.ph < 1;
      this.floor.style.display = flat ? '' : 'none';
      this.floorE.style.display = flat ? 'none' : '';
      const c3 = [(P.lto[0] + P.rto[0] + P.hip[0]) / 3, 0, (P.lto[2] + P.rto[2] + P.hip[2]) / 3];
      const fc = projPt(c3, cam);
      if (!flat) {
        const R = this.o.fit === 'tight' || cam.ph > 60
          ? Math.max(30, (Math.max(...lowX, fc[0]) - Math.min(...lowX, fc[0])) / 2 + 22)
          : Math.max(70, (this.cam ? this.cam.w : BOX_W) * 0.4);
        this.floorE.setAttribute('cx', r1(fc[0])); this.floorE.setAttribute('cy', r1(fc[1]));
        this.floorE.setAttribute('rx', r1(R)); this.floorE.setAttribute('ry', r1(R * Math.sin(cam.ph * D2R)));
      }
      if (lowX.length) {
        const x0 = Math.min(...lowX), x1 = Math.max(...lowX);
        const lift = Math.max(0, -Math.max(P.lto[1], P.rto[1], P.lha[1], P.rha[1], P.hip[1] + 4) - 3);
        const rx = (x1 - x0) / 2 + 12;
        this.shadow.style.display = '';
        this.shadow.setAttribute('cx', r1((x0 + x1) / 2)); this.shadow.setAttribute('cy', r1(flat ? 2 : fc[1]));
        this.shadow.setAttribute('rx', r1(rx * Math.max(0.5, 1 - lift / 60))); this.shadow.setAttribute('ry', r1(flat ? 3 : Math.max(3, rx * Math.sin(cam.ph * D2R) * 0.5)));
        this.shadow.style.opacity = String(Math.max(0.25, 1 - lift / 40));
      } else this.shadow.style.display = 'none';
      if (this.o.mat) {
        const xs = ['lto', 'rto', 'lha', 'rha', 'head', 'hip'].map((k) => P[k][0]);
        this.matEl.style.display = '';
        this.matEl.setAttribute('points', boxPoly(Math.min(...xs) - 16, Math.max(...xs) + 16, 0, 4, -22, 22, cam));
      } else this.matEl.style.display = 'none';
      if (this.o.prop === 'wall') {
        const x = Math.min(P.hip[0], P.mid[0], P.neck[0]) - 15;
        this.wallEl.style.display = '';
        this.wallEl.setAttribute('points', boxPoly(x - 6, x, -175, 0, -45, 45, cam));
      } else this.wallEl.style.display = 'none';
    }

    pause() { this.playing = false; }
    play() { this.playing = true; }
    destroy() { all.delete(this); if (this.io) this.io.disconnect(); this.svg.remove(); }

    /** Draw a single static pose (thumbnails). */
    static still(container, pose, o = {}) {
      const f = new Figure(container, Object.assign({ fit: 'tight', idle: false }, o));
      f.mode = 'loop';
      f.kf = [{ K: prep(pose), h: 1, t: 0 }];
      f.cycle = 1;
      f._fitLoop();
      const q = f._sample(0);
      const { P, cam } = f._loopCam(q);
      f._render(P, cam, q.v);
      if (f.io) f.io.disconnect();
      return f;
    }
    static destroyAll() { for (const f of [...all]) f.destroy(); }
    static debug(pose) { return prep(pose).P; }
  }
  Figure.VIEWS = ['auto', 'side', 'front', 'back', 'top', 'q', 'orbit'];
  Figure.VIEW_LABEL = { auto: 'Auto', side: 'Side', front: 'Front', back: 'Back', top: 'Top', q: '3/4', orbit: '360°' };
  /** The two clearest angles for a move: [main, second].
   *  Standing/seated moves → side + front. Floor moves (plank, push-up, bridge…) → side + 3/4,
   *  because a head-on front view of a horizontal body shows almost nothing. */
  Figure.pairFor = (pose) => {
    const q = normalize(pose || {});
    if (q.v === 'f') return ['front', 'side'];
    const horizontal = Math.abs((q.t1 == null ? 180 : q.t1) - 180) > 50;
    return horizontal ? ['side', 'q'] : ['side', 'front'];
  };
  /** Horizontal bodies read best in wide rows: on narrow screens, or when the demo area is tall. */
  Figure.stackRows = (el) => { const w = el.clientWidth || innerWidth, h = el.clientHeight || 0; return w < 560 || h > w * 0.6; };
  Figure.PAIR_LABEL = { side: 'Side view', front: 'Front view', q: '3/4 view', back: 'Back view', top: 'Top view' };
  /** Draw several looping figures at the same scale so the views compare 1:1. */
  Figure.shareScale = (figs) => {
    const list = figs.filter((f) => f && f.cam && f.mode === 'loop');
    if (list.length < 2) return;
    const w = Math.max(...list.map((f) => f.cam.w)), h = Math.max(...list.map((f) => f.cam.h));
    for (const f of list) {
      const cx = f.cam.x + f.cam.w / 2, bottom = f.cam.y + f.cam.h;
      f.cam = { x: cx - w / 2, y: bottom - h, w, h };
      f._applyCam(f.cam);
    }
  };
  /** Three extra angles that complement the main one (front / side / back / top). */
  Figure.otherAngles = (main) => {
    const rest = ORTHO.filter((v) => v !== main);
    return rest.length > 3 ? ['front', 'side', 'top'] : rest;
  };

  window.Figure = Figure;
})();
