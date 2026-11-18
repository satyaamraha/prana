/* Prana — local persistence (everything stays on this device). */
(function () {
  'use strict';
  const KEY = 'prana.v1';
  const DEFAULTS = {
    v: 1,
    profile: { name: '', onboarded: false, created: null },
    settings: {
      voice: true, sound: true, vibrate: true, ambient: true,
      goal: 10, voiceURI: '', theme: 'auto', reminder: '07:30',
      view: 'auto', pip: true,  // demo camera angle; second angle in the player
      // remembered rest & timing choices
      prefs: { wk: {}, breathRest: {}, flowPause: 5, suryaRest: 15, suryaPace: 5, exSets: 3, exRest: 30 }
    },
    log: [],        // [{id, at, day, kind, ref, title, sec, cat}]
    pbs: {},        // key -> {v, at}
    hist: {},       // key -> [{v, day}]
    programs: {}    // id -> {start, done: [dayNumbers], last}
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  function merge(base, over) {
    const out = clone(base);
    if (!over || typeof over !== 'object') return out;
    for (const k of Object.keys(over)) {
      const v = over[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = merge(out[k], v);
      } else out[k] = v;
    }
    return out;
  }

  let data;
  try { data = merge(DEFAULTS, JSON.parse(localStorage.getItem(KEY) || 'null')); }
  catch (e) { data = clone(DEFAULTS); }

  // Change tracking for cloud sync -------------------------------------------
  const listeners = new Set();
  let settingsHash = JSON.stringify([data.settings, data.profile]);
  function save(opts) {
    const h = JSON.stringify([data.settings, data.profile]);
    if (h !== settingsHash) { settingsHash = h; data.settingsAt = Date.now(); }
    let ok = true;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { ok = false; }
    if (!(opts && opts.silent)) listeners.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
    return ok;
  }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  /**
   * Merge two Prana documents without losing history:
   * sessions & test results are unioned, personal bests recomputed from results,
   * program days unioned, settings/profile taken from the most recently changed copy.
   * A `resetAt` timestamp (from "erase all data") drops anything recorded before it.
   */
  const LOCAL_ONLY_SETTINGS = ['voiceURI'];
  function mergeDocs(a, b) {
    a = merge(DEFAULTS, a || {}); b = merge(DEFAULTS, b || {});
    const cutoff = Math.max(a.resetAt || 0, b.resetAt || 0);
    const cutDay = cutoff ? dayKey(cutoff) : '';
    // with only a day (no timestamp), anything on or before the reset day is dropped
    const after = (iso, day) => !cutoff || (iso ? Date.parse(iso) > cutoff : (day || '') > cutDay);
    const out = clone(a);
    out.resetAt = cutoff || undefined;
    // sessions
    const seen = new Set();
    out.log = [];
    for (const s of a.log.concat(b.log)) {
      if (!s || !s.id || seen.has(s.id) || !after(s.at, s.day)) continue;
      seen.add(s.id); out.log.push(s);
    }
    out.log.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
    // test results → personal bests
    out.hist = {}; out.pbs = {};
    for (const k of new Set(Object.keys(a.hist).concat(Object.keys(b.hist)))) {
      const keys = new Set(), list = [];
      for (const e of (a.hist[k] || []).concat(b.hist[k] || [])) {
        const key = e.at || (e.day + '|' + e.v);
        if (keys.has(key) || !after(e.at, e.day)) continue;
        keys.add(key); list.push(e);
      }
      list.sort((x, y) => ((x.at || x.day) < (y.at || y.day) ? -1 : 1));
      if (!list.length) continue;
      out.hist[k] = list;
      const best = list.reduce((m, e) => (e.v > m.v ? e : m), list[0]);
      out.pbs[k] = { v: best.v, at: best.day };
    }
    // programs
    out.programs = {};
    for (const id of new Set(Object.keys(a.programs).concat(Object.keys(b.programs)))) {
      const ps = [a.programs[id], b.programs[id]].filter((p) => p && after(p.lastAt || p.startAt, p.last || p.start));
      if (!ps.length) continue;
      out.programs[id] = {
        start: ps.map((p) => p.start).sort()[0],
        startAt: ps.map((p) => p.startAt).filter(Boolean).sort()[0],
        done: [...new Set(ps.flatMap((p) => p.done || []))].sort((x, y) => x - y),
        last: ps.map((p) => p.last).filter(Boolean).sort().pop() || null,
        lastAt: ps.map((p) => p.lastAt).filter(Boolean).sort().pop()
      };
    }
    // settings & profile: newest wins, but keep device-only choices from `a` (this device)
    const newer = (b.settingsAt || 0) > (a.settingsAt || 0) ? b : a;
    out.settings = clone(newer.settings);
    for (const k of LOCAL_ONLY_SETTINGS) out.settings[k] = a.settings[k];
    out.profile = clone(newer.profile);
    out.profile.onboarded = !!(a.profile.onboarded || b.profile.onboarded);
    out.profile.name = newer.profile.name || a.profile.name || b.profile.name || '';
    out.settingsAt = Math.max(a.settingsAt || 0, b.settingsAt || 0) || undefined;
    return out;
  }
  function snapshot() { return clone(data); }
  function replace(doc, opts) {
    data = merge(DEFAULTS, doc);
    settingsHash = JSON.stringify([data.settings, data.profile]);
    save(opts);
  }

  const pad = (n) => String(n).padStart(2, '0');
  function dayKey(d) {
    d = d ? new Date(d) : new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseDay(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(key, n) { const d = parseDay(key); d.setDate(d.getDate() + n); return dayKey(d); }

  function activeDays() { return new Set(data.log.map((s) => s.day)); }

  function streak() {
    const days = activeDays();
    let k = dayKey();
    if (!days.has(k)) k = addDays(k, -1);   // today not done yet doesn't break the streak
    let n = 0;
    while (days.has(k)) { n++; k = addDays(k, -1); }
    return n;
  }
  function bestStreak() {
    const days = [...activeDays()].sort();
    let best = 0, cur = 0, prev = null;
    for (const d of days) {
      cur = prev && addDays(prev, 1) === d ? cur + 1 : 1;
      best = Math.max(best, cur); prev = d;
    }
    return best;
  }
  function minutesByDay() {
    const m = {};
    for (const s of data.log) m[s.day] = (m[s.day] || 0) + s.sec / 60;
    return m;
  }
  function sessionsOn(day) { return data.log.filter((s) => s.day === (day || dayKey())); }
  function minutesOn(day) { return sessionsOn(day).reduce((a, s) => a + s.sec / 60, 0); }
  function totals() {
    const t = { sessions: data.log.length, minutes: 0, byCat: {} };
    for (const s of data.log) {
      t.minutes += s.sec / 60;
      t.byCat[s.cat] = t.byCat[s.cat] || { n: 0, min: 0 };
      t.byCat[s.cat].n++; t.byCat[s.cat].min += s.sec / 60;
    }
    return t;
  }

  function logSession(s) {
    const now = new Date();
    const e = {
      id: now.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
      at: now.toISOString(), day: dayKey(now),
      kind: s.kind, ref: s.ref || '', title: s.title, sec: Math.max(1, Math.round(s.sec)), cat: s.cat || s.kind
    };
    data.log.push(e);
    save();
    return e;
  }

  /** Returns true when the value is a new personal best. */
  function setPB(key, val, lowerIsBetter) {
    const cur = data.pbs[key];
    const better = !cur || (lowerIsBetter ? val < cur.v : val > cur.v);
    if (better) { data.pbs[key] = { v: val, at: dayKey() }; }
    (data.hist[key] = data.hist[key] || []).push({ v: val, day: dayKey(), at: new Date().toISOString() });
    save();
    return better;
  }
  function pb(key) { return data.pbs[key] ? data.pbs[key].v : null; }

  // Programs ------------------------------------------------------------------
  function program(id) { return data.programs[id] || null; }
  function joinProgram(id) {
    if (!data.programs[id]) data.programs[id] = { start: dayKey(), startAt: new Date().toISOString(), done: [], last: null };
    save();
    return data.programs[id];
  }
  function leaveProgram(id) { delete data.programs[id]; save(); }
  function completeProgramDay(id, dayNum) {
    const p = joinProgram(id);
    if (!p.done.includes(dayNum)) p.done.push(dayNum);
    p.last = dayKey(); p.lastAt = new Date().toISOString();
    save();
  }
  function nextProgramDay(id, total) {
    const p = program(id);
    if (!p) return 1;
    for (let d = 1; d <= total; d++) if (!p.done.includes(d)) return d;
    return null; // finished
  }

  function exportJSON() { return JSON.stringify(data, null, 2); }
  function importJSON(text) {
    const d = JSON.parse(text);
    if (!d || typeof d !== 'object' || !Array.isArray(d.log)) throw new Error('Not a Prana backup file');
    data = merge(DEFAULTS, d);
    save();
  }
  /** Erase everything on this device. `resetAt` makes synced devices drop older data too. */
  function reset() { data = clone(DEFAULTS); data.resetAt = Date.now(); save(); }

  window.Store = {
    get data() { return data; },
    save, onChange, mergeDocs, snapshot, replace, dayKey, parseDay, addDays, streak, bestStreak, minutesByDay, sessionsOn, minutesOn, totals,
    logSession, setPB, pb, program, joinProgram, leaveProgram, completeProgramDay, nextProgramDay,
    exportJSON, importJSON, reset
  };
})();
