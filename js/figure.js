/* Prana — articulated figure engine.
 *
 * Poses are described with absolute segment angles in degrees:
 *   0 = pointing down, 90 = pointing right (the way a side-view figure faces),
 *   180 = pointing up, -90 = pointing left.
 * Keys: t1/t2 lower/upper spine, hd head, la1/la2 & ra1/ra2 upper/fore arms,
 * ll1/ll2 & rl1/rl2 thigh/shin, lf/rf feet. In side view ('s') the "l" limbs are
 * the far side (drawn lighter). v:'f' renders a front view.
 * The figure is grounded automatically (its lowest body surface rests on the floor);
 * `ik: {l:{dx}, r:{dx}}` plants that hand on the floor dx units from the shoulder.
 */
(function () {
  'use strict';
  const L = { t1: 26, t2: 26, neck: 5, head: 10, ua: 28, fa: 30, th: 44, sh: 42, ft: 13, ftF: 7, sw: 16, hw: 9, shOff: 4 };
  const RAD = { hip: 7, mid: 7, neck: 6, head: 10, sh: 6, el: 3.5, ha: 3.5, kn: 4.5, an: 3.5, to: 3 };
  const NUM = ['t1', 't2', 'hd', 'la1', 'la2', 'ra1', 'ra2', 'll1', 'll2', 'rl1', 'rl2', 'lf', 'rf', 'lift', 'dx'];
  const DEF = { v: 's', t1: 180, la1: -3, la2: -3, ra1: 3, ra2: 4, ll1: -2, ll2: -2, rl1: 2, rl2: 2, lift: 0, dx: 0 };
  const PTS = [['hip', 'hip'], ['mid', 'mid'], ['neck', 'neck'], ['head', 'head'], ['lsh', 'sh'], ['rsh', 'sh'],
    ['lel', 'el'], ['lha', 'ha'], ['rel', 'el'], ['rha', 'ha'], ['lkn', 'kn'], ['lan', 'an'], ['lto', 'to'], ['rkn', 'kn'], ['ran', 'an'], ['rto', 'to']];
  const ANCHOR = { hip: 'hip', ltoe: 'lto', rtoe: 'rto', lhand: 'lha', rhand: 'rha', lto: 'lto', rto: 'rto', lha: 'lha', rha: 'rha', head: 'head', lkn: 'lkn', rkn: 'rkn' };

  const D2R = Math.PI / 180;
  const dir = (a) => [Math.sin(a * D2R), Math.cos(a * D2R)];
  const mv = (p, len, a) => { const d = dir(a); return [p[0] + len * d[0], p[1] + len * d[1]]; };
  const angOf = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]) / D2R;
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);

  function normalize(p) {
    const q = Object.assign({}, DEF, p);
    if (q.t2 == null) q.t2 = q.t1;
    if (q.hd == null) q.hd = q.t2;
    const front = q.v === 'f';
    if (q.lf == null) q.lf = front ? q.ll2 - 80 : q.ll2 + 90;
    if (q.rf == null) q.rf = front ? q.rl2 + 80 : q.rl2 + 90;
    return q;
  }

  function build(q) {
    const front = q.v === 'f', P = {};
    P.hip = [0, 0];
    P.mid = mv(P.hip, L.t1, q.t1);
    P.neck = mv(P.mid, L.t2, q.t2);
    P.head = mv(P.neck, L.neck + L.head, q.hd);
    const sc = mv(P.neck, -L.shOff, q.t2);
    if (front) {
      P.lsh = mv(sc, L.sw, q.t2 + 90); P.rsh = mv(sc, L.sw, q.t2 - 90);
      P.lhp = mv(P.hip, L.hw, q.t1 + 90); P.rhp = mv(P.hip, L.hw, q.t1 - 90);
    } else {
      P.lsh = sc; P.rsh = sc.slice(); P.lhp = [0, 0]; P.rhp = [0, 0];
    }
    for (const s of ['l', 'r']) {
      P[s + 'el'] = mv(P[s + 'sh'], L.ua, q[s + 'a1']);
      P[s + 'ha'] = mv(P[s + 'el'], L.fa, q[s + 'a2']);
      P[s + 'kn'] = mv(P[s + 'hp'], L.th, q[s + 'l1']);
      P[s + 'an'] = mv(P[s + 'kn'], L.sh, q[s + 'l2']);
      P[s + 'to'] = mv(P[s + 'an'], front ? L.ftF : L.ft, q[s + 'f']);
    }
    return P;
  }

  function twoLink(S, T, a, b, bend) {
    const dx = T[0] - S[0], dy = T[1] - S[1];
    let d = Math.hypot(dx, dy);
    const base = Math.atan2(dx, dy) / D2R;
    if (d >= a + b - 0.01) { const e = mv(S, a, base); return { e, h: mv(e, b, base), a1: base, a2: base }; }
    d = Math.max(d, Math.abs(a - b) + 0.01);
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    const A = Math.acos(Math.max(-1, Math.min(1, cosA))) / D2R;
    const a1 = base - bend * A;
    const e = mv(S, a, a1);
    const a2 = angOf(e, T);
    return { e, h: mv(e, b, a2), a1, a2 };
  }

  /** Build skeleton, rest it on the floor (y = 0), solve planted hands. */
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
    for (const k in P) P[k] = [P[k][0] + sx, P[k][1] + sy];
    const out = Object.assign({}, q);
    for (const s of ['l', 'r']) {
      const o = ik[s]; if (!o) continue;
      const S = P[s + 'sh'];
      const res = twoLink(S, [S[0] + (o.dx || 0), -RAD.ha], L.ua, L.fa, o.bend == null ? 1 : o.bend);
      P[s + 'el'] = res.e; P[s + 'ha'] = res.h; out[s + 'a1'] = res.a1; out[s + 'a2'] = res.a2;
    }
    return { P, q: out };
  }

  /** Prepare a keyframe: normalized + solved (arm angles resolved). */
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

  function bbox(P) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [k, r] of PTS) {
      const p = P[k], rr = r === 'head' ? RAD.head : RAD[r] + 2;
      x0 = Math.min(x0, p[0] - rr); x1 = Math.max(x1, p[0] + rr);
      y0 = Math.min(y0, p[1] - rr); y1 = Math.max(y1, p[1] + rr);
    }
    return { x0, x1, y0, y1 };
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
  const pt = (p) => r1(p[0]) + ' ' + r1(p[1]);

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
      this.o = Object.assign({ flip: false, anchor: 'hip', idle: true, speed: 1, fit: 'fixed', prop: null, mat: false }, o);
      const svg = this.svg = el('svg', { class: 'fig-svg', viewBox: '-125 -212 250 222', preserveAspectRatio: 'xMidYMax meet', role: 'img', 'aria-label': o.label || 'Movement demonstration' });
      this.mat = el('rect', { class: 'fig-mat', rx: 3, height: 5 }, svg);
      this.floor = el('line', { class: 'fig-floor' }, svg);
      this.wall = el('rect', { class: 'fig-prop', rx: 2, width: 6 }, svg);
      const g = el('g', { class: 'fig' }, svg);
      this.parts = {
        legF: el('path', { class: 'limb far' }, g), armF: el('path', { class: 'limb far' }, g),
        torso: el('path', { class: 'torso' }, g),
        head: el('circle', { class: 'head', r: L.head }, g), eye: el('circle', { class: 'eye', r: 1.9 }, g),
        legN: el('path', { class: 'limb' }, g), armN: el('path', { class: 'limb' }, g)
      };
      this.g = g;
      container.appendChild(svg);
      this.t = 0; this.playing = true; this.visible = true; this.mode = null;
      this.cam = null;
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver((es) => { this.visible = es[es.length - 1].isIntersecting; });
        this.io.observe(svg);
      }
    }

    // --- loop mode: repeating keyframes (exercise demos) ---------------------
    loop(frames, o = {}) {
      Object.assign(this.o, o);
      this.mode = 'loop';
      this.cur = null; this.from = null;
      this.kf = frames.map((f) => ({ K: prep(f.pose), h: f.h || 0, t: f.t || 0 }));
      this.cycle = this.kf.reduce((a, k) => a + k.h + k.t, 0) || 1;
      this.t = 0;
      // fixed camera over the whole cycle
      let bb = null;
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const P = this._points(this._sample((i / steps) * this.cycle), true);
        const b = bbox(P);
        bb = bb ? { x0: Math.min(bb.x0, b.x0), x1: Math.max(bb.x1, b.x1), y0: Math.min(bb.y0, b.y0), y1: Math.max(bb.y1, b.y1) } : b;
      }
      this.cam = this._camFor(bb);
      this._applyCam(this.cam);
      this._render(this._points(this._sample(0)), this.kf[0].K.v);
      if (this.kf.length > 1 || this.o.idle) { all.add(this); ensureLoop(); }
      return this;
    }

    _sample(time) {
      const kf = this.kf, n = kf.length;
      if (n === 1) return Object.assign({}, kf[0].K.q, { ik: kf[0].K.ik });
      let t = ((time % this.cycle) + this.cycle) % this.cycle;
      for (let i = 0; i < n; i++) {
        const k = kf[i];
        if (t < k.h) return Object.assign({}, k.K.q, { ik: k.K.ik });
        t -= k.h;
        if (t < k.t) {
          const B = kf[(i + 1) % n].K;
          return lerpK(k.K, B, ease(t / k.t));
        }
        t -= k.t;
      }
      return Object.assign({}, kf[0].K.q, { ik: kf[0].K.ik });
    }

    _points(q, noIdle) {
      if (!noIdle && this.o.idle) this._idle(q);
      const { P } = solve(q);
      const key = ANCHOR[this.o.anchor] || 'hip';
      const ax = P[key][0];
      const flip = this.o.flip ? -1 : 1;
      const out = {};
      for (const k in P) out[k] = [flip * (P[k][0] - ax), P[k][1]];
      out._v = q.v;
      return out;
    }

    _idle(q) {
      const s = Math.sin((this.t / 4.6) * Math.PI * 2);
      q.t2 = (q.t2 || 0) + s * 1.1;
      q.hd = (q.hd || 0) + s * 1.6;
      if (!(q.ik && q.ik.l)) q.la1 = (q.la1 || 0) + s * 0.7;
      if (!(q.ik && q.ik.r)) q.ra1 = (q.ra1 || 0) - s * 0.7;
    }

    // --- show mode: hold a pose, smoothly transition between poses -------------
    show(pose, o = {}) {
      const K = prep(pose);
      const flip = o.flip != null ? !!o.flip : !!this.o.flip;
      const anchorKey = ANCHOR[o.anchor || pose.anchor || 'hip'] || 'hip';
      const dur = o.dur != null ? o.dur : 1.1;
      this.mode = 'show';
      if (!this.cur || this.cur.K.v !== K.v || this.cur.flip !== flip || dur === 0) {
        const W = -K.P[anchorKey][0];
        this.from = null;
        this.cur = { K, W, flip };
        this.cam = this._camFor(this._bboxShow(K, W, flip));
        this._applyCam(this.cam);
        if (this.cur.K.v !== K.v) this._fade();
      } else {
        const prev = this._curState();
        const Wn = prev.W + prev.P[anchorKey][0] - K.P[anchorKey][0];
        this.from = { K: prev.K, W: prev.W, camFrom: this.cam, start: this.t, dur };
        this.cur = { K, W: Wn, flip };
        this.from.camTo = this._camFor(this._bboxShow(K, Wn, flip));
      }
      all.add(this); ensureLoop();
      this._tick(0);
      return this;
    }

    _curState() {
      // effective pose currently displayed (mid-transition aware)
      if (this.from) {
        const u = Math.min(1, (this.t - this.from.start) / this.from.dur);
        if (u < 1) {
          const e = ease(u);
          const q = lerpK(this.from.K, this.cur.K, e);
          const K = { q: solve(q).q, ik: q.ik, v: q.v, P: solve(q).P };
          return { K, W: lerp(this.from.W, this.cur.W, e), P: K.P };
        }
      }
      return { K: this.cur.K, W: this.cur.W, P: this.cur.K.P };
    }

    _bboxShow(K, W, flip) {
      const b = bbox(K.P), f = flip ? -1 : 1;
      const xa = f * (b.x0 + W), xb = f * (b.x1 + W);
      return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: b.y0, y1: b.y1 };
    }

    _fade() {
      this.g.style.transition = 'none'; this.g.style.opacity = '0';
      requestAnimationFrame(() => { this.g.style.transition = 'opacity .45s ease'; this.g.style.opacity = '1'; });
    }

    _camFor(bb) {
      if (this.o.fit === 'tight') {
        const pad = 10;
        let w = bb.x1 - bb.x0 + pad * 2, hgt = bb.y1 - bb.y0 + pad * 2;
        const cx = (bb.x0 + bb.x1) / 2;
        // keep a pleasant aspect (5:4) so thumbnails line up
        if (w / hgt < 1.25) w = hgt * 1.25; else hgt = w / 1.25;
        return { x: cx - w / 2, y: 8 - hgt, w, h: hgt };
      }
      const cx = (bb.x0 + bb.x1) / 2;
      let w = BOX_W, hgt = BOX_H;
      const need = bb.x1 - bb.x0 + 24;
      if (need > w) { w = need; hgt = w * BOX_H / BOX_W; }
      return { x: cx - w / 2, y: Math.min(BOX_TOP, bb.y0 - 10), w, h: Math.max(hgt, 10 - Math.min(BOX_TOP, bb.y0 - 10)) };
    }

    _applyCam(c) {
      this.svg.setAttribute('viewBox', `${r1(c.x)} ${r1(c.y)} ${r1(c.w)} ${r1(c.h)}`);
      const fx0 = c.x + 4, fx1 = c.x + c.w - 4;
      this.floor.setAttribute('x1', r1(fx0)); this.floor.setAttribute('x2', r1(fx1));
      this.floor.setAttribute('y1', 1.5); this.floor.setAttribute('y2', 1.5);
    }

    _tick(dt) {
      if (this.playing) this.t += dt * (this.o.speed || 1);
      if (!this.visible && dt) return;
      if (this.mode === 'loop') {
        this._render(this._points(this._sample(this.t)), null);
      } else if (this.mode === 'show') {
        let q, W, flip = this.cur.flip;
        if (this.from) {
          const u = Math.min(1, (this.t - this.from.start) / this.from.dur);
          const e = ease(u);
          q = lerpK(this.from.K, this.cur.K, e);
          W = lerp(this.from.W, this.cur.W, e);
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
        const f = flip ? -1 : 1, out = {};
        for (const k in P) out[k] = [f * (P[k][0] + W), P[k][1]];
        out._v = q.v;
        this._render(out);
      }
    }

    _render(P) {
      const front = P._v === 'f';
      const p = this.parts;
      const limbArm = (s) => `M${pt(P[s + 'sh'])}L${pt(P[s + 'el'])}L${pt(P[s + 'ha'])}`;
      const limbLeg = (s) => `M${pt(P[s + 'hp'] || P.hip)}L${pt(P[s + 'kn'])}L${pt(P[s + 'an'])}L${pt(P[s + 'to'])}`;
      // hips in front view
      if (front) {
        // recompute hip points from neighbours: they are not kept after transform, derive from knees' parents
      }
      const ctrl = [2 * P.mid[0] - (P.hip[0] + P.neck[0]) / 2, 2 * P.mid[1] - (P.hip[1] + P.neck[1]) / 2];
      let torso = `M${pt(P.hip)}Q${pt(ctrl)} ${pt(P.neck)}`;
      if (front) {
        torso += `M${pt(P.lsh)}L${pt(P.rsh)}M${pt(P.lhp)}L${pt(P.rhp)}`;
      }
      p.torso.setAttribute('d', torso);
      p.legF.setAttribute('d', limbLeg('l'));
      p.armF.setAttribute('d', limbArm('l'));
      p.legN.setAttribute('d', limbLeg('r'));
      p.armN.setAttribute('d', limbArm('r'));
      p.legF.setAttribute('class', front ? 'limb' : 'limb far');
      p.armF.setAttribute('class', front ? 'limb' : 'limb far');
      p.head.setAttribute('cx', r1(P.head[0])); p.head.setAttribute('cy', r1(P.head[1]));
      if (front) {
        p.eye.style.display = 'none';
      } else {
        // face direction: perpendicular to the head axis, toward the body's front
        const hx = P.head[0] - P.neck[0], hy = P.head[1] - P.neck[1];
        const len = Math.hypot(hx, hy) || 1;
        const flip = (this.mode === 'show' ? this.cur.flip : this.o.flip) ? -1 : 1;
        // rotate head axis by -90° (screen) then mirror if flipped
        let fx = -hy / len, fy = hx / len;
        if (flip < 0) { fx = hy / len; fy = -hx / len; }
        p.eye.style.display = '';
        p.eye.setAttribute('cx', r1(P.head[0] + fx * 4.6 + (hx / len) * 1.8));
        p.eye.setAttribute('cy', r1(P.head[1] + fy * 4.6 + (hy / len) * 1.8));
      }
      if (this.o.prop === 'wall') {
        this.wall.style.display = '';
        const x = Math.min(P.hip[0], P.mid[0], P.neck[0]) - 15;
        this.wall.setAttribute('x', r1(x)); this.wall.setAttribute('y', -175); this.wall.setAttribute('height', 175);
      } else this.wall.style.display = 'none';
      if (this.o.mat) {
        this.mat.style.display = '';
        const xs = [P.lto[0], P.rto[0], P.lha[0], P.rha[0], P.head[0], P.hip[0]];
        const x0 = Math.min(...xs) - 16, x1 = Math.max(...xs) + 16;
        this.mat.setAttribute('x', r1(x0)); this.mat.setAttribute('y', 0); this.mat.setAttribute('width', r1(x1 - x0));
      } else this.mat.style.display = 'none';
    }

    pause() { this.playing = false; }
    play() { this.playing = true; }
    setSpeed(s) { this.o.speed = s; }
    destroy() { all.delete(this); if (this.io) this.io.disconnect(); this.svg.remove(); }

    /** Draw a single static pose (thumbnails). */
    static still(container, pose, o = {}) {
      const f = new Figure(container, Object.assign({ fit: 'tight', idle: false }, o));
      f.mode = 'loop';
      f.kf = [{ K: prep(pose), h: 1, t: 0 }];
      f.cycle = 1;
      const P = f._points(f._sample(0), true);
      f.cam = f._camFor(bbox(P));
      f._applyCam(f.cam);
      f._render(P);
      if (f.io) f.io.disconnect();
      return f;
    }
    static destroyAll() { for (const f of [...all]) f.destroy(); }
    static debug(pose) { const K = prep(pose); return K.P; }
  }

  window.Figure = Figure;
})();
