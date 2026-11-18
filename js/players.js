/* Prana — immersive session players. */
(function () {
  'use strict';
  const { ICON, esc, $, fmt, fmtMin } = UI;

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
      this.segT += dt;
      if (s.k === 'free') { if (this.segT > 600) this.action('tap'); }
      else if (this.segT >= s.d) {
        if (s.onEnd) this.record(s.onEnd.rec, s.onEnd.v);
        this.enter(this.idx + 1);
        return;
      }
      this.render();
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
  function framesFrom(list) { return list.map(([n, h, t, label]) => ({ pose: Poses.get(n), h, t, label })); }
  const VIEW_ORDER = ['auto', 'q', 'front', 'side', 'orbit'];
  /** The picture-in-picture shows a complementary angle to the main view. */
  const pipViewFor = (v) => (v === 'q' || v === 'orbit' ? 'side' : 'q');

  class TimedSession extends Session {
    constructor(o) { super(o); this.items = o.items; this.i = -1; }
    start() {
      this.open();
      this.bar.innerHTML = '<div class="pl-progress"><i></i></div>';
      this.body.innerHTML = `
        <div class="tm-stage">
          <div class="fig-box"></div>
          <div class="tm-badge" hidden></div>
          <button class="tm-view" data-act="view" aria-label="Change camera angle"></button>
          <button class="tm-pip" data-act="pip" aria-label="Second camera angle — tap to hide"><div class="pip-box"></div></button>
        </div>
        <div class="tm-cap-row"><span class="stage-cap tm-cap"></span></div>
        <div class="tm-info"><div class="tm-name"></div><div class="tm-sub"></div><div class="tm-breath" hidden></div></div>
        <div class="tm-row">
          <div class="tm-timer"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/></svg><div class="tm-time"></div></div>
          <div class="tm-reps" hidden><b></b><span class="small" style="opacity:.7">reps</span></div>
        </div>
        <div class="tm-cue"></div>
        <div class="rest-ctl" hidden><button class="rest-btn" data-act="addrest">+10s</button><button class="rest-btn" data-act="next">Skip rest ${ICON.next}</button></div>
        <div class="tm-next"></div>`;
      this.controls.innerHTML = `
        <button class="pl-btn" data-act="prev" aria-label="Previous">${ICON.prev}</button>
        ${this.pauseButton()}
        <button class="pl-btn" data-act="next" aria-label="Skip">${ICON.next}</button>`;
      const q = (s) => $(s, this.root);
      this.el = {
        box: q('.fig-box'), badge: q('.tm-badge'), name: q('.tm-name'), sub: q('.tm-sub'), breath: q('.tm-breath'),
        timer: q('.tm-timer'), ring: q('.tm-timer .fg'), time: q('.tm-time'), cue: q('.tm-cue'), next: q('.tm-next'), prog: q('.pl-progress i'),
        restCtl: q('.rest-ctl'), view: q('.tm-view'), pip: q('.tm-pip'), pipBox: q('.pip-box'), cap: q('.tm-cap')
      };
      const view = Store.data.settings.view || 'auto';
      this.fig = new Figure(this.el.box, { anchor: 'hip', view, onPhase: (i, label) => { this.el.cap.textContent = label || ''; } });
      this.pip = new Figure(this.el.pipBox, { anchor: 'hip', view: pipViewFor(view), fit: 'tight', label: 'Second camera angle' });
      this.el.pip.hidden = Store.data.settings.pip === false;
      this.updateViewBtn();
      this.planned = this.items.reduce((a, it) => a + it.sec, 0);
      this.enter(0);
    }
    cleanup() {
      if (this.fig) { this.fig.destroy(); this.fig = null; }
      if (this.pip) { this.pip.destroy(); this.pip = null; }
    }
    updateViewBtn() {
      const v = Store.data.settings.view || 'auto';
      this.el.view.innerHTML = `${ICON.repeat}<span>${Figure.VIEW_LABEL[v]}</span>`;
    }
    figs() { return [this.fig, this.pip].filter(Boolean); }
    nextMain(from) { for (let j = from + 1; j < this.items.length; j++) if (this.items[j].kind !== 'rest') return this.items[j]; return null; }
    enter(i) {
      if (i >= this.items.length) { this.finish(true); return; }
      this.i = i; this.t = 0; this.cueIdx = 0; this.cueT = 0;
      const it = this.items[i];
      const nxt = this.nextMain(i);
      const showDemo = it.kind === 'rest' && !it.demo && nxt ? nxt : it;
      const d = showDemo.demo;
      this.el.cap.textContent = '';
      if (d && this.fig) {
        for (const f of this.figs()) {
          if (d.frames) {
            f.loop(framesFrom(d.frames), { anchor: d.anchor || 'hip', flip: !!d.flip, prop: d.prop || null, speed: it.kind === 'rest' ? 0.6 : 1, hl: d.hl || null });
          } else if (d.pose) {
            const pose = Poses.get(d.pose);
            const smooth = f.mode === 'show';
            f.o.prop = null; f.o.speed = 1; f.o.hl = null;
            f.show(pose, { dur: smooth ? (d.dur || 1.3) : 0, anchor: d.anchor || pose.anchor || 'hip', flip: !!d.flip });
          }
        }
      }
      const isRest = it.kind === 'rest';
      this.el.badge.hidden = !(isRest || it.kind === 'prep');
      this.el.badge.textContent = isRest ? (it.badge || 'REST · NEXT UP') : 'GET READY';
      this.el.name.textContent = isRest && nxt ? nxt.name : it.name;
      this.el.sub.textContent = isRest ? (it.name || 'Rest') : (it.sub || '');
      this.el.breath.hidden = !it.breath;
      this.el.breath.textContent = it.breath || '';
      this.el.next.textContent = nxt && !isRest ? 'Next: ' + nxt.name : '';
      this.cues = (isRest ? (it.cues || (nxt && nxt.cues)) : it.cues) || [];
      this.el.cue.textContent = this.cues[0] || '';
      this.el.restCtl.hidden = !(isRest && it.sec >= 8);
      $('[data-act="prev"]', this.root).disabled = i === 0;
      // voice + sound
      if (it.kind === 'prep') Sound.speak(`Get ready. ${nxt ? 'First up: ' + nxt.name : ''}`);
      else if (isRest) { Sound.ding(); Sound.speak(it.say || (nxt ? (it.trans ? `Next: ${nxt.name}` : `Rest. Next up: ${nxt.name}`) : 'Rest'), { rate: 0.95 }); }
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
      else if (a === 'view') {
        const s = Store.data.settings;
        const v = VIEW_ORDER[(VIEW_ORDER.indexOf(s.view || 'auto') + 1) % VIEW_ORDER.length];
        s.view = v; Store.save();
        this.fig.setView(v); if (this.pip) this.pip.setView(pipViewFor(v));
        this.updateViewBtn();
        UI.toast(`Camera: ${Figure.VIEW_LABEL[v]}`);
      } else if (a === 'pip') {
        const s = Store.data.settings; s.pip = false; Store.save();
        this.el.pip.hidden = true; UI.toast('Second angle hidden — turn it back on in Settings');
      }
      else if (a === 'prev') {
        let j = this.i - 1;
        while (j > 0 && this.items[j].kind === 'rest') j--;
        this.enter(Math.max(0, j));
      }
    }
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
