/* Prana — lifestyle counters (quit / abstain streaks), insights and rewards.
 * Everything is derived from a small event log (start, slips, urges, check-ins)
 * so it merges cleanly across devices and XP can't drift out of sync. */
(function () {
  'use strict';
  const DAY = 864e5, HOUR = 36e5;

  const PRESETS = [
    { id: 'nofap', name: 'No Fap', icon: 'shield', color: '#8a63f0', private: true, why: 'Build self-control and put that energy somewhere better.' },
    { id: 'noporn', name: 'No Porn', icon: 'eyeoff', color: '#e5484d', private: true, why: 'Rewire your attention and reclaim your time.' },
    { id: 'alcohol', name: 'No Alcohol', icon: 'glass', color: '#e08e0b', cost: 8, why: 'Sharper mornings, better sleep, more money.' },
    { id: 'smoking', name: 'No Smoking', icon: 'cig', color: '#7d7a93', cost: 10, why: 'Every smoke-free day is a gift to your lungs.' },
    { id: 'vaping', name: 'No Vaping', icon: 'cloud', color: '#5b8def', cost: 5, why: 'Break the nicotine loop.' },
    { id: 'weed', name: 'No Weed', icon: 'leaf', color: '#3c9d5d', cost: 6, why: 'Clearer head, real motivation.' },
    { id: 'sugar', name: 'No Sugar', icon: 'candy', color: '#e0559a', why: 'Steadier energy and fewer cravings.' },
    { id: 'junk', name: 'No Junk Food', icon: 'burger', color: '#ee5f38', cost: 6, why: 'Fuel your body with real food.' },
    { id: 'social', name: 'No Social Media', icon: 'phone', color: '#12a594', minutes: 120, why: 'Take your attention back.' },
    { id: 'gaming', name: 'No Gaming', icon: 'game', color: '#4776e6', minutes: 120, why: 'Trade screen time for real-life progress.' },
    { id: 'caffeine', name: 'No Caffeine', icon: 'coffee', color: '#8b5a3c', cost: 4, why: 'Natural energy and deeper sleep.' },
    { id: 'gambling', name: 'No Gambling', icon: 'coin', color: '#d4a017', cost: 15, why: 'Protect your money and your peace.' },
    { id: 'custom', name: 'Custom', icon: 'sparkle', color: '#12a594', why: '' }
  ];
  const ICONS = ['shield', 'eyeoff', 'glass', 'cig', 'cloud', 'leaf', 'candy', 'burger', 'phone', 'game', 'coffee', 'coin', 'sparkle', 'heart', 'flame', 'moon', 'bolt', 'target'];
  const COLORS = ['#8a63f0', '#e5484d', '#e08e0b', '#12a594', '#4776e6', '#ee5f38', '#e0559a', '#3c9d5d', '#d4a017', '#7d7a93'];
  const TRIGGERS = ['Boredom', 'Stress', 'Loneliness', 'Tired', 'Late night', 'Social media', 'Anxiety', 'Alcohol', 'Celebration', 'Habit', 'Other'];
  const MOODS = [['1', '😣', 'Rough'], ['2', '😕', 'Low'], ['3', '😐', 'Okay'], ['4', '🙂', 'Good'], ['5', '😄', 'Great']];
  const CHALLENGE_DAYS = [3, 7, 14, 30, 60, 90];

  /** Ranks a counter climbs as the streak grows. */
  const RANKS = [
    { d: 0, name: 'Day Zero', color: '#8e8aa8' },
    { d: 1, name: 'Spark', color: '#f5b041' },
    { d: 3, name: 'Kindling', color: '#f39c12' },
    { d: 7, name: 'Flame', color: '#e67e22' },
    { d: 14, name: 'Blaze', color: '#e5484d' },
    { d: 30, name: 'Iron Will', color: '#7f8c9a' },
    { d: 60, name: 'Steel Mind', color: '#5b7c99' },
    { d: 90, name: 'Golden', color: '#d4a017' },
    { d: 180, name: 'Diamond', color: '#3fb6d9' },
    { d: 365, name: 'Legend', color: '#8a63f0' },
    { d: 730, name: 'Mythic', color: '#c13584' }
  ];
  const MILESTONES = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 500, 730, 1000];
  const milestoneXP = (d) => Math.round(4 * Math.pow(d, 0.85)) * 5;
  const milestoneName = (d) => ({ 1: 'First Day', 3: 'Three Strong', 7: 'One Week', 14: 'Two Weeks', 21: 'Three Weeks', 30: 'One Month', 45: '45 Days', 60: 'Two Months', 90: 'Ninety Days', 120: 'Four Months', 180: 'Half a Year', 270: 'Nine Months', 365: 'One Year', 500: '500 Days', 730: 'Two Years', 1000: '1,000 Days' }[d] || d + ' days');

  const LEVEL_TITLES = [[1, 'Novice'], [3, 'Seeker'], [5, 'Apprentice'], [8, 'Disciplined'], [12, 'Warrior'], [16, 'Master'], [20, 'Sage'], [25, 'Yogi'], [30, 'Enlightened']];
  const levelStart = (L) => 50 * L * (L - 1);    // XP needed to reach level L (L2 = 100, L5 = 1000, L10 = 4500)

  const LINES = [
    'Urges are waves. They rise, peak and pass — usually within 15 minutes.',
    'You don’t have to quit forever today. Just today.',
    'Every clean hour is a vote for the person you’re becoming.',
    'Discipline is remembering what you want most, not what you want now.',
    'A slip is data, not a verdict. Learn the trigger, keep going.',
    'The craving is loudest right before it fades.',
    'Breathe out longer than you breathe in. Your body follows.',
    'You’ve survived every urge so far. This one too.',
    'Small streaks stack into a new identity.',
    'Boredom is a trigger. Have a plan: walk, call, breathe, move.',
    'Protect your mornings and your nights — that’s where habits live.',
    'Progress, not perfection. Your best streak proves you can.',
    'When in doubt, change your environment, not your willpower.',
    'Ten slow breaths can outlast a craving.',
    'Your future self is watching. Make them proud today.'
  ];

  // ---- data access -----------------------------------------------------------------
  const D = () => {
    const d = Store.data;
    d.habits = Object.assign({ counters: {}, checkins: {}, urges: [], seen: {} }, d.habits || {});
    const h = d.habits;
    h.counters = h.counters || {}; h.checkins = h.checkins || {}; h.urges = h.urges || []; h.seen = h.seen || {};
    return h;
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const save = () => Store.save();
  const list = () => Object.values(D().counters).filter((c) => !c.deleted).sort((a, b) => a.createdAt - b.createdAt);
  const get = (id) => { const c = D().counters[id]; return c && !c.deleted ? c : null; };
  const preset = (id) => PRESETS.find((p) => p.id === id) || PRESETS[PRESETS.length - 1];

  function add(o) {
    const now = Date.now();
    const c = {
      id: uid(), preset: o.preset || 'custom', name: (o.name || preset(o.preset).name).trim().slice(0, 40), icon: o.icon || preset(o.preset).icon, color: o.color || preset(o.preset).color,
      createdAt: now, startAt: Math.min(now, o.startAt || now), resets: [], challenges: [],
      cost: Math.max(0, +o.cost || 0), minutes: Math.max(0, +o.minutes || 0), currency: o.currency || '',
      private: !!o.private, why: (o.why || '').slice(0, 140), updatedAt: now
    };
    if (o.challengeDays) c.challenges.push({ id: uid(), days: +o.challengeDays, startAt: now });
    D().counters[c.id] = c; save();
    return c;
  }
  function update(id, patch) {
    const c = get(id); if (!c) return null;
    for (const k of ['name', 'icon', 'color', 'cost', 'minutes', 'currency', 'private', 'why', 'startAt']) if (patch[k] !== undefined) c[k] = patch[k];
    if (patch.startAt) c.startAt = Math.min(Date.now(), patch.startAt);
    c.updatedAt = Date.now(); save();
    return c;
  }
  function remove(id) { const c = D().counters[id]; if (!c) return; c.deleted = true; c.updatedAt = Date.now(); save(); }

  /** Log a slip: the streak restarts from that moment. */
  function slip(id, o = {}) {
    const c = get(id); if (!c) return null;
    const at = Math.min(Date.now(), Math.max(c.startAt + 1000, o.at || Date.now()));
    const before = stats(c);
    c.resets.push({ at, trigger: o.trigger || '', note: (o.note || '').slice(0, 280) });
    c.resets.sort((a, b) => a.at - b.at);
    c.updatedAt = Date.now(); save();
    return { lost: before.currentDays, best: before.bestDays };
  }
  function urge(id, o = {}) { D().urges.push(Object.assign({ id: uid(), c: id || '', at: Date.now() }, o.sos ? { sos: 1 } : {})); save(); }
  function checkin(mood) { D().checkins[Store.dayKey()] = { mood: +mood, at: Date.now() }; save(); }
  const checkedInToday = () => !!D().checkins[Store.dayKey()];
  function checkinStreak() {
    const ci = D().checkins; let k = Store.dayKey(), n = 0;
    if (!ci[k]) k = Store.addDays(k, -1);
    while (ci[k]) { n++; k = Store.addDays(k, -1); }
    return n;
  }
  function startChallenge(id, days) {
    const c = get(id); if (!c) return;
    const act = activeChallenge(c); if (act) act.quitAt = Date.now();
    c.challenges.push({ id: uid(), days: +days, startAt: Date.now() });
    c.updatedAt = Date.now(); save();
  }
  function quitChallenge(id) {
    const c = get(id); const act = c && activeChallenge(c); if (!act) return;
    act.quitAt = Date.now(); c.updatedAt = Date.now(); save();
  }

  // ---- streak maths ----------------------------------------------------------------
  const validResets = (c) => c.resets.filter((r) => r.at > c.startAt).sort((a, b) => a.at - b.at);
  /** Each attempt = time between slips (the last one runs until now). */
  function attempts(c, now = Date.now()) {
    const marks = [c.startAt].concat(validResets(c).map((r) => r.at));
    return marks.map((from, i) => ({ from, to: i + 1 < marks.length ? marks[i + 1] : now, current: i === marks.length - 1 }));
  }
  function current(c, now = Date.now()) {
    const r = validResets(c), start = r.length ? r[r.length - 1].at : c.startAt;
    const ms = Math.max(0, now - start);
    return { start, ms, days: Math.floor(ms / DAY) };
  }
  function rankFor(days) {
    let i = 0; while (i + 1 < RANKS.length && days >= RANKS[i + 1].d) i++;
    const r = RANKS[i], nx = RANKS[i + 1] || null;
    return { rank: r, index: i, next: nx, progress: nx ? (days - r.d) / (nx.d - r.d) : 1 };
  }
  const nextMilestone = (days) => MILESTONES.find((m) => m > days) || null;

  function stats(c, now = Date.now()) {
    const at = attempts(c, now), cur = current(c, now);
    const lens = at.map((a) => a.to - a.from);
    const best = Math.max(...lens);
    const prevBest = lens.length > 1 ? Math.max(...lens.slice(0, -1)) : 0;
    const totalDays = Math.max(1, Math.floor((now - new Date(c.startAt).setHours(0, 0, 0, 0)) / DAY) + 1);
    const slipDays = new Set(validResets(c).map((r) => Store.dayKey(r.at))).size;
    const cleanDays = Math.max(0, totalDays - slipDays);
    const doneLens = lens.slice(0, -1);
    return {
      currentMs: cur.ms, currentDays: cur.days, start: cur.start,
      bestMs: best, bestDays: Math.floor(best / DAY), prevBestDays: Math.floor(prevBest / DAY),
      attempts: at.length, slips: at.length - 1,
      avgDays: doneLens.length ? doneLens.reduce((a, b) => a + b, 0) / doneLens.length / DAY : cur.ms / DAY,
      totalDays, cleanDays, successRate: cleanDays / totalDays,
      saved: c.cost ? c.cost * Math.floor(sumClean(c, now) / DAY) : 0,
      hoursBack: c.minutes ? (c.minutes * sumClean(c, now) / DAY) / 60 : 0,
      urges: D().urges.filter((u) => u.c === c.id).length,
      isBest: lens.length > 1 && cur.ms >= best && cur.ms > 0
    };
  }
  const sumClean = (c, now) => attempts(c, now).reduce((a, x) => a + (x.to - x.from), 0);

  function challengeStatus(c, ch, now = Date.now()) {
    const end = ch.startAt + ch.days * DAY;
    const slipAt = (validResets(c).find((r) => r.at > ch.startAt && r.at < end) || {}).at;
    if (ch.quitAt && ch.quitAt < end && (!slipAt || ch.quitAt < slipAt)) return { status: 'quit', end };
    if (slipAt) return { status: 'failed', end, at: slipAt };
    if (now >= end) return { status: 'won', end };
    return { status: 'active', end, progress: (now - ch.startAt) / (end - ch.startAt) };
  }
  const activeChallenge = (c, now) => (c.challenges || []).find((ch) => challengeStatus(c, ch, now).status === 'active') || null;
  const challengeXP = (days) => days * 25 + 50;

  /** Patterns in slips, urges and moods. Returns plain-language lines plus chart data. */
  function insights(c, now = Date.now()) {
    const rs = validResets(c), st = stats(c, now);
    const wd = [0, 0, 0, 0, 0, 0, 0], parts = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 }, trig = {};
    for (const r of rs) {
      const d = new Date(r.at), h = d.getHours();
      wd[d.getDay()]++;
      parts[h >= 5 && h < 12 ? 'Morning' : h >= 12 && h < 17 ? 'Afternoon' : h >= 17 && h < 21 ? 'Evening' : 'Night']++;
      if (r.trigger) trig[r.trigger] = (trig[r.trigger] || 0) + 1;
    }
    const lines = [];
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (rs.length >= 3) {
      const maxD = wd.indexOf(Math.max(...wd));
      const part = Object.entries(parts).sort((a, b) => b[1] - a[1])[0];
      if (wd[maxD] >= 2) lines.push({ icon: 'calendar', text: `Most slips happen on <b>${DAYS[maxD]}s</b> — plan something for that day.` });
      if (part[1] >= 2) lines.push({ icon: 'clock', text: `Your riskiest time is the <b>${part[0].toLowerCase()}</b> (${Math.round(100 * part[1] / rs.length)}% of slips).` });
      const top = Object.entries(trig).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 2) lines.push({ icon: 'target', text: `Top trigger: <b>${top[0]}</b>. Have a go-to replacement ready.` });
    }
    const lens = attempts(c, now).map((a) => (a.to - a.from) / DAY);
    const done = lens.slice(0, -1);              // finished streaks only — today's fresh start isn't a trend
    if (done.length >= 4) {
      const recent = done.slice(-2), older = done.slice(-5, -2);
      const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      if (older.length && avg(older) > 0) {
        const ch = (avg(recent) - avg(older)) / avg(older);
        if (ch > 0.15) lines.push({ icon: 'chart', text: `Your streaks are getting longer — <b>+${Math.round(ch * 100)}%</b> vs. before.` });
        else if (ch < -0.15) lines.push({ icon: 'chart', text: 'Recent streaks are shorter than before. Look at what changed — sleep, stress, routine?' });
      }
    }
    if (st.isBest && st.currentDays >= 1) lines.push({ icon: 'trophy', text: 'You’re on your <b>best streak ever</b>. Every minute now is a new record.' });
    else if (st.bestDays > st.currentDays && st.currentDays > 0) lines.push({ icon: 'flame', text: `<b>${st.bestDays - st.currentDays} more days</b> to beat your record of ${st.bestDays}.` });
    const wk = D().urges.filter((u) => u.c === c.id && u.at > now - 7 * DAY).length;
    if (wk) lines.push({ icon: 'shield', text: `You fought off <b>${wk} urge${wk > 1 ? 's' : ''}</b> this week. That’s the muscle growing.` });
    if (st.saved >= 1) lines.push({ icon: 'coin', text: `You’ve kept about <b>${money(st.saved, c.currency)}</b> in your pocket.` });
    if (st.hoursBack >= 1) lines.push({ icon: 'clock', text: `About <b>${Math.round(st.hoursBack)} hours</b> reclaimed for things that matter.` });
    return { lines, weekday: wd, parts, triggers: trig, history: lens.slice(-12), slips: rs.length };
  }

  const CUR = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$' };
  function defaultCurrency() {
    const l = (navigator.language || 'en-US').toUpperCase();
    if (/-IN$/.test(l)) return 'INR'; if (/-GB$/.test(l)) return 'GBP'; if (/-AU$/.test(l)) return 'AUD'; if (/-CA$/.test(l)) return 'CAD';
    if (/-JP$/.test(l) || /^JA/.test(l)) return 'JPY'; if (/-(DE|FR|ES|IT|NL|IE|PT|AT|BE|FI)$/.test(l)) return 'EUR';
    return 'USD';
  }
  function money(v, cur) {
    cur = cur || defaultCurrency();
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v); }
    catch (e) { return (CUR[cur] || '') + Math.round(v); }
  }

  // ---- rewards -----------------------------------------------------------------------
  function achievements(now = Date.now()) {
    const cs = list(), h = D();
    const S = cs.map((c) => ({ c, s: stats(c, now) }));
    const best = Math.max(0, ...S.map((x) => x.s.bestDays));
    const urges = h.urges.length;
    const won = cs.reduce((a, c) => a + (c.challenges || []).filter((ch) => challengeStatus(c, ch, now).status === 'won').length, 0);
    const phoenix = S.some((x) => x.s.slips > 0 && x.s.isBest && x.s.currentDays >= 1);
    const triple = S.filter((x) => x.s.currentDays >= 7).length >= 3;
    const ciStreak = Math.max(checkinStreak(), bestCheckinStreak());
    const sos = h.urges.filter((u) => u.sos).length;
    const A = [
      ['first', 'First Step', 'Start your first counter', 'sparkle', 25, cs.length >= 1],
      ['wave', 'Wave Rider', 'Resist your first urge', 'shield', 25, urges >= 1],
      ['surfer', 'Urge Surfer', 'Resist 10 urges', 'shield', 100, urges >= 10],
      ['unshake', 'Unshakeable', 'Resist 50 urges', 'shield', 400, urges >= 50],
      ['breathe', 'Breathe Through It', 'Use a breathing exercise to beat 5 urges', 'wind', 150, sos >= 5],
      ['week', 'One Week Strong', 'Reach 7 days on any counter', 'flame', 100, best >= 7],
      ['month', 'Monk Mode', 'Reach 30 days on any counter', 'lotus', 300, best >= 30],
      ['reboot', 'Rebooted', 'Reach 90 days on any counter', 'bolt', 800, best >= 90],
      ['legend', 'Living Legend', 'Reach 365 days on any counter', 'trophy', 3000, best >= 365],
      ['phoenix', 'Phoenix', 'Come back after a slip and beat your best', 'flame', 200, phoenix],
      ['promise', 'Promise Kept', 'Complete a challenge', 'check', 100, won >= 1],
      ['iron', 'Iron Promise', 'Complete 5 challenges', 'target', 400, won >= 5],
      ['triple', 'Triple Threat', 'Hold 3 counters at 7+ days at once', 'stairs', 300, triple],
      ['devoted', 'Daily Devotion', 'Check in 7 days in a row', 'calendar', 100, ciStreak >= 7],
      ['ritual', 'Ritual', 'Check in 30 days in a row', 'calendar', 400, ciStreak >= 30]
    ];
    return A.map(([id, name, desc, icon, xp, got]) => ({ id, name, desc, icon, xp, got: !!got }));
  }
  function bestCheckinStreak() {
    const days = Object.keys(D().checkins).sort();
    let best = 0, cur = 0, prev = null;
    for (const d of days) { cur = prev && Store.addDays(prev, 1) === d ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
    return best;
  }

  /** XP is recomputed from history every time — practice, clean days, milestones, challenges, urges, check-ins, badges. */
  function xpInfo(now = Date.now()) {
    const parts = { practice: 0, clean: 0, milestones: 0, challenges: 0, urges: 0, checkins: 0, badges: 0 };
    parts.practice = Math.round(Store.data.log.reduce((a, s) => a + s.sec, 0) / 60 * 2);
    for (const c of list()) {
      const s = stats(c, now);
      parts.clean += Math.floor(sumClean(c, now) / DAY) * 10;
      for (const m of MILESTONES) if (s.bestDays >= m) parts.milestones += milestoneXP(m);
      for (const ch of c.challenges || []) if (challengeStatus(c, ch, now).status === 'won') parts.challenges += challengeXP(ch.days);
    }
    const perDay = {};
    for (const u of D().urges) { const k = Store.dayKey(u.at); perDay[k] = (perDay[k] || 0) + 1; }
    parts.urges = Object.values(perDay).reduce((a, n) => a + Math.min(5, n) * 15, 0);
    parts.checkins = Object.keys(D().checkins).length * 5;
    parts.badges = achievements(now).filter((a) => a.got).reduce((a, x) => a + x.xp, 0);
    const total = Object.values(parts).reduce((a, b) => a + b, 0);
    let L = 1; while (levelStart(L + 1) <= total) L++;
    const title = LEVEL_TITLES.filter(([l]) => L >= l).pop()[1];
    const into = total - levelStart(L), need = levelStart(L + 1) - levelStart(L);
    return { total, parts, level: L, title, into, need, pct: into / need };
  }

  /** New things to celebrate since last time (milestones in the current streak, badges, levels, challenges). */
  function pending(now = Date.now()) {
    const seen = D().seen, out = [];
    for (const c of list()) {
      const s = stats(c, now);
      for (const m of MILESTONES) {
        if (s.currentDays < m) break;
        const key = `m:${c.id}:${s.start}:${m}`;
        if (!seen[key]) out.push({ key, type: 'milestone', weight: 1000 + m, c, days: m, title: milestoneName(m), xp: s.bestDays >= m && s.prevBestDays >= m ? 0 : milestoneXP(m), rank: rankFor(m).rank });
      }
      for (const ch of c.challenges || []) {
        const key = `c:${ch.id}`;
        if (!seen[key] && challengeStatus(c, ch, now).status === 'won') out.push({ key, type: 'challenge', weight: 900 + ch.days, c, days: ch.days, title: `${ch.days}-day challenge complete`, xp: challengeXP(ch.days) });
      }
    }
    for (const a of achievements(now)) if (a.got && !seen['a:' + a.id]) out.push({ key: 'a:' + a.id, type: 'badge', weight: a.xp / 10, title: a.name, desc: a.desc, icon: a.icon, xp: a.xp });
    const lv = xpInfo(now).level;
    if (lv > 1 && !seen['l:' + lv]) out.push({ key: 'l:' + lv, type: 'level', weight: 500 + lv, title: `Level ${lv}`, level: lv, levelTitle: xpInfo(now).title, xp: 0, quiet: true });
    for (let l = 2; l < lv; l++) if (!seen['l:' + l]) out.push({ key: 'l:' + l, type: 'level', weight: 0, quiet: true, hidden: true });
    return out.sort((a, b) => b.weight - a.weight);
  }
  function markSeen(keys) { const s = D().seen; let ch = false; for (const k of keys) if (!s[k]) { s[k] = 1; ch = true; } if (ch) save(); }

  const lineOfDay = (offset = 0) => { const d = new Date(); const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / DAY) + offset; return LINES[((n % LINES.length) + LINES.length) % LINES.length]; };

  // ---- sync merge -----------------------------------------------------------------------
  /** Merge two habit stores: union events, newest settings win, tombstones delete. */
  function merge(A, B, cutoff) {
    A = A || {}; B = B || {};
    const ok = (t) => !cutoff || t > cutoff;
    const out = { counters: {}, checkins: {}, urges: [], seen: Object.assign({}, B.seen || {}, A.seen || {}) };
    const ca = A.counters || {}, cb = B.counters || {};
    for (const id of new Set(Object.keys(ca).concat(Object.keys(cb)))) {
      const a = ca[id], b = cb[id];
      const base = !a ? b : !b ? a : ((b.updatedAt || 0) > (a.updatedAt || 0) ? b : a);
      if (!ok(base.createdAt)) continue;
      const c = JSON.parse(JSON.stringify(base));
      const rs = new Map();
      for (const r of ((a && a.resets) || []).concat((b && b.resets) || [])) if (ok(r.at)) rs.set(String(r.at), Object.assign({}, rs.get(String(r.at)) || {}, r));
      c.resets = [...rs.values()].sort((x, y) => x.at - y.at);
      const chs = new Map();
      for (const ch of ((a && a.challenges) || []).concat((b && b.challenges) || [])) {
        const prev = chs.get(ch.id);
        chs.set(ch.id, prev ? Object.assign({}, prev, ch, { quitAt: Math.min(prev.quitAt || Infinity, ch.quitAt || Infinity) === Infinity ? undefined : Math.min(prev.quitAt || Infinity, ch.quitAt || Infinity) }) : Object.assign({}, ch));
      }
      c.challenges = [...chs.values()].sort((x, y) => x.startAt - y.startAt);
      out.counters[id] = c;
    }
    for (const src of [B.checkins || {}, A.checkins || {}]) for (const [k, v] of Object.entries(src)) if (ok(v.at) && (!out.checkins[k] || v.at > out.checkins[k].at)) out.checkins[k] = v;
    const us = new Map();
    for (const u of (A.urges || []).concat(B.urges || [])) if (ok(u.at)) us.set(u.id, u);
    out.urges = [...us.values()].sort((x, y) => x.at - y.at);
    return out;
  }

  window.Habits = {
    DAY, HOUR, PRESETS, ICONS, COLORS, TRIGGERS, MOODS, CHALLENGE_DAYS, RANKS, MILESTONES, CUR,
    list, get, preset, add, update, remove, slip, urge, checkin, checkedInToday, checkinStreak, startChallenge, quitChallenge,
    attempts, current, rankFor, nextMilestone, milestoneName, milestoneXP, stats, insights, challengeStatus, activeChallenge, challengeXP,
    achievements, xpInfo, pending, markSeen, lineOfDay, money, defaultCurrency, merge,
    get data() { return D(); }
  };
})();
