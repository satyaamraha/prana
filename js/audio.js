/* Prana — synthesized sound (no audio files), speech cues, haptics, wake lock. */
(function () {
  'use strict';
  let ctx = null, master = null;

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const soundOn = () => Store.data.settings.sound;

  function envelope(g, t0, attack, peak, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function tone(freq, dur = 0.25, o = {}) {
    const c = ac(); if (!c || !soundOn()) return;
    const t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    envelope(g, t0, o.attack || 0.01, o.peak || 0.16, dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  /** Singing-bowl style bell built from inharmonic partials. */
  function bell(freq = 396, peak = 0.2, dur = 6) {
    const c = ac(); if (!c || !soundOn()) return;
    const t0 = c.currentTime;
    const partials = [[1, 1], [2.02, 0.42], [2.76, 0.5], [4.07, 0.2], [5.4, 0.12]];
    partials.forEach(([m, a], i) => {
      const osc = c.createOscillator(), g = c.createGain();
      osc.frequency.value = freq * m;
      osc.detune.value = (i % 2 ? 4 : -3);
      envelope(g, t0, 0.008, peak * a, dur / (1 + i * 0.45));
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + dur + 0.1);
    });
  }

  let noiseBuf = null;
  function noise(c) {
    if (noiseBuf) return noiseBuf;
    const len = c.sampleRate * 2;
    noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /** Soft airy "whoosh" that follows an inhale (rising) or exhale (falling). */
  function breath(direction, dur) {
    const c = ac(); if (!c || !soundOn() || dur < 1) return;
    const t0 = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noise(c); src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
    const lo = 350, hi = 1100;
    bp.frequency.setValueAtTime(direction === 'in' ? lo : hi, t0);
    bp.frequency.exponentialRampToValueAtTime(direction === 'in' ? hi : lo, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05, t0 + Math.min(1.2, dur * 0.35));
    g.gain.setValueAtTime(0.05, t0 + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
    // a faint tonal guide underneath
    tone(direction === 'in' ? 196 : 293.7, dur, { to: direction === 'in' ? 293.7 : 196, peak: 0.025, attack: Math.min(1, dur * 0.3) });
  }

  const tick = () => tone(1200, 0.05, { peak: 0.06 });
  const beep = () => tone(880, 0.13, { peak: 0.14, type: 'triangle' });
  const go = () => tone(1320, 0.3, { peak: 0.16, type: 'triangle' });
  const ding = () => tone(660, 0.6, { peak: 0.1 });
  function success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.5, { delay: i * 0.11, peak: 0.12, type: 'triangle' }));
  }

  // Ambient bed: brown noise + slow drone ---------------------------------
  let amb = null;
  const AMB_LEVEL = 0.22;
  /** o.force: play even if ambient sound is off in Settings (the user chose it in the player). o.volume: 0–1. */
  function ambientStart(kind = 'drone', o = {}) {
    const c = ac(); if (!c || (!o.force && (!soundOn() || !Store.data.settings.ambient))) return;
    ambientStop(true);
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, c.currentTime);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0001, AMB_LEVEL * (o.volume == null ? 1 : o.volume)), c.currentTime + (o.fadeIn || 4));
    out.connect(master);
    const nodes = [];
    const len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; ch[i] = last * 3.5; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'rain' ? 2200 : 480;
    const ng = c.createGain(); ng.gain.value = kind === 'rain' ? 0.45 : 0.32;
    src.connect(lp); lp.connect(ng); ng.connect(out); src.start(); nodes.push(src);
    if (kind !== 'rain') {
      [110, 164.81, 220.5].forEach((f, i) => {
        const o = c.createOscillator(); o.frequency.value = f;
        const g = c.createGain(); g.gain.value = 0.045 / (i + 1);
        const lfo = c.createOscillator(); lfo.frequency.value = 0.05 + i * 0.031;
        const lg = c.createGain(); lg.gain.value = 0.03 / (i + 1);
        lfo.connect(lg); lg.connect(g.gain);
        o.connect(g); g.connect(out); o.start(); lfo.start(); nodes.push(o, lfo);
      });
    }
    amb = { out, nodes };
  }
  function ambientStop(immediate) {
    if (!amb || !ctx) return;
    const { out, nodes } = amb; amb = null;
    const t = ctx.currentTime, fade = immediate ? 0.05 : 1.5;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } }); out.disconnect(); }, fade * 1000 + 100);
  }
  const ambientOn = () => !!amb;
  function ambientVolume(v) {
    if (!amb || !ctx) return;
    const t = ctx.currentTime;
    amb.out.gain.cancelScheduledValues(t);
    amb.out.gain.setTargetAtTime(Math.max(0.0001, AMB_LEVEL * v), t, 0.08);
  }

  // Speech ---------------------------------------------------------------
  const hasTTS = 'speechSynthesis' in window;
  let voices = [];
  function loadVoices() { voices = hasTTS ? speechSynthesis.getVoices() : []; }
  if (hasTTS) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function pickVoice() {
    const want = Store.data.settings.voiceURI;
    let v = want && voices.find((x) => x.voiceURI === want);
    if (!v) v = voices.find((x) => /^en/i.test(x.lang) && /Samantha|Serena|Karen|Moira|Tessa|Google UK English Female|Google US English|Natural/i.test(x.name));
    if (!v) v = voices.find((x) => /^en/i.test(x.lang));
    return v || null;
  }
  function speak(text, o = {}) {
    if (!hasTTS || !Store.data.settings.voice || !text) return;
    if (o.interrupt !== false) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = o.rate || 0.95; u.pitch = o.pitch || 1; u.volume = 1;
    speechSynthesis.speak(u);
  }
  function hush() { if (hasTTS) speechSynthesis.cancel(); }

  // Haptics & wake lock -------------------------------------------------
  function vibrate(p) { if (Store.data.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } }
  let lock = null, wantLock = false;
  async function keepAwake() {
    wantLock = true;
    try { if ('wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch (e) { /* not allowed */ }
  }
  function releaseAwake() { wantLock = false; if (lock) { lock.release().catch(() => {}); lock = null; } }
  document.addEventListener('visibilitychange', () => { if (wantLock && document.visibilityState === 'visible') keepAwake(); });

  window.Sound = {
    unlock: ac, tone, bell, breath, tick, beep, go, ding, success,
    ambientStart, ambientStop, ambientOn, ambientVolume,
    speak, hush, get voices() { return voices; }, hasTTS,
    vibrate, keepAwake, releaseAwake
  };
})();
