/* Prana — immersive session players. */
(function () {
  'use strict';
  const { ICON, esc, $, $$, fmt, fmtMin } = UI;

  const RESULT_META = {
    bolt: { label: 'BOLT score', unit: 's', ch: 'bolt' },
    maxHold: { label: 'Max breath hold', unit: 's', ch: 'maxhold' },
    powerHold: { label: 'Best retention', unit: 's', ch: 'retention' },
    boxLadder: { label: 'Box ladder level', unit: 's', ch: 'ladder' },
    exhaleMax: { label: 'Longest smooth exhale', unit: 's', ch: 'exhale' },
    co2Rounds: { label: 'CO₂ table rounds', unit: '/8', ch: 'co2' },
    o2Rounds: { label: 'O₂ table rounds', unit: '/8', ch: 'o2' }
  };
  const ACCENT = { breathe: 'var(--breathe)', challenge: 'var(--challenge)', move: 'var(--move)', yoga: 'var(--yoga)', mind: 'var(--mind)' };

  // ===========================================================================
  class Session {
    constructor(o) {
      this.title = o.title; this.cat = o.cat; this.kind = o.kind; this.ref = o.ref || '';
      this.onDone = o.onDone; this.active = 0; this.paused = false; this.finished = false; this.results = {};
    }
    open() {
      const root = this.root = $('#player');
      root.hidden = false;
      root.style.setProperty('--accent', ACCENT[this.cat] || 'var(--breathe)');
      document.body.classList.add('playing');
      const voiceOn = Store.data.settings.voice;
      root.innerHTML = `
        <div class="pl-top">
          <button class="icon-btn" data-act="close" aria-label="End session">${ICON.close}</button>
          <div class="pl-title">${esc(this.title)}</div>
          <button class="icon-btn" data-act="voice" aria-label="Voice guidance ${voiceOn ? 'on' : 'off'}">${voiceOn ? ICON.volume : ICON.mute}</button>
        </div>
        <div class="pl-bar"></div>
        <div class="pl-body"></div>
        <div class="pl-controls"></div>`;
      this.body = $('.pl-body', root); this.controls = $('.pl-controls', root); this.bar = $('.pl-bar', root);
      root.onclick = (e) => { const a = e.target.closest('[data-act]'); if (a) this.action(a.dataset.act, a); };
      this.keyH = (e) => {
        if (e.key === ' ') { e.preventDefault(); if (!this.finished) this.togglePause(); }
        else if (e.key === 'Escape') this.action('close');
        else if (e.key === 'ArrowRight') this.action('next');
        else if (e.key === 'ArrowLeft') this.action('prev');
      };
      document.addEventListener('keydown', this.keyH);
      Sound.unlock(); Sound.keepAwake();
      this.last = performance.now();
      this.timer = setInterval(() => this._loop(), 100);
      active = this;
    }
    _loop() {
      const now = performance.now();
      const dt = Math.min(2, (now - this.last) / 1000);
      this.last = now;
      if (this.paused || this.finished) return;
      this.active += dt;
      this.update(dt);
    }
    pauseButton() { return `<button class="pl-btn main" data-act="pause" aria-label="Pause">${ICON.pause}</button>`; }
    togglePause() {
      this.paused = !this.paused;
      const b = $('[data-act="pause"]', this.root);
      if (b) { b.innerHTML = this.paused ? ICON.play : ICON.pause; b.setAttribute('aria-label', this.paused ? 'Resume' : 'Pause'); }
      if (this.paused) Sound.hush();
      this.onPause && this.onPause(this.paused);
    }
    action(a, el) {
      if (a === 'close') { this.finished ? this.close() : this.end(); }
      else if (a === 'voice') {
        const s = Store.data.settings; s.voice = !s.voice; Store.save();
        el.innerHTML = s.voice ? ICON.volume : ICON.mute;
        if (!s.voice) Sound.hush();
        UI.toast(s.voice ? 'Voice guidance on' : 'Voice guidance off');
      }
      else if (a === 'pause') this.togglePause();
      else if (a === 'done') this.close();
      else if (!this.finished && this.onAction) this.onAction(a, el);
    }
    end() {
      if (this.active < 8) { this.close(); return; }
      if (!this.paused) this.togglePause();
      if (window.confirm('End this session now? Your practice time will still be saved if it was over a minute.')) this.finish(false);
    }
    finish(completed) {
      if (this.finished) return;
      this.finished = true;
      clearInterval(this.timer);
      Sound.hush(); Sound.ambientStop();
      this.cleanup && this.cleanup();
      let logged = null;
      if (completed || this.active >= 60) {
        logged = Store.logSession({ kind: this.kind, ref: this.ref, title: this.title, sec: this.active, cat: this.cat });
      }
      const pbs = {};
      for (const k in this.results) pbs[k] = Store.setPB(k, this.results[k]);
      if (completed) { Sound.success(); Sound.vibrate([40, 60, 40]); }
      if (completed && this.onDone) { try { this.onDone(); } catch (e) { console.error(e); } }
      this.renderSummary(completed, logged, pbs);
    }
    renderSummary(completed, logged, pbs) {
      this.bar.innerHTML = '';
      const streak = Store.streak();
      const resKeys = Object.keys(this.results);
      let res = '';
      if (resKeys.length) {
        res = '<div class="results">' + resKeys.map((k) => {
          const m = RESULT_META[k] || { label: k, unit: '' };
          const ch = Content.challenge(m.ch);
          const band = ch && ch.interpret ? `<div class="tiny" style="opacity:.75">${esc(ch.interpret(this.results[k]))}</div>` : '';
          return `<div class="pb-row"><div><div class="small" style="opacity:.8">${esc(m.label)}</div>${band}</div><div style="text-align:right"><b>${this.results[k]}${esc(m.unit)}</b>${pbs[k] ? '<div class="new-pb">NEW BEST</div>' : ''}</div></div>`;
        }).join('') + (this.rounds && this.rounds.length > 1 ? `<div class="pb-row"><span class="small" style="opacity:.8">Each round</span><b class="small">${this.rounds.map((r) => r + 's').join(' · ')}</b></div>` : '') + '</div>';
      }
      const heading = completed ? 'Well done' : (logged ? 'Session saved' : 'Session ended');
      const note = completed ? esc(this.title) + ' complete.' : (logged ? 'Partial session logged — every minute counts.' : 'Sessions under a minute are not logged.');
      this.body.innerHTML = `
        <div class="summary">
          <div class="check">${ICON.check}</div>
          <h2>${heading}</h2>
          <p>${note}</p>
          <div class="sum-stats">
            <div><b>${fmtMin(this.active)}</b><span>practice time</span></div>
            <div><b>${streak} ${streak === 1 ? 'day' : 'days'}</b><span>current streak</span></div>
          </div>
          ${res}
          <button class="btn btn-light btn-block" data-act="done">Done</button>
        </div>`;
      this.controls.innerHTML = '';
    }
    close() {
      clearInterval(this.timer);
      document.removeEventListener('keydown', this.keyH);
      Sound.hush(); Sound.ambientStop(); Sound.releaseAwake();
      this.cleanup && this.cleanup();
      this.root.hidden = true; this.root.innerHTML = ''; this.root.onclick = null;
      document.body.classList.remove('playing');
      active = null;
      if (window.App) App.refresh();
    }
    record(key, v) {
      v = Math.round(v);
      if (key === 'powerHold') { (this.rounds = this.rounds || []).push(v); }
      if (key === 'bolt' || key === 'maxHold') this.results[key] = v;
      else this.results[key] = Math.max(this.results[key] || 0, v);
    }
  }
  let active = null;

  // ===========================================================================
  // Breathing (also powers the breath challenges)
  // ===========================================================================
  const COUNTED = new Set(['in', 'in2', 'out', 'hold', 'holdOut']);
  const NUM_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];

  class BreathSession extends Session {
    constructor(o) { super(o); this.segs = o.segs; this.idx = -1; this.segT = 0; }
    start() {
      this.open();
      this.bar.innerHTML = '<div class="pl-progress"><i></i></div>';
      this.body.innerHTML = `
        <div class="orb-wrap">
          <svg class="orb-ring" viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="48"/><circle class="fg" cx="50" cy="50" r="48" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>
          <div class="orb"></div>
          <div class="orb-center"><div class="b-label"></div><div class="b-count"></div></div>
        </div>
        <div class="b-sub"></div>
        <div class="b-tap" hidden><button class="btn btn-light" data-act="tap">I need to breathe</button></div>
        <div class="rest-ctl" hidden><button class="rest-btn" data-act="addrest">+10s</button><button class="rest-btn" data-act="skiprest">Skip rest ${ICON.next}</button></div>
        <div class="b-meta"><span class="b-cycle"></span><span class="b-left"></span></div>`;
      this.controls.innerHTML = this.pauseButton();
      this.el = {
        orb: $('.orb', this.body), ring: $('.orb-ring .fg', this.body), label: $('.b-label', this.body), count: $('.b-count', this.body),
        sub: $('.b-sub', this.body), tap: $('.b-tap', this.body), cycle: $('.b-cycle', this.body), left: $('.b-left', this.body), prog: $('.pl-progress i', this.bar),
        restCtl: $('.rest-ctl', this.body)
      };
      this.planned = this.segs.reduce((a, s) => a + (s.d || 0), 0);
      this.enter(0);
    }
    target(s, i) {
      switch (s.k) {
        case 'in': return (this.segs[i + 1] && this.segs[i + 1].k === 'in2') ? 0.82 : 1;
        case 'in2': return 1;
        case 'out': return 0.42;
        case 'pumpOut': return 0.5;
        case 'pumpIn': return 0.6;
        case 'free': return s.scale || null;
        default: return null;
      }
    }
    setOrb(s, dur) {
      const o = this.el.orb;
      if (s.k === 'rest') { o.style.transition = 'none'; o.style.transform = ''; o.classList.add('rest'); return; }
      if (o.classList.contains('rest')) {
        o.classList.remove('rest'); o.style.transition = 'none'; o.style.transform = 'scale(.6)';
        void o.offsetWidth; // reflow so the next transition animates
      }
      const t = this.target(s, this.idx);
      if (t != null) {
        o.style.transition = `transform ${Math.max(0.15, dur)}s cubic-bezier(.45,0,.55,1)`;
        o.style.transform = `scale(${t})`;
      }
    }
    enter(i) {
      if (i >= this.segs.length) { this.finish(true); return; }
      this.idx = i; this.segT = 0;
      const s = this.segs[i];
      this.setOrb(s, s.d || 0.6);
      this.el.label.textContent = s.label || '';
      this.el.sub.textContent = s.sub || '';
      this.el.tap.hidden = s.k !== 'free';
      this.el.restCtl.hidden = !(s.isRest && s.d >= 8);
      this.el.cycle.textContent = s.cycle ? (s.pump ? `${s.pump} / ${s.of}` : `Cycle ${s.cycle}`) : '';
      // cues
      if (!s.quiet) {
        Sound.vibrate(25);
        if (s.k === 'in' || s.k === 'in2') Sound.breath('in', s.d);
        else if (s.k === 'out') Sound.breath('out', s.d);
        else if (s.k === 'hold' || s.k === 'holdOut' || s.k === 'free') Sound.ding();
        const say = (s.k === 'rest' || s.k === 'free') && s.sub ? `${s.label}. ${s.sub}` : s.label;
        if ((s.d || 99) >= 2 || s.k === 'free') Sound.speak(say, { rate: 0.92 });
      } else if (s.k === 'pumpOut' || (s.k === 'out' && s.pump)) {
        Sound.tick();
      }
      this.render();
    }
    update(dt) {
      const s = this.segs[this.idx]; if (!s) return;
      const before = this.segT;
      this.segT += dt;
      this.countAloud(s, before);
      if (s.k === 'free') { if (this.segT > 600) this.action('tap'); }
      else if (this.segT >= s.d) {
        if (s.onEnd) this.record(s.onEnd.rec, s.onEnd.v);
        this.enter(this.idx + 1);
        return;
      }
      this.render();
    }
    /** Say the number shown in the orb as it ticks down ("Breathe in… three, two, one"). */
    countAloud(s, before) {
      if (s.quiet || s.pump || Store.data.settings.countAloud === false) return;
      if (!COUNTED.has(s.k) || !(s.d >= 3 && s.d <= 16)) return;
      const shown = (t) => Math.ceil(s.d - t - 0.001);
      const now = shown(this.segT);
      if (now < shown(before) && now >= 1 && this.segT >= 0.9) Sound.speak(NUM_WORD[now] || String(now), { rate: 1.05 });
    }
    render() {
      const s = this.segs[this.idx];
      if (s.k === 'free') {
        this.el.count.textContent = fmt(this.segT);
        this.el.ring.style.strokeDashoffset = 100;
      } else {
        const rem = Math.max(0, s.d - this.segT);
        this.el.count.textContent = s.pump ? String(s.pump) : (s.d < 1.5 ? '' : String(Math.ceil(rem - 0.001)));
        this.el.ring.style.strokeDashoffset = String(100 - 100 * Math.min(1, this.segT / s.d));
      }
      let left = s.k === 'free' ? 0 : Math.max(0, s.d - this.segT);
      let done = 0;
      for (let j = 0; j < this.segs.length; j++) {
        if (j < this.idx) done += this.segs[j].d || 0;
        else if (j > this.idx) left += this.segs[j].d || 0;
      }
      done += s.k === 'free' ? 0 : Math.min(s.d, this.segT);
      this.el.left.textContent = fmt(left) + ' left';
      this.el.prog.style.width = (100 * done / Math.max(1, this.planned)).toFixed(1) + '%';
    }
    onAction(a) {
      const s = this.segs[this.idx];
      if (a === 'tap' && s && s.k === 'free') {
        if (s.rec) this.record(s.rec, this.segT);
        Sound.go();
        this.enter(this.idx + 1);
      } else if (a === 'skiprest' && s && s.isRest) {
        this.enter(this.idx + 1);
      } else if (a === 'addrest' && s && s.isRest) {
        s.d += 10; this.planned += 10; this.render();
      }
    }
    onPause(p) {
      const o = this.el.orb, s = this.segs[this.idx];
      if (p) {
        const cur = getComputedStyle(o).transform;
        o.classList.remove('rest');
        o.style.transition = 'none'; o.style.transform = cur === 'none' ? '' : cur;
        this.el.label.textContent = 'Paused';
      } else {
        this.el.label.textContent = s.label || '';
        if (s.k === 'rest') o.classList.add('rest');
        else { const t = this.target(s, this.idx); if (t != null) { o.style.transition = `transform ${Math.max(0.2, s.d - this.segT)}s cubic-bezier(.45,0,.55,1)`; o.style.transform = `scale(${t})`; } }
      }
    }
  }

  // ===========================================================================
  // Timed sessions: workouts, single exercises, yoga flows, single poses
  // ===========================================================================
  function exDemo(id) {
    const e = Content.EX[id];
    return { frames: e.frames, anchor: e.anchor || 'hip', prop: e.prop || null, hl: e.hl };
  }
  function framesFrom(list) { return list.map(([n, h, t, label, anchor]) => ({ pose: Poses.get(n), h, t, label, anchor })); }
  const LBL = Figure.PAIR_LABEL;

  class TimedSession extends Session {
    constructor(o) { super(o); this.items = o.items; this.i = -1; }
    start() {
      this.open();
      const two = Store.data.settings.pip !== false;
      this.bar.innerHTML = '<div class="pl-progress"><i></i></div>';
      this.body.classList.add('tm-body');
      this.body.innerHTML = `
        <div class="tm-stage ${two ? '' : 'single'}">
          <div class="tm-pane"><div class="fig-box"></div><span class="tm-lbl"></span></div>
          ${two ? '<div class="tm-pane"><div class="fig-box"></div><span class="tm-lbl"></span></div>' : ''}
        </div>
        <div class="tm-side">
        <div class="tm-cap-row"><span class="stage-cap tm-cap"></span></div>
        <div class="tm-info"><div class="tm-badge" hidden></div><div class="tm-name"></div><div class="tm-sub"></div><div class="tm-breath" hidden></div></div>
        <div class="tm-row">
          <div class="tm-timer"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/></svg><div class="tm-time"></div></div>
          <div class="tm-reps" hidden><b></b><span class="small" style="opacity:.7">reps</span></div>
        </div>
        <div class="tm-next"></div>
        <div class="tm-cue"></div>
        <div class="rest-ctl" hidden><button class="rest-btn" data-act="addrest">+10s rest</button><button class="rest-btn" data-act="next">I’m ready ${ICON.next}</button></div>
        </div>`;
      this.controls.innerHTML = `
        <button class="pl-btn" data-act="prev" aria-label="Previous">${ICON.prev}</button>
        ${this.pauseButton()}
        <button class="pl-btn" data-act="next" aria-label="Skip">${ICON.next}</button>`;
      const q = (s) => $(s, this.root);
      this.el = {
        badge: q('.tm-badge'), name: q('.tm-name'), sub: q('.tm-sub'), breath: q('.tm-breath'),
        timer: q('.tm-timer'), ring: q('.tm-timer .fg'), time: q('.tm-time'), cue: q('.tm-cue'), next: q('.tm-next'), prog: q('.pl-progress i'),
        restCtl: q('.rest-ctl'), stage: q('.tm-stage'), cap: q('.tm-cap'), labels: $$('.tm-lbl', this.root)
      };
      const boxes = $$('.fig-box', this.root);
      const boxW = two ? 118 : undefined;
      this.panes = boxes.map((box, k) => new Figure(box, { anchor: 'hip', view: k ? 'front' : 'side', boxW, onPhase: k ? null : (i, label) => { this.el.cap.textContent = label || ''; } }));
      this.fig = this.panes[0];
      // flows mix standing and floor poses: keep one steady pair for the whole session
      this.flowPair = this.kind === 'flow' ? ['side', 'q'] : null;
      this.planned = this.items.reduce((a, it) => a + it.sec, 0);
      this.enter(0);
    }
    cleanup() {
      if (this.root) this.root.classList.remove('is-rest');
      for (const f of this.panes || []) f.destroy();
      this.panes = []; this.fig = null;
    }
    figs() { return (this.panes || []).filter(Boolean); }
    nextMain(from) { for (let j = from + 1; j < this.items.length; j++) if (this.items[j].kind !== 'rest') return this.items[j]; return null; }
    enter(i) {
      if (i >= this.items.length) { this.finish(true); return; }
      this.i = i; this.t = 0; this.cueIdx = 0; this.cueT = 0;
      const it = this.items[i];
      const nxt = this.nextMain(i);
      const isRest = it.kind === 'rest', isBreak = isRest && !it.trans;
      const showDemo = isRest && !it.demo && nxt ? nxt : it;
      const d = showDemo.demo;
      this.el.cap.textContent = '';
      if (d && this.fig) {
        const first = d.frames ? Poses.get(d.frames[0][0]) : d.pose ? Poses.get(d.pose) : null;
        const pair = this.flowPair || (first ? Figure.pairFor(first) : ['side', 'front']);
        const two = this.figs().length > 1;
        // floor moves on a narrow screen: two full-width rows; otherwise side by side.
        // Flows (Sun Salutation) mix standing and floor poses, so they stay side by side.
        const rows = two && pair[1] === 'q' && !this.flowPair && Figure.stackRows(this.el.stage);
        this.el.stage.classList.toggle('rows', rows);
        this.figs().forEach((f, k) => {
          const viewChanged = f.o.view !== pair[k];
          f.o.view = pair[k];
          f.o.boxW = two && !rows ? 118 : undefined;
          f.o.fit = rows ? 'tight' : 'fixed';
          f.o.fillRow = rows;
          if (this.el.labels[k]) this.el.labels[k].textContent = LBL[pair[k]] || '';
          if (d.frames) {
            f.loop(framesFrom(d.frames), { anchor: d.anchor || 'hip', flip: !!d.flip, prop: d.prop || null, speed: isBreak ? 0.5 : 1, hl: d.hl || null });
          } else if (d.pose) {
            const pose = Poses.get(d.pose);
            const smooth = f.mode === 'show' && !viewChanged;
            f.o.prop = null; f.o.speed = 1; f.o.hl = null;
            f.show(pose, { dur: smooth ? (d.dur || 1.3) : 0, anchor: d.anchor || pose.anchor || 'hip', flip: !!d.flip });
          }
        });
        if (d.frames) Figure.shareScale(this.figs());
      }
      // A rest must look like a rest: big "Rest", calm colours, dimmed preview of what's next.
      this.root.classList.toggle('is-rest', isBreak);
      this.el.badge.hidden = !(isRest || it.kind === 'prep');
      this.el.badge.textContent = isBreak ? 'REST' : isRest ? (it.badge || 'TRANSITION · NEXT') : 'GET READY';
      if (isBreak) {
        this.el.name.textContent = 'Rest';
        const why = (it.name || '').replace(/^Rest\s*[—-]\s*/i, '') || 'Breathe and recover';
        this.el.sub.textContent = why.charAt(0).toUpperCase() + why.slice(1);
        this.el.next.innerHTML = nxt ? `<span>Next up</span> ${esc(nxt.name)}` : '';
      } else {
        this.el.name.textContent = isRest && nxt ? nxt.name : it.name;
        this.el.sub.textContent = isRest ? (it.name || '') : (it.sub || '');
        this.el.next.innerHTML = nxt && !isRest ? `<span>Next</span> ${esc(nxt.name)}` : '';
      }
      this.el.breath.hidden = !it.breath;
      this.el.breath.textContent = it.breath || '';
      this.cues = (isRest ? (it.cues || (nxt && nxt.cues)) : it.cues) || [];
      this.el.cue.textContent = this.cues[0] || '';
      this.el.restCtl.hidden = !(isRest && it.sec >= 8);
      $('[data-act="prev"]', this.root).disabled = i === 0;
      // voice + sound
      if (it.kind === 'prep') Sound.speak(`Get ready. ${nxt ? 'First up: ' + nxt.name : ''}`);
      else if (isRest) { Sound.ding(); Sound.speak(it.say || (nxt ? (it.trans ? `Next: ${nxt.name}` : `Rest for ${Math.round(it.sec)} seconds. Next up: ${nxt.name}`) : 'Rest'), { rate: 0.95 }); }
      else if (it.kind === 'work') { Sound.go(); Sound.vibrate(60); Sound.speak(`${it.name}. ${it.sec} seconds. Go!`); }
      else if (it.kind === 'step') { Sound.ding(); Sound.speak(`${it.breath}. ${it.name}`, { rate: 1 }); }
      else if (it.kind === 'pose') { Sound.ding(); Sound.speak(`${it.name}${it.sub ? ', ' + it.sub : ''}. ${it.cues && it.cues[0] ? it.cues[0] : ''}`, { rate: 0.92 }); }
      this.render();
    }
    update(dt) {
      const it = this.items[this.i]; if (!it) return;
      const before = it.sec - this.t;
      this.t += dt; this.cueT += dt;
      const after = it.sec - this.t;
      if (it.kind !== 'step' && Math.ceil(after) < Math.ceil(before) && Math.ceil(after) <= 3 && Math.ceil(after) >= 1) Sound.beep();
      if (it.kind === 'work' && it.sec >= 30 && before > it.sec / 2 && after <= it.sec / 2) Sound.speak('Halfway there', { interrupt: false });
      if (it.kind === 'pose' && it.sec >= 45 && before > 10 && after <= 10) Sound.speak('Ten more seconds', { interrupt: false });
      if (it.kind === 'work' && it.sideSwitch && before > it.sec / 2 && after <= it.sec / 2) { Sound.speak('Switch sides', { interrupt: false }); for (const f of this.figs()) f.o.flip = !f.o.flip; }
      if (this.cues.length > 1 && this.cueT > 7) { this.cueT = 0; this.cueIdx = (this.cueIdx + 1) % this.cues.length; this.el.cue.textContent = this.cues[this.cueIdx]; }
      if (this.t >= it.sec) { this.enter(this.i + 1); return; }
      this.render();
    }
    render() {
      const it = this.items[this.i];
      const rem = Math.max(0, it.sec - this.t);
      this.el.time.textContent = rem >= 60 ? fmt(rem) : String(Math.ceil(rem - 0.001));
      this.el.ring.style.strokeDashoffset = String(100 * Math.min(1, this.t / it.sec));
      let done = 0;
      for (let j = 0; j < this.i; j++) done += this.items[j].sec;
      done += Math.min(it.sec, this.t);
      this.el.prog.style.width = (100 * done / Math.max(1, this.planned)).toFixed(1) + '%';
    }
    onAction(a) {
      if (a === 'next') this.enter(this.i + 1);
      else if (a === 'addrest') { const it = this.items[this.i]; if (it && it.kind === 'rest') { it.sec += 10; this.planned += 10; this.render(); } }
      else if (a === 'prev') {
        let j = this.i - 1;
        while (j > 0 && this.items[j].kind === 'rest') j--;
        this.enter(Math.max(0, j));
      }
    }
    close() { if (this.root) this.root.classList.remove('is-rest'); super.close(); }
    onPause(p) { for (const f of this.figs()) p ? f.pause() : f.play(); if (!p) this.el.cue.textContent = this.cues[this.cueIdx] || ''; else this.el.cue.textContent = 'Paused — tap play to continue'; }
  }

  function workoutItems(w) {
    const items = [];
    const exItem = (id) => {
      const e = Content.EX[id];
      return { kind: 'work', name: e.name, sub: e.muscles, sec: w.work, demo: exDemo(id), cues: e.steps.concat(e.tips || []), sideSwitch: id === 'side_plank' };
    };
    items.push(Object.assign(exItem(w.items[0]), { kind: 'prep', sec: 10, name: 'Get ready', sub: '' }));
    items[0].name = Content.EX[w.items[0]].name;
    for (let r = 0; r < w.rounds; r++) {
      w.items.forEach((id, k) => {
        items.push(exItem(id));
        const last = k === w.items.length - 1;
        if (!last) { if (w.rest > 0) items.push({ kind: 'rest', name: 'Rest — shake it out', sec: w.rest }); }
        else if (r < w.rounds - 1) items.push({ kind: 'rest', name: `Round ${r + 1} of ${w.rounds} done — breathe`, sec: w.roundRest || 30, say: `Round ${r + 1} complete. Take a breather.` });
      });
    }
    return items;
  }

  /** Merge user-chosen work/rest/rounds into a workout definition. */
  function workoutWith(w, desc) {
    const o = Object.assign({}, w);
    for (const k of ['work', 'rest', 'rounds', 'roundRest']) if (desc[k] != null) o[k] = +desc[k];
    return o;
  }

  function poseItem(y, sec, flip, side) {
    const demo = y.flowFrames ? { frames: y.flowFrames, anchor: 'rhand' } : { pose: y.pose, flip };
    return { kind: 'pose', name: y.name, sub: side ? `${y.sk} · ${side} side` : y.sk, sec, demo, cues: [y.cue].concat(y.steps) };
  }
  const transition = (sec, cue) => ({ kind: 'rest', name: 'Transition — move slowly into the next pose', badge: 'TRANSITION · NEXT', sec, trans: true, cues: cue ? [cue] : null });

  /** o: {rounds, pace, roundRest, pause} */
  function flowItems(f, o = {}) {
    const items = [];
    if (f.type === 'surya') {
      const rounds = o.rounds || f.rounds, pace = o.pace || f.pace;
      const roundRest = o.roundRest != null ? +o.roundRest : 15;
      items.push({ kind: 'prep', name: 'Surya Namaskar', sub: `${rounds} rounds · stand at the front of your mat`, sec: 8, demo: { pose: 'stand' }, cues: ['Stand tall at the top of your mat, feet together.'] });
      for (let r = 1; r <= rounds; r++) {
        for (const side of ['R', 'L']) {
          Content.suryaSteps(side).forEach((s) => {
            items.push({ kind: 'step', name: s.name, sub: `${s.sk} · round ${r}${side === 'R' ? 'a' : 'b'}`, breath: s.breath, sec: pace, demo: { pose: s.pose, anchor: s.anchor, dur: Math.min(1.6, pace * 0.45) }, cues: [s.cue] });
          });
        }
        if (r < rounds && roundRest > 0) {
          items.push({ kind: 'rest', name: `Round ${r} of ${rounds} done — stand and breathe`, badge: 'REST', sec: roundRest, demo: { pose: 'stand', anchor: 'lto' }, say: `Round ${r} complete. Stand tall and breathe.`, cues: ['Stand in Tadasana. Let your breath and heart rate settle.'] });
        }
      }
      return items;
    }
    const pause = o.pause != null ? +o.pause : 5;
    const first = Content.yoga(f.items[0][0]);
    items.push({ kind: 'prep', name: first.name, sub: 'Get ready', sec: 8, demo: first.flowFrames ? { frames: first.flowFrames, anchor: 'rhand' } : { pose: first.pose }, cues: [first.cue] });
    f.items.forEach(([id, sec], k) => {
      const y = Content.yoga(id);
      if (k > 0 && pause > 0) items.push(transition(pause, y.steps[0]));
      if (y.sides) {
        items.push(poseItem(y, sec, false, 'Right'));
        if (pause > 0) items.push(transition(pause, 'Release, then come into the other side.'));
        items.push(poseItem(y, sec, true, 'Left'));
      } else items.push(poseItem(y, sec, false));
    });
    return items;
  }

  // ===========================================================================
  // Meditation & silent timer
  // ===========================================================================
  class MeditationSession extends Session {
    constructor(o) { super(o); this.script = o.script || []; this.duration = o.duration; this.ambient = o.ambient; this.interval = o.interval || 0; this.li = 0; this.ending = false; }
    start() {
      this.open();
      this.bar.innerHTML = '<div class="pl-progress"><i></i></div>';
      this.body.innerHTML = `<div class="med-orb"></div><div class="med-line"></div><div class="med-time"></div>`;
      this.controls.innerHTML = this.pauseButton();
      this.el = { orb: $('.med-orb', this.body), line: $('.med-line', this.body), time: $('.med-time', this.body), prog: $('.pl-progress i', this.bar) };
      Sound.bell(396, 0.2, 7);
      if (this.ambient) setTimeout(() => { if (!this.finished && !this.paused) Sound.ambientStart(this.ambient); }, 1500);
      this.nextBell = this.interval ? this.interval * 60 : 0;
      this.render();
    }
    showLine(text) {
      const l = this.el.line;
      l.classList.add('fade');
      setTimeout(() => { l.textContent = text; l.classList.remove('fade'); }, 500);
    }
    update() {
      while (this.li < this.script.length && this.script[this.li][0] <= this.active) {
        const text = this.script[this.li][1];
        this.showLine(text); Sound.speak(text, { rate: 0.84, pitch: 0.98 });
        this.li++;
      }
      if (this.nextBell && this.active >= this.nextBell && this.active < this.duration - 5) { Sound.bell(528, 0.12, 4); this.nextBell += this.interval * 60; }
      if (this.active >= this.duration && !this.ending) {
        this.ending = true; Sound.ambientStop(); Sound.bell(396, 0.22, 8);
        this.showLine('Take your time before you move on.');
        setTimeout(() => this.finish(true), 3500);
      }
      this.render();
    }
    render() {
      this.el.time.textContent = fmt(Math.max(0, this.duration - this.active)) + ' remaining';
      this.el.prog.style.width = (100 * Math.min(1, this.active / this.duration)).toFixed(1) + '%';
    }
    onPause(p) {
      this.el.orb.classList.toggle('paused', p);
      if (p) Sound.ambientStop(); else if (this.ambient && !this.ending) Sound.ambientStart(this.ambient);
    }
  }

  // ===========================================================================
  // Recorded meditations (audio files from the library)
  // ===========================================================================
  const SLEEP_OPTS = [0, 10, 20, 30, 45, 60];
  const RATES = [0.75, 0.9, 1, 1.1, 1.25];
  const AMB = ['off', 'drone', 'rain'];
  const AMB_LABEL = { off: 'Off', drone: 'Drone', rain: 'Rain' };
  const POS_KEY = 'prana.audioPos';
  const rateLabel = (r) => (r === 1 ? '1×' : String(r).replace(/^0/, '') + '×');
  /** iOS ignores <audio>.volume (hardware buttons only) — detect it and say so. */
  const volumeWorks = (() => { try { const a = document.createElement('audio'); a.volume = 0.5; return a.volume === 0.5; } catch (e) { return false; } })();
  function audioPrefs() {
    const s = Store.data.settings;
    s.audio = Object.assign({ vol: 1, amb: 'off', ambVol: 0.5, rate: 1, loop: false, sleep: 0 }, s.audio || {});
    return s.audio;
  }
  const readPos = () => { try { return JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch (e) { return {}; } };
  function savePos(id, sec) {
    const all = readPos();
    if (sec == null) delete all[id]; else all[id] = Math.round(sec);
    try { localStorage.setItem(POS_KEY, JSON.stringify(all)); } catch (e) { /* ignore */ }
  }

  class AudioSession extends Session {
    constructor(o) { super(o); this.item = o.item; this.listenedSec = 0; this.playStart = 0; this.sleepEnd = 0; this.lastPosSave = 0; }
    start() {
      this.open();
      Sound.releaseAwake();                 // let the screen lock — audio keeps playing
      const vb = $('[data-act="voice"]', this.root);
      if (vb) vb.style.visibility = 'hidden';
      const it = this.item, p = this.prefs = audioPrefs();
      this.duration = it.duration || 0;
      this.bar.innerHTML = '<div class="pl-progress"><i></i></div>';
      const seg = (name, opts, cur, label) => `<div class="au-seg" role="group">${opts.map((v) => `<button type="button" data-act="${name}:${v}" class="${String(v) === String(cur) ? 'active' : ''}" aria-pressed="${String(v) === String(cur)}">${label(v)}</button>`).join('')}</div>`;
      this.body.classList.add('au-body');
      this.body.innerHTML = `
        <div class="au-art"><div class="med-orb paused"></div></div>
        <div class="au-head"><div class="au-title">${esc(it.title)}</div><div class="au-sub">${esc([it.guide, Library.CATEGORIES[it.category]].filter(Boolean).join(' · '))}</div></div>
        <div class="au-status" role="status" aria-live="polite"></div>
        <div class="au-seek">
          <input type="range" class="au-range" min="0" max="${Math.max(1, this.duration)}" step="1" value="0" aria-label="Position">
          <div class="au-times"><span class="au-cur">0:00</span><span class="au-left">-${fmt(this.duration)}</span></div>
        </div>
        <div class="au-transport">
          <button class="au-btn" data-act="loop" aria-label="Loop" aria-pressed="${p.loop}">${ICON.repeat}</button>
          <button class="pl-btn" data-act="back15" aria-label="Back 15 seconds">${ICON.back15}</button>
          <button class="pl-btn main" data-act="pause" aria-label="Play">${ICON.play}</button>
          <button class="pl-btn" data-act="fwd15" aria-label="Forward 15 seconds">${ICON.fwd15}</button>
          <button class="au-btn au-rate" data-act="rate" aria-label="Playback speed">${rateLabel(p.rate)}</button>
        </div>
        <div class="au-panel">
          <div class="au-row">
            <button class="au-ic" data-act="mute" aria-label="Mute">${ICON.volume}</button>
            ${volumeWorks ? `<input type="range" class="au-vol" min="0" max="1" step="0.01" value="${p.vol}" aria-label="Volume">` : '<span class="au-note">Use your device’s volume buttons</span>'}
          </div>
          <div class="au-row"><span class="au-lbl">Background</span>${seg('amb', AMB, p.amb, (v) => AMB_LABEL[v])}</div>
          <div class="au-row au-ambrow" ${p.amb === 'off' ? 'hidden' : ''}><span class="au-lbl">Bg volume</span><input type="range" class="au-ambvol" min="0" max="1" step="0.01" value="${p.ambVol}" aria-label="Background volume"></div>
          <div class="au-row"><span class="au-lbl">Stop after</span>${seg('sleep', SLEEP_OPTS, p.sleep, (v) => (v ? v + 'm' : 'End'))}</div>
        </div>`;
      this.controls.innerHTML = '';
      const q = (s) => $(s, this.body);
      this.el = { orb: q('.med-orb'), status: q('.au-status'), range: q('.au-range'), cur: q('.au-cur'), left: q('.au-left'), play: q('[data-act="pause"]'), loop: q('[data-act="loop"]'), rate: q('[data-act="rate"]'), mute: q('[data-act="mute"]'), vol: q('.au-vol'), ambRow: q('.au-ambrow'), ambVol: q('.au-ambvol'), prog: $('.pl-progress i', this.bar) };

      const a = this.audio = document.createElement('audio');
      a.preload = 'auto'; a.loop = !!p.loop; a.playbackRate = p.rate;
      if ('preservesPitch' in a) a.preservesPitch = true;
      if (volumeWorks) a.volume = p.vol;
      a.addEventListener('play', () => this.onPlayState(true));
      a.addEventListener('pause', () => this.onPlayState(false));
      a.addEventListener('playing', () => this.status(''));
      a.addEventListener('waiting', () => { if (!a.paused) this.status('Loading…'); });
      a.addEventListener('timeupdate', () => this.render());
      a.addEventListener('loadedmetadata', () => {
        if (isFinite(a.duration) && a.duration > 0) { this.duration = a.duration; this.el.range.max = String(Math.round(a.duration)); }
        if (this.resumeAt) { a.currentTime = this.resumeAt; this.resumeAt = 0; }
        this.render();
      });
      a.addEventListener('ended', () => { if (!a.loop) { savePos(it.id, null); this.status('Complete'); setTimeout(() => this.finish(true), 1200); } });
      a.addEventListener('error', () => {
        this.status(navigator.onLine ? 'Couldn’t play this recording. Try again in a moment.' : 'You’re offline. Download this meditation to listen without a connection.', true);
      });

      // seek / volume sliders
      this.el.range.addEventListener('input', () => { this.scrubbing = true; this.el.cur.textContent = fmt(+this.el.range.value); });
      this.el.range.addEventListener('change', () => { this.scrubbing = false; this.seek(+this.el.range.value); });
      if (this.el.vol) {
        this.el.vol.addEventListener('input', () => { a.volume = +this.el.vol.value; if (a.muted && a.volume > 0) this.setMute(false); });
        this.el.vol.addEventListener('change', () => { p.vol = +this.el.vol.value; Store.save(); });
      }
      this.el.ambVol.addEventListener('input', () => Sound.ambientVolume(+this.el.ambVol.value));
      this.el.ambVol.addEventListener('change', () => { p.ambVol = +this.el.ambVol.value; Store.save(); });

      // resume where you left off
      const saved = readPos()[it.id];
      if (saved > 20 && (!this.duration || saved < this.duration - 20)) {
        this.resumeAt = saved;
        this.status(`Resuming at ${fmt(saved)} · <button class="link-btn" data-act="restart">Start over</button>`);
      }
      if (p.sleep) this.sleepEnd = performance.now() + p.sleep * 60e3;
      this.mediaSession(true);

      // stream right away (keeps the tap's permission to play); offline copies load first
      if (Library.isDownloaded(it.id) || it.localUrl) {
        Library.playableUrl(it).then((url) => { if (this.finished) return; this.url = url; a.src = url; this.play(); });
      } else { this.url = Library.audioUrl(it); a.src = this.url; this.play(); }
      this.status(this.el.status.innerHTML || 'Loading…');
    }

    play() {
      const pr = this.audio.play();
      if (pr && pr.catch) pr.catch((e) => { if (e && e.name === 'NotAllowedError') this.status('Tap play to begin'); });
    }
    status(html, isErr) { this.el.status.innerHTML = html; this.el.status.classList.toggle('err', !!isErr); }
    listened() { return this.listenedSec + (this.playStart ? (performance.now() - this.playStart) / 1000 : 0); }
    onPlayState(playing) {
      if (this.finished) return;
      if (playing && !this.playStart) this.playStart = performance.now();
      if (!playing && this.playStart) { this.listenedSec += (performance.now() - this.playStart) / 1000; this.playStart = 0; }
      this.paused = !playing;
      this.el.play.innerHTML = playing ? ICON.pause : ICON.play;
      this.el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      this.el.orb.classList.toggle('paused', !playing);
      if (playing && this.prefs.amb !== 'off') Sound.ambientStart(this.prefs.amb, { force: true, volume: this.prefs.ambVol, fadeIn: 2.5 });
      else if (!playing) Sound.ambientStop();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      if (!playing) savePos(this.item.id, this.audio.currentTime);
    }
    togglePause() { if (this.audio.paused) { if (/Tap play/.test(this.el.status.textContent)) this.status(''); this.play(); } else this.audio.pause(); }
    seek(t) {
      const a = this.audio, max = this.duration || a.duration || 0;
      a.currentTime = Math.max(0, Math.min(max ? max - 0.25 : t, t));
      this.render();
    }
    setMute(m) {
      this.audio.muted = m;
      this.el.mute.innerHTML = m ? ICON.mute : ICON.volume;
      this.el.mute.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
    }
    _loop() {                                   // driven by the audio clock, not the session timer
      if (this.finished) return;
      this.active = this.listened();
      if (this.sleepEnd && performance.now() >= this.sleepEnd && !this.fading) this.sleepFade();
    }
    sleepFade() {
      this.fading = true;
      const a = this.audio, start = volumeWorks ? a.volume : 1;
      Sound.ambientStop();
      let k = 0;
      const iv = setInterval(() => {
        k++;
        if (volumeWorks) a.volume = Math.max(0, start * (1 - k / 30));
        if (k >= 30 || this.finished) {
          clearInterval(iv); a.pause();
          if (volumeWorks) a.volume = start;
          if (!this.finished) this.finish(this.listened() >= Math.min(this.duration * 0.9, this.duration - 30));
        }
      }, 200);
      this.status('Sleep timer — fading out');
    }
    render() {
      const a = this.audio; if (!a) return;
      const t = a.currentTime || 0, d = this.duration || a.duration || 0;
      if (!this.scrubbing) { this.el.range.value = String(Math.round(t)); this.el.cur.textContent = fmt(t); }
      this.el.left.textContent = '-' + fmt(Math.max(0, d - t));
      this.el.prog.style.width = d ? (100 * Math.min(1, t / d)).toFixed(2) + '%' : '0%';
      this.el.range.style.setProperty('--pct', d ? (100 * t / d).toFixed(2) + '%' : '0%');
      if (performance.now() - this.lastPosSave > 5000 && t > 5) { this.lastPosSave = performance.now(); savePos(this.item.id, t); }
      if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && d && isFinite(d)) {
        try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: a.playbackRate, position: Math.min(t, d) }); } catch (e) { /* ignore */ }
      }
    }
    onAction(act) {
      const a = this.audio, p = this.prefs;
      if (act === 'back15' || act === 'prev') this.seek(a.currentTime - 15);
      else if (act === 'fwd15' || act === 'next') this.seek(a.currentTime + 15);
      else if (act === 'restart') { this.resumeAt = 0; this.seek(0); savePos(this.item.id, null); this.status(''); }
      else if (act === 'loop') {
        p.loop = !p.loop; a.loop = p.loop; Store.save();
        this.el.loop.setAttribute('aria-pressed', String(p.loop));
        UI.toast(p.loop ? 'Loop on — plays again from the start' : 'Loop off');
      } else if (act === 'rate') {
        p.rate = RATES[(RATES.indexOf(p.rate) + 1) % RATES.length] || 1; a.playbackRate = p.rate; Store.save();
        this.el.rate.textContent = rateLabel(p.rate);
      } else if (act === 'mute') this.setMute(!a.muted);
      else if (act.startsWith('amb:')) {
        p.amb = act.slice(4); Store.save();
        this.markSeg('amb', p.amb);
        this.el.ambRow.hidden = p.amb === 'off';
        if (p.amb === 'off') Sound.ambientStop(); else if (!a.paused) Sound.ambientStart(p.amb, { force: true, volume: p.ambVol, fadeIn: 1.5 });
      } else if (act.startsWith('sleep:')) {
        p.sleep = +act.slice(6); Store.save();
        this.markSeg('sleep', p.sleep);
        this.sleepEnd = p.sleep ? performance.now() + p.sleep * 60e3 : 0;
        UI.toast(p.sleep ? `Stops in ${p.sleep} minutes` : (p.loop ? 'Plays until you stop it' : 'Stops at the end'));
      }
    }
    markSeg(name, v) {
      $$(`[data-act^="${name}:"]`, this.body).forEach((b) => { const on = b.dataset.act === `${name}:${v}`; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    }
    mediaSession(on) {
      if (!('mediaSession' in navigator)) return;
      const ms = navigator.mediaSession;
      const set = (k, fn) => { try { ms.setActionHandler(k, on ? fn : null); } catch (e) { /* unsupported action */ } };
      if (on && window.MediaMetadata) {
        const base = location.href.split('#')[0].replace(/[^/]*$/, '');
        ms.metadata = new MediaMetadata({ title: this.item.title, artist: this.item.guide || 'Prana', album: 'Prana · Meditations', artwork: [{ src: base + 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: base + 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      } else if (!on) ms.metadata = null;
      set('play', () => this.play());
      set('pause', () => this.audio.pause());
      set('seekbackward', () => this.seek(this.audio.currentTime - 15));
      set('seekforward', () => this.seek(this.audio.currentTime + 15));
      set('seekto', (d) => this.seek(d.seekTime));
      set('stop', () => this.audio.pause());
    }
    cleanup() {
      if (!this.audio) return;
      const a = this.audio;
      if (!this.finished || a.currentTime < (this.duration || 0) - 5) { if (a.currentTime > 20 && !a.ended) savePos(this.item.id, a.currentTime); }
      a.pause(); a.removeAttribute('src'); a.load();
      if (this.url && this.url.startsWith('blob:') && !this.item.localUrl) URL.revokeObjectURL(this.url);
      this.mediaSession(false);
      this.audio = null;
    }
    // keep the last frame visible after the audio element is gone
    renderSummary(completed, logged, pbs) { this.body.classList.remove('au-body'); super.renderSummary(completed, logged, pbs); }
  }

  // ===========================================================================
  // Launcher
  // ===========================================================================
  /** Remembered rest / timing choices (Settings → prefs). */
  const prefs = () => Store.data.settings.prefs || {};

  function describe(desc) {
    switch (desc.kind) {
      case 'breath': { const b = Content.breath(desc.id); return { title: b.name, sub: `${desc.minutes || b.minutes} min · ${b.tag}`, cat: 'breathe', icon: 'wind', href: '#/breathe/' + b.id, min: desc.minutes || b.minutes }; }
      case 'challenge': { const c = Content.challenge(desc.id); return { title: c.name, sub: `~${c.minutes} min · ${c.tag}`, cat: 'challenge', icon: c.icon, href: '#/challenge/' + c.id, min: c.minutes }; }
      case 'workout': {
        const base = desc.custom || Content.workout(desc.id);
        const w = desc.custom ? base : workoutWith(base, Object.assign({}, prefs().wk && prefs().wk[base.id], desc));
        const min = Math.round(Content.workoutSeconds(w) / 60);
        return { title: w.name, sub: `${min} min · ${w.tag || w.items.length + ' sets'}`, cat: 'move', icon: w.icon || 'move', href: desc.custom ? null : '#/workout/' + w.id, min };
      }
      case 'exercise': { const e = Content.EX[desc.id]; return { title: e.name, sub: `${fmt(desc.seconds)} hold`, cat: 'move', icon: 'target', href: '#/exercise/' + e.id, min: Math.ceil(desc.seconds / 60) }; }
      case 'flow': { const f = Content.flow(desc.id); const p = prefs(); const min = Math.round(Content.flowSeconds(f, { rounds: desc.rounds, pace: p.suryaPace, roundRest: p.suryaRest, pause: p.flowPause }) / 60); return { title: f.name + (desc.rounds ? ` · ${desc.rounds} rounds` : ''), sub: `${min} min · ${f.tag}`, cat: 'yoga', icon: f.icon || 'lotus', href: '#/flow/' + f.id, min }; }
      case 'pose': { const y = Content.yoga(desc.id); return { title: y.name, sub: y.sk, cat: 'yoga', icon: 'lotus', href: '#/pose/' + y.id, min: 1 }; }
      case 'meditation': { const m = Meditations.get(desc.id); return { title: m.name, sub: `${m.minutes} min · ${m.tag}`, cat: 'mind', icon: m.icon || 'moon', href: '#/meditation/' + m.id, min: m.minutes }; }
      case 'audio': {
        const it = desc.item || (window.Library && Library.get(desc.id));
        const min = it ? Math.max(1, Math.round(it.duration / 60)) : 10;
        return { title: it ? it.title : 'Recorded meditation', sub: it ? `${min} min · ${it.guide || 'Recorded'}` : 'Recorded meditation', cat: 'mind', icon: 'headphones', href: '#/audio/' + desc.id, min };
      }
      case 'timer': return { title: `Silent Meditation`, sub: `${desc.minutes} min · bells mark the time`, cat: 'mind', icon: 'clock', href: '#/mind', min: desc.minutes };
    }
    return { title: '?', sub: '', cat: 'breathe', icon: 'wind' };
  }

  function start(desc, o = {}) {
    if (active) return;
    const onDone = o.onDone;
    let s;
    switch (desc.kind) {
      case 'breath': {
        const b = Content.breath(desc.id);
        const savedRest = prefs().breathRest && prefs().breathRest[b.id];
        const rest = desc.rest != null ? desc.rest : (savedRest != null ? savedRest : Content.breathRestDefault(b));
        s = new BreathSession({ title: o.title || b.name, cat: 'breathe', kind: 'breath', ref: b.id, segs: Content.buildBreath(b, desc.minutes, { rest }), onDone });
        break;
      }
      case 'challenge': {
        const c = Content.challenge(desc.id);
        s = new BreathSession({ title: o.title || c.name, cat: 'challenge', kind: 'challenge', ref: c.id, segs: c.build(), onDone });
        break;
      }
      case 'workout': {
        const base = desc.custom || Content.workout(desc.id);
        const w = desc.custom ? base : workoutWith(base, Object.assign({}, prefs().wk && prefs().wk[base.id], desc));
        s = new TimedSession({ title: o.title || w.name, cat: 'move', kind: 'workout', ref: w.id || 'custom', items: workoutItems(w), onDone });
        break;
      }
      case 'exercise': {
        const e = Content.EX[desc.id];
        const sets = Math.max(1, +(desc.sets || 1)), rest = desc.rest != null ? +desc.rest : 30;
        const items = [{ kind: 'prep', name: e.name, sub: 'Get into position', sec: 6, demo: exDemo(e.id), cues: e.steps }];
        for (let k = 1; k <= sets; k++) {
          items.push({ kind: 'work', name: e.name, sub: sets > 1 ? `Set ${k} of ${sets} · ${e.muscles}` : e.muscles, sec: desc.seconds || 45, demo: exDemo(e.id), cues: e.steps.concat(e.tips || []), sideSwitch: e.id === 'side_plank' });
          if (k < sets && rest > 0) items.push({ kind: 'rest', name: `Set ${k} done — rest`, sec: rest, say: `Set ${k} done. Rest.` });
        }
        s = new TimedSession({ title: o.title || e.name, cat: 'move', kind: 'exercise', ref: e.id, items, onDone });
        break;
      }
      case 'flow': {
        const f = Content.flow(desc.id);
        const p = prefs();
        const opts = {
          rounds: desc.rounds || f.rounds, pace: desc.pace || p.suryaPace || f.pace,
          roundRest: desc.roundRest != null ? desc.roundRest : p.suryaRest,
          pause: desc.pause != null ? desc.pause : p.flowPause
        };
        s = new TimedSession({ title: o.title || f.name, cat: 'yoga', kind: 'flow', ref: f.id, items: flowItems(f, opts), onDone });
        break;
      }
      case 'pose': {
        const y = Content.yoga(desc.id);
        const sec = desc.seconds || y.hold;
        const items = [{ kind: 'prep', name: y.name, sub: 'Move into the pose', sec: 8, demo: y.flowFrames ? { frames: y.flowFrames, anchor: 'rhand' } : { pose: y.pose }, cues: y.steps }];
        if (y.sides) { items.push(poseItem(y, sec, false, 'Right')); items.push(transition(8, 'Release, then come into the other side.')); items.push(poseItem(y, sec, true, 'Left')); }
        else items.push(poseItem(y, sec, false));
        s = new TimedSession({ title: o.title || y.name, cat: 'yoga', kind: 'pose', ref: y.id, items, onDone });
        break;
      }
      case 'meditation': {
        const m = Meditations.get(desc.id);
        s = new MeditationSession({ title: o.title || m.name, cat: 'mind', kind: 'meditation', ref: m.id, script: m.script, duration: m.duration, ambient: m.ambient, onDone });
        break;
      }
      case 'audio': {
        const it = desc.item || (window.Library && Library.get(desc.id));
        if (!it) { UI.toast('That recording isn’t available right now'); return; }
        s = new AudioSession({ title: o.title || it.title, cat: 'mind', kind: 'audio', ref: it.id, item: it, onDone });
        break;
      }
      case 'timer': {
        const min = desc.minutes || 5;
        s = new MeditationSession({
          title: o.title || `Silent Meditation · ${min} min`, cat: 'mind', kind: 'timer', ref: 'timer', duration: min * 60, ambient: desc.ambient === false ? null : 'drone', interval: desc.interval || 0, onDone,
          script: [[1, 'Settle into stillness. Rest your attention on the breath.'], [Math.min(40, min * 30), 'Whenever the mind wanders, gently come back.'], [Math.max(60, min * 60 - 30), 'Rest here for these last moments.']]
        });
        break;
      }
      default: return;
    }
    s.start();
  }

  window.Play = { start, describe, prefs, workoutWith, get active() { return active; }, RESULT_META };
})();
