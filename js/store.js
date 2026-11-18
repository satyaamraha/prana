/* Prana — local persistence (everything stays on this device). */
(function () {
  'use strict';
  const KEY = 'prana.v1';
  const DEFAULTS = {
    v: 1,
    profile: { name: '', onboarded: false, created: null },
    settings: {
      voice: true, sound: true, vibrate: true, ambient: true,
      goal: 10, voiceURI: '', theme: 'auto', reminder: '07:30'
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

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
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
    (data.hist[key] = data.hist[key] || []).push({ v: val, day: dayKey() });
    save();
    return better;
  }
  function pb(key) { return data.pbs[key] ? data.pbs[key].v : null; }

  // Programs ------------------------------------------------------------------
  function program(id) { return data.programs[id] || null; }
  function joinProgram(id) {
    if (!data.programs[id]) data.programs[id] = { start: dayKey(), done: [], last: null };
    save();
    return data.programs[id];
  }
  function leaveProgram(id) { delete data.programs[id]; save(); }
  function completeProgramDay(id, dayNum) {
    const p = joinProgram(id);
    if (!p.done.includes(dayNum)) p.done.push(dayNum);
    p.last = dayKey();
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
  function reset() { data = clone(DEFAULTS); save(); }

  window.Store = {
    get data() { return data; },
    save, dayKey, parseDay, addDays, streak, bestStreak, minutesByDay, sessionsOn, minutesOn, totals,
    logSession, setPB, pb, program, joinProgram, leaveProgram, completeProgramDay, nextProgramDay,
    exportJSON, importJSON, reset
  };
})();
