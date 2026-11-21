/* Prana — app shell, router and screens. */
(function () {
  'use strict';
  const { ICON, esc, $, $$, fmt, fmtMin, toast } = UI;
  const view = $('#view');
  const S = () => Store.data.settings;

  // ---------------------------------------------------------------------------
  // Install (PWA)
  // ---------------------------------------------------------------------------
  // Running inside the Android app (Trusted Web Activity)? Its start URL carries ?source=twa.
  const IN_TWA = (() => {
    try {
      if (/[?&]source=twa\b/.test(location.search) || document.referrer.indexOf('android-app://com.retrogradearc.prana') === 0) sessionStorage.setItem('prana.twa', '1');
      return sessionStorage.getItem('prana.twa') === '1';
    } catch (e) { return false; }
  })();
  const APK_URL = 'https://github.com/satyaamraha/prana/releases/latest/download/prana.apk';
  const SHARE_URL = 'https://prana.retrogradearc.com/';
  async function sharePrana() {
    const data = { title: 'Prana', text: 'Prana — breathing, workouts, yoga, meditation and habit tracking. Free, no ads.', url: SHARE_URL };
    try {
      if (navigator.share) { await navigator.share(data); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${data.text} ${data.url}`); toast('Link copied — paste it anywhere'); }
    catch (e) { prompt('Copy this link to share Prana:', data.url); }
  }

  const PWA = (() => {
    let deferred = null;
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); deferred = e;
      if (current && !Play.active && (current.tab === 'today' || current.title === 'Settings')) render(true);
    });
    window.addEventListener('appinstalled', () => {
      deferred = null; toast('Prana is installed — find it on your home screen');
      if (!Play.active) render(true);
    });
    function iosGuide() {
      const sheet = UI.h(`
        <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="iosTitle">
          <div class="sheet">
            <div class="row between"><h2 id="iosTitle" style="font-size:20px">Install Prana</h2><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
            <p class="muted small" style="margin-top:4px">Add Prana to your home screen to use it like an app: full screen, offline, one tap away.</p>
            <ol class="list-steps" style="margin-top:12px">
              <li>Open this page in <b>Safari</b>.</li>
              <li>Tap the <b>Share</b> button <span class="share-glyph" aria-hidden="true">${ICON.upload}</span> in the toolbar.</li>
              <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
              <li>Tap <b>Add</b>. Prana appears on your home screen.</li>
            </ol>
            <button class="btn btn-primary btn-block" data-close style="margin-top:14px">Got it</button>
          </div>
        </div>`);
      sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.remove(); });
      document.body.appendChild(sheet);
      $('[data-close]', sheet).focus();
    }
    return {
      standalone,
      canInstall: () => !standalone() && (!!deferred || ios),
      async install() {
        if (deferred) {
          const d = deferred; deferred = null;
          d.prompt();
          try { await d.userChoice; } catch (e) { /* dismissed */ }
          if (!Play.active) render(true);
        } else if (ios) iosGuide();
        else toast('Use your browser menu → “Install app” or “Add to Home screen”');
      }
    };
  })();

  function installCard() {
    if (!PWA.canInstall() || Store.data.settings.hideInstall) return '';
    return `<div class="card install-card" style="margin-top:12px">
      <div class="row" style="align-items:flex-start;gap:14px">
        <img src="icons/icon-192.png" alt="" width="52" height="52" style="border-radius:14px;flex:none">
        <div style="flex:1;min-width:0">
          <h3 style="font-size:16px">Install Prana</h3>
          <p class="small muted">Add it to your home screen: full screen, works offline, and keeps your streak one tap away.</p>
          <div class="row" style="margin-top:12px;gap:8px">
            <button class="btn btn-sm btn-primary" data-install>${ICON.download} Install</button>
            <button class="btn btn-sm btn-ghost" data-install-hide style="color:var(--muted)">Not now</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  // UI state that survives navigation
  const st = { breatheTab: 'ex', breatheCat: 'all', moveTab: 'workouts', yogaTab: 'flows', yogaCat: 'All', exSecs: 45, timerMin: 10, timerBell: 0, poseSecs: null };

  // ---------------------------------------------------------------------------
  // Shared bits
  // ---------------------------------------------------------------------------
  const CAT_ICON = { calm: 'leaf', focus: 'target', energy: 'bolt', sleep: 'bed', balance: 'heart' };
  const CAT_NAME = { calm: 'Calm', focus: 'Focus', energy: 'Energy', sleep: 'Sleep', balance: 'Balance' };
  const start = (desc) => `data-start='${esc(JSON.stringify(desc))}'`;
  const restLabel = (v) => (+v ? v + 's' : 'None');
  /** Remembered rest/timing preferences (synced with the account). */
  function PF() {
    const s = S();
    s.prefs = Object.assign({ wk: {}, breathRest: {}, flowPause: 5, suryaRest: 15, suryaPace: 5, exSets: 3, exRest: 30 }, s.prefs || {});
    s.prefs.wk = s.prefs.wk || {}; s.prefs.breathRest = s.prefs.breathRest || {};
    return s.prefs;
  }
  function setPref(path, val) {
    const keys = path.split('.');
    let o = PF();
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]] = o[keys[i]] || {};
    o[keys[keys.length - 1]] = val;
    Store.save();
  }

  function sCard(o) {
    const tag = o.href ? 'a' : 'button';
    const attrs = o.href ? `href="${o.href}"` : (o.start ? start(o.start) : '');
    const icon = o.fig ? `<div class="s-icon fig" data-fig="${esc(o.fig)}"></div>` : `<div class="s-icon">${ICON[o.icon] || ICON.wind}</div>`;
    return `<${tag} class="s-card ${o.done ? 'is-done' : ''}" ${attrs} style="${o.accent ? '--accent:' + o.accent : ''};${tag === 'button' ? 'width:100%;border:0;text-align:left' : ''}">
      ${icon}
      <div style="flex:1;min-width:0">
        <h3>${esc(o.title)}</h3>
        ${o.sub ? `<div class="s-sub">${esc(o.sub)}</div>` : ''}
        ${o.meta && o.meta.length ? `<div class="s-meta">${o.meta.map((m) => `<span class="pill ${m.accent ? 'accent' : ''}">${m.icon ? ICON[m.icon] : ''}${esc(m.t)}</span>`).join('')}</div>` : ''}
      </div>
      ${o.done ? `<span class="done-mark">${ICON.check}</span>` : `<span class="chev">${ICON.chev}</span>`}
    </${tag}>`;
  }
  const section = (title, right) => `<div class="section"><h2>${esc(title)}</h2>${right || ''}</div>`;
  const picker = (name, opts, cur, label) => `<div class="picker" data-picker="${name}">${opts.map((v) => `<button type="button" data-v="${v}" class="${String(v) === String(cur) ? 'active' : ''}">${label ? label(v) : v}</button>`).join('')}</div>`;
  const listSteps = (arr) => `<ol class="list-steps">${arr.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
  const listDots = (arr) => `<ul class="list-dots">${arr.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
  const caution = (t) => t ? `<div class="caution" style="margin-top:14px">${ICON.alert}<div>${esc(t)}</div></div>` : '';
  const patternText = (b) => b.phases ? b.phases.map((p) => p[1]).join(' · ') : b.stages ? '4·4 → 4·8' : b.mode === 'power' ? '30 breaths + hold' : `${b.pumps} pumps × ${b.rounds}`;

  // Live demo figures on the current page (they follow the camera / speed controls).
  let liveFigs = [], liveGroups = [];
  const SPEEDS = [1, 0.5, 0.25];
  const speedLabel = (v) => ({ 1: '1×', 0.5: '½×', 0.25: '¼×' }[v] || v + '×');
  const framesOf = (list) => list.map(([n, hh, t, label]) => ({ pose: Poses.get(n), h: hh, t, label }));

  /** Demo stage: two large, labelled camera angles side by side (or one, if turned off), speed button and step caption. */
  function stage(figSpec, opts = {}) {
    const two = S().pip !== false;
    return `<div class="detail-stage duo ${two ? '' : 'solo'}">
      ${opts.speed ? `<div class="stage-ui"><span></span><button type="button" class="speed-btn" data-speed aria-label="Playback speed">${speedLabel(st.speed || 1)}</button></div>` : ''}
      <div class="duo-grid">
        <div class="duo-pane"><div class="fig-host" data-fig="${figSpec}" data-live="1"></div><span class="duo-lbl" data-duo-lbl="0"></span></div>
        ${two ? '<div class="duo-pane"><div class="fig-host" data-duo2></div><span class="duo-lbl" data-duo-lbl="1"></span></div>' : ''}
      </div>
      ${opts.cap ? '<div class="stage-cap" data-cap></div>' : ''}
    </div>`;
  }

  /** First pose of a demo — decides which two angles read best. */
  function firstPoseOf(type, id) {
    if (type === 'ex') return Poses.get(Content.EX[id].frames[0][0]);
    if (type === 'yogalive') { const y = Content.yoga(id); return y.flowFrames ? null : Poses.get(y.pose); }
    return null;   // flows (Sun Salutation, cat-cow) mix standing and floor poses → side + 3/4
  }

  /** One live figure of a demo. */
  function liveFigure(elm, type, id, o) {
    const common = { view: o.view, fit: o.fit || 'fixed', boxW: o.boxW, speed: st.speed || 1, onPhase: o.onPhase || null };
    if (type === 'ex') {
      const e = Content.EX[id];
      const f = new Figure(elm, Object.assign({ anchor: e.anchor || 'hip', prop: e.prop || null, label: e.name + ' demonstration', hl: e.hl }, common));
      return f.loop(framesOf(e.frames));
    }
    if (type === 'yogalive') {
      const y = Content.yoga(id);
      const f = new Figure(elm, Object.assign({ label: y.name, mat: true }, common));
      if (y.flowFrames) f.loop(framesOf(y.flowFrames.map((x, i) => [x[0], x[1], x[2], ['Cow — inhale', 'Cat — exhale'][i]])), { anchor: 'rhand' });
      else f.show(Poses.get(y.pose), { dur: 0 });
      return f;
    }
    if (type === 'surya') {
      const f = new Figure(elm, Object.assign({ label: 'Sun Salutation demonstration', mat: true }, common, { speed: 1 }));
      return f.show(Poses.get(Content.suryaSteps('R')[0].pose), { dur: 0 });
    }
    return null;
  }

  function mountFigures(root) {
    liveFigs = []; liveGroups = [];
    $$('[data-fig]', root).forEach((elm) => {
      const spec = elm.dataset.fig;
      const [type, id] = spec.split(':');
      const live = elm.dataset.live != null;
      try {
        if (live && (type === 'ex' || type === 'yogalive' || type === 'surya')) {
          const stageEl = elm.closest('.detail-stage');
          const capEl = $('[data-cap]', stageEl);
          const onPhase = capEl ? (i, label) => { capEl.textContent = label || ''; } : null;
          const first = firstPoseOf(type, id);
          const pair = first ? Figure.pairFor(first) : ['side', 'q'];
          const host2 = $('[data-duo2]', stageEl);
          // floor moves (plank, push-up…) stack the views as full-width rows; standing moves sit side by side
          // (only on narrow screens; Sun Salutation mixes standing and floor poses, so it stays side by side)
          const rows = !!host2 && pair[1] === 'q' && type !== 'surya' && (stageEl.clientWidth || innerWidth) < 560;
          stageEl.classList.toggle('rows', rows);
          const boxW = host2 && !rows ? 118 : undefined;
          const fit = rows ? 'tight' : 'fixed';
          const figs = [liveFigure(elm, type, id, { view: pair[0], boxW, fit, onPhase })];
          if (host2) figs.push(liveFigure(host2, type, id, { view: pair[1], boxW, fit }));
          figs.forEach((f, k) => { const l = $(`[data-duo-lbl="${k}"]`, stageEl); if (l) l.textContent = Figure.PAIR_LABEL[pair[k]]; });
          Figure.shareScale(figs);
          liveGroups.push({ figs, stage: stageEl });
          liveFigs.push(...figs);
          if (type === 'surya') {
            const steps = Content.suryaSteps('R');
            let k = 0;
            const iv = setInterval(() => {
              if (!elm.isConnected) { clearInterval(iv); return; }
              k = (k + 1) % steps.length;
              const s = steps[k];
              for (const f of figs) f.show(Poses.get(s.pose), { dur: k === 0 ? 0 : 1.2, anchor: s.anchor });
              const cap = $('[data-surya-cap]');
              if (cap) cap.innerHTML = `<b>${k + 1}. ${esc(s.name)}</b> · ${esc(s.breath)}`;
            }, 2200);
          }
        } else if (type === 'ex') {
          const e = Content.EX[id];
          const f = new Figure(elm, { anchor: e.anchor || 'hip', prop: e.prop || null, label: e.name + ' demonstration', hl: e.hl });
          f.loop(framesOf(e.frames));
        } else if (type === 'exstill') {
          const e = Content.EX[id];
          const fr = e.frames[e.frames.length > 1 ? 1 : 0];
          Figure.still(elm, Poses.get(fr[0]), { prop: e.prop || null, anchor: e.anchor || 'hip', hl: e.hl });
        } else if (type === 'pose') {
          Figure.still(elm, Poses.get(id));
        } else if (type === 'yoga') {
          const y = Content.yoga(id);
          Figure.still(elm, Poses.get(y.flowFrames ? y.flowFrames[0][0] : y.pose));
        }
      } catch (err) { console.error('figure', spec, err); }
    });
  }

  function isDoneToday(desc) {
    const ref = desc.id || (desc.custom && desc.custom.name);
    return Store.sessionsOn().some((s) => s.ref === ref);
  }

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------
  function onboarding() {
    return {
      tab: null, title: 'Welcome',
      html: `
      <div class="onboard">
        <div class="orb-demo"></div>
        <div style="text-align:center">
          <div class="eyebrow">Welcome to Prana</div>
          <h1 style="font-size:30px;margin-top:6px">Breathe. Move. Be still.</h1>
          <p class="muted" style="margin-top:8px">A few minutes a day of breathing, movement and meditation — built into a habit you can keep.</p>
        </div>
        <div class="card" style="margin-top:24px">
          <div class="field"><label for="obName">Your name <span class="hint">(optional)</span></label><input class="input" id="obName" autocomplete="given-name" style="max-width:180px"></div>
          <div style="padding-top:14px"><label style="font-weight:600">Daily goal</label>
            <p class="small muted" style="margin:2px 0 10px">Minutes of practice per day. Small and consistent beats big and rare.</p>
            ${picker('obGoal', [5, 10, 15, 20, 30], 10, (v) => v + ' min')}
          </div>
        </div>
        <label class="caution" style="margin-top:14px;cursor:pointer">
          <input type="checkbox" id="obAck" style="margin-top:3px">
          <div>I understand Prana is not medical advice. I’ll consult a doctor if I have health conditions or am pregnant, and I will never do breath-holding exercises in water, while driving, or standing.</div>
        </label>
        <button class="btn btn-primary btn-block" id="obGo" style="margin-top:18px;height:54px" disabled>Begin my practice</button>
        ${Sync.enabled ? '<p class="small muted" style="text-align:center;margin-top:16px">Already use Prana on another device? <a href="#/account" style="color:var(--breathe);font-weight:700">Sign in</a></p>' : ''}
      </div>`,
      after(root) {
        let goal = 10;
        root.addEventListener('click', (e) => { const b = e.target.closest('[data-picker="obGoal"] button'); if (b) goal = +b.dataset.v; });
        $('#obAck', root).addEventListener('change', (e) => { $('#obGo', root).disabled = !e.target.checked; });
        $('#obGo', root).addEventListener('click', () => {
          const d = Store.data;
          d.profile.name = $('#obName', root).value.trim().slice(0, 40);
          d.profile.onboarded = true; d.profile.created = new Date().toISOString();
          d.settings.goal = goal; Store.save();
          location.hash = '#/'; render();
        });
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Today
  // ---------------------------------------------------------------------------
  function today() {
    if (!Store.data.profile.onboarded) return onboarding();
    const now = new Date(), hr = now.getHours();
    const greet = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const name = Store.data.profile.name;
    const goal = S().goal, mins = Store.minutesOn();
    const pct = Math.min(100, (mins / goal) * 100);
    const streak = Store.streak();
    const byDay = Store.minutesByDay();
    const todayK = Store.dayKey();
    let week = '';
    for (let i = 6; i >= 0; i--) {
      const k = Store.addDays(todayK, -i), d = Store.parseDay(k);
      const hit = (byDay[k] || 0) > 0, met = (byDay[k] || 0) >= goal;
      week += `<div><div class="d">${'SMTWTFS'[d.getDay()]}</div><div class="dot ${hit ? 'hit' : ''} ${i === 0 ? 'today' : ''}">${met ? ICON.check : d.getDate()}</div></div>`;
    }
    const plan = Content.todayPlan(now);
    const doneCount = plan.filter((p) => isDoneToday(p.desc)).length;
    const planHtml = plan.map((p) => {
      const d = Play.describe(p.desc);
      return sCard({ start: p.desc, title: d.title, sub: d.sub, icon: d.icon, accent: UI.CAT_COLOR[d.cat], done: isDoneToday(p.desc), meta: [{ t: p.slot, accent: true }, { t: d.min + ' min', icon: 'clock' }] });
    }).join('');

    const active = Content.PROGRAMS.filter((p) => Store.program(p.id));
    let progHtml = '';
    if (active.length) {
      progHtml = active.map((p) => {
        const st2 = Store.program(p.id), next = Store.nextProgramDay(p.id, p.days);
        const doneN = st2.done.length;
        const didToday = st2.last === todayK;
        return `<a class="card" href="#/program/${p.id}" style="display:block;--accent:${UI.CAT_COLOR[p.cat]};margin-bottom:10px">
          <div class="row between"><div><h3 style="font-size:16px">${esc(p.name)}</h3><div class="small muted">${next ? (didToday ? `Day ${doneN} done today ✓ · Day ${next} tomorrow` : `Day ${next} of ${p.days} is ready`) : 'Completed! 🎉'}</div></div><span class="pill accent">${doneN}/${p.days}</span></div>
          <div class="prog-bar" style="margin-top:12px"><i style="width:${(100 * doneN / p.days).toFixed(1)}%"></i></div>
        </a>`;
      }).join('');
    } else {
      progHtml = `<div class="hero" style="--c1:#8a63f0;--c2:#4776e6">
        <h2>Join a challenge</h2><p>21 to 30-day programs that build one habit at a time — breath, plank, squats, sun salutations, meditation.</p>
        <a class="btn" href="#/programs">${ICON.calendar} Browse programs</a></div>`;
    }

    const quick = [
      [{ kind: 'breath', id: 'sigh', minutes: 2 }, 'Calm down fast', '2 min · Physiological sigh', 'leaf', 'breathe'],
      [{ kind: 'workout', id: 'seven' }, '7-min workout', 'Full body, no equipment', 'bolt', 'move'],
      [{ kind: 'flow', id: 'surya', rounds: 3 }, 'Sun Salutation', '3 rounds · ~6 min', 'sun', 'yoga'],
      [{ kind: 'meditation', id: 'stress-sos' }, 'Stress SOS', '3 min guided reset', 'heart', 'mind'],
      [{ kind: 'breath', id: 'box', minutes: 4 }, 'Focus', '4 min · Box breathing', 'target', 'breathe'],
      [{ kind: 'challenge', id: 'bolt' }, 'BOLT test', '1 min · Track your breath', 'stopwatch', 'challenge']
    ].map(([d, t, s, i, c]) => `<a href="#" ${start(d)} style="--accent:${UI.CAT_COLOR[c]}"><span class="qi">${ICON[i]}</span><span>${esc(t)}<small>${esc(s)}</small></span></a>`).join('');

    return {
      tab: 'today', title: 'Today',
      html: `
      <div class="page-head">
        <div class="eyebrow" style="color:var(--muted)">${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1 class="greet">${greet}${name ? ', ' + esc(name) : ''}<button class="greet-edit" data-edit-name aria-label="${name ? 'Change your name' : 'Add your name'}">${name ? ICON.edit : ICON.edit + '<span>Add name</span>'}</button></h1>
      </div>
      <div class="card">
        <div class="today-top">
          <div class="goal-ring">
            <svg viewBox="0 0 120 120"><defs><linearGradient id="goalGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--breathe)"/><stop offset="1" stop-color="var(--mind)"/></linearGradient></defs>
              <circle class="track" cx="60" cy="60" r="50" fill="none" stroke-width="12"/>
              <circle class="val" cx="60" cy="60" r="50" fill="none" stroke-width="12" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${(100 - pct).toFixed(1)}"/></svg>
            <div class="center"><div><b>${Math.round(mins)}</b><span>of ${goal} min</span></div></div>
          </div>
          <div>
            <h3 style="font-size:17px">${pct >= 100 ? 'Daily goal reached!' : mins > 0 ? 'Keep it going' : 'Start your day'}</h3>
            <p class="small muted">${pct >= 100 ? 'Beautiful consistency. Anything more is a bonus.' : `${Math.max(0, Math.ceil(goal - mins))} more minutes to hit today’s goal.`}</p>
            <div class="stat-inline">
              <div><b>${ICON.flame}${streak}</b><span>day streak</span></div>
              <div><b>${Store.bestStreak()}</b><span>best streak</span></div>
            </div>
          </div>
        </div>
        <div class="week-strip">${week}</div>
      </div>
      ${todayHabits()}
      ${installCard()}
      ${Sync.enabled && !Sync.user && !S().hideSyncNudge && Store.data.log.length > 0 ? `<div class="card install-card" style="margin-top:12px">
        <div class="row" style="align-items:flex-start;gap:14px">
          <div class="avatar">${ICON.repeat}</div>
          <div style="flex:1;min-width:0"><h3 style="font-size:16px">Keep your progress safe</h3><p class="small muted">Create a free account to back up your streak and sync it across your phone, tablet and computer.</p>
            <div class="row" style="margin-top:12px;gap:8px"><a class="btn btn-sm btn-primary" href="#/account">Create account</a><button class="btn btn-sm btn-ghost" data-sync-hide style="color:var(--muted)">Not now</button></div>
          </div>
        </div></div>` : ''}
      ${section('Today’s practice', `<span class="small muted">${doneCount}/3 done</span>`)}
      ${planHtml}
      ${section('Your programs', '<a href="#/programs">Browse all</a>')}
      ${progHtml}
      ${section('Quick start')}
      <div class="quick">${quick}</div>`,
      after() { celebrate(); }
    };
  }

  // ---------------------------------------------------------------------------
  // Breathe
  // ---------------------------------------------------------------------------
  function breatheList() {
    const tabs = `<div class="seg" data-seg="breatheTab"><button class="${st.breatheTab === 'ex' ? 'active' : ''}" data-v="ex">Exercises</button><button class="${st.breatheTab === 'ch' ? 'active' : ''}" data-v="ch">Challenges</button></div>`;
    let body;
    if (st.breatheTab === 'ex') {
      const cats = ['all', 'calm', 'focus', 'energy', 'sleep', 'balance'];
      const chips = `<div class="chips" data-chips="breatheCat">${cats.map((c) => `<button class="chip ${st.breatheCat === c ? 'active' : ''}" data-v="${c}">${c === 'all' ? 'All' : ICON[CAT_ICON[c]] + CAT_NAME[c]}</button>`).join('')}</div>`;
      const list = Content.BREATHS.filter((b) => st.breatheCat === 'all' || b.cat === st.breatheCat)
        .map((b) => sCard({ href: '#/breathe/' + b.id, icon: CAT_ICON[b.cat], title: b.name, sub: b.sub ? `${b.sub} — ${b.tag}` : b.tag, meta: [{ t: CAT_NAME[b.cat], accent: true }, { t: b.minutes + ' min', icon: 'clock' }, { t: patternText(b) }] })).join('');
      body = chips + '<div style="margin-top:12px">' + list + '</div>';
    } else {
      body = `<div class="caution" style="margin-bottom:14px">${ICON.alert}<div><b>Safety first.</b> Do breath-hold challenges seated or lying down, on dry land, never while driving. Stop if you feel unwell. Not recommended during pregnancy or with heart conditions or epilepsy.</div></div>` +
        Content.CHALLENGES.map((c) => {
          const pb = c.rec ? Store.pb(c.rec) : null;
          const unit = (Play.RESULT_META[c.rec] || {}).unit || '';
          return sCard({ href: '#/challenge/' + c.id, icon: c.icon, title: c.name, sub: c.tag, accent: 'var(--challenge)', meta: [{ t: '~' + c.minutes + ' min', icon: 'clock' }].concat(pb != null ? [{ t: 'Best ' + pb + unit, icon: 'trophy', accent: true }] : []) });
        }).join('');
    }
    return {
      tab: 'breathe', title: 'Breathe', accent: 'var(--breathe)',
      html: `<div class="page-head"><h1>Breathe</h1><p>Guided pranayama and breathwork — and challenges to measure your progress.</p></div>${tabs}${body}`
    };
  }

  function breathDetail(id) {
    const b = Content.breath(id); if (!b) return notFound();
    const fixed = !!(b.mode === 'power');
    const mins = st['bm_' + id] || b.minutes;
    const phasesHtml = b.phases ? `<div class="pattern">${b.phases.map(([k, d, l]) => `<span><b>${d}s</b> ${esc(l || { in: 'Inhale', in2: 'Sip', hold: 'Hold', out: 'Exhale', holdOut: 'Hold empty' }[k])}</span>`).join('')}</div>`
      : b.stages ? `<div class="pattern">${b.stages.map((s) => `<span><b>${s.minutes}m</b> ${s.phases.map((p) => p[1]).join('-')}</span>`).join('')}</div>`
      : b.mode === 'power' ? `<div class="pattern"><span><b>30</b> deep breaths</span><span><b>∞</b> empty hold</span><span><b>15s</b> recovery hold</span><span><b>×3</b> rounds</span></div>`
      : `<div class="pattern"><span><b>${b.pumps}</b> ${b.mode === 'pumps' ? 'snap exhales' : 'bellows breaths'}</span><span><b>${b.rest}s</b> rest</span><span><b>×${b.rounds}</b> rounds</span></div>`;
    const opts = b.mode === 'pumps' || b.mode === 'bellows' ? [2, 4, 6] : b.stages ? [5, 8, 12] : [1, 2, 3, 5, 10, 15];
    if (!opts.includes(mins) && !fixed) opts.push(mins), opts.sort((a, c) => a - c);
    const savedRest = PF().breathRest[id];
    const rest = savedRest != null ? savedRest : Content.breathRestDefault(b);
    const roundBased = b.mode === 'pumps' || b.mode === 'bellows' || b.mode === 'power';
    const restHint = roundBased ? 'Natural breathing between rounds.' : b.stages ? 'A short pause as the rhythm changes.' : 'Optional pauses of natural breathing, about every 2 minutes.';
    return {
      tab: 'breathe', title: b.name, accent: 'var(--breathe)', back: '#/breathe',
      html: `
      <div class="detail-stage" style="display:grid;place-items:center"><div style="display:grid;place-items:center"><div class="orb-demo" style="width:min(42vw,200px);height:min(42vw,200px);border-radius:50%;background:radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 40%, #fff), var(--accent) 55%, color-mix(in srgb, var(--accent) 55%, #000));animation:breathe ${b.phases ? b.phases.reduce((a, p) => a + p[1], 0) : 8}s ease-in-out infinite;box-shadow:0 0 50px color-mix(in srgb, var(--accent) 40%, transparent)"></div></div></div>
      <div class="detail-title"><div class="eyebrow">${CAT_NAME[b.cat]} · ${esc(b.level)}</div><h1>${esc(b.name)}</h1>${b.sub ? `<div class="sk">${esc(b.sub)}</div>` : ''}<p>${esc(b.about)}</p></div>
      ${section('Pattern')}${phasesHtml}
      ${fixed ? '' : section('Duration') + picker('bm_' + id, opts, mins, (v) => v + ' min')}
      ${section(roundBased ? 'Rest between rounds' : 'Rest breaks')}<p class="small muted" style="margin:-6px 0 10px">${restHint}</p>${picker('p:breathRest.' + id, Content.breathRestOptions(b), rest, restLabel)}
      ${section('How to')}${listSteps(b.steps)}
      ${section('Benefits')}${listDots(b.benefits)}
      ${caution(b.caution)}
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'breath', id: b.id, minutes: fixed ? undefined : mins, rest })}>${ICON.play} Start · ${fixed ? b.minutes : mins} min</button></div>`
    };
  }

  function challengeDetail(id) {
    const c = Content.challenge(id); if (!c) return notFound();
    const meta = Play.RESULT_META[c.rec] || { unit: '' };
    const hist = (Store.data.hist[c.rec] || []).slice(-8).reverse();
    const pb = c.rec ? Store.pb(c.rec) : null;
    const needsMax = (id === 'co2' || id === 'o2');
    const max = Store.pb('maxHold');
    let histHtml = '';
    if (hist.length) {
      const top = Math.max(...hist.map((x) => x.v), 1);
      histHtml = section('Recent results') + `<div class="card">${hist.map((x) => `<div class="split-row"><span>${Store.parseDay(x.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><div class="prog-bar"><i style="width:${(100 * x.v / top).toFixed(0)}%"></i></div><span>${x.v}${esc(meta.unit)}</span></div>`).join('')}</div>`;
    }
    return {
      tab: 'breathe', title: c.name, accent: 'var(--challenge)', back: '#/breathe',
      html: `
      <div class="hero" style="--c1:#e08e0b;--c2:#d6533c;margin-bottom:16px">
        <div class="eyebrow" style="color:#fff;opacity:.85">Breath challenge</div>
        <h2 style="margin-top:4px">${esc(c.name)}</h2><p>${esc(c.sub || c.tag)}</p>
        ${pb != null ? `<p style="margin-top:12px;font-size:28px;font-weight:800">${pb}${esc(meta.unit)} <span style="font-size:14px;font-weight:600;opacity:.85">personal best</span></p>` : ''}
      </div>
      <p class="muted">${esc(c.about)}</p>
      ${needsMax ? `<div class="card flat" style="margin-top:14px"><div class="small"><b>Table based on max hold:</b> ${max ? max + 's' : 'not tested yet — using 60s'}. ${max ? '' : '<a href="#/challenge/maxhold" style="color:var(--accent);font-weight:700">Take the test first →</a>'}</div></div>` : ''}
      ${section('How it works')}${listSteps(c.steps)}
      ${histHtml}
      ${caution(c.caution || 'Practise seated or lying down, never in water or while driving. Stop if you feel dizzy or unwell.')}
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'challenge', id: c.id })}>${ICON.play} Start challenge</button></div>`
    };
  }

  // ---------------------------------------------------------------------------
  // Move
  // ---------------------------------------------------------------------------
  function moveList() {
    const tabs = `<div class="seg" data-seg="moveTab"><button class="${st.moveTab === 'workouts' ? 'active' : ''}" data-v="workouts">Workouts</button><button class="${st.moveTab === 'ex' ? 'active' : ''}" data-v="ex">Exercise library</button></div>`;
    let body;
    if (st.moveTab === 'workouts') {
      body = Content.WORKOUTS.map((w0) => {
        const w = Play.workoutWith(w0, PF().wk[w0.id] || {});
        const min = Math.round(Content.workoutSeconds(w) / 60);
        return sCard({ href: '#/workout/' + w.id, icon: w.icon, title: w.name, sub: w.tag, done: isDoneToday({ id: w.id }), meta: [{ t: min + ' min', icon: 'clock' }, { t: w.items.length + ' moves' + (w.rounds > 1 ? ` × ${w.rounds}` : '') }, { t: w.level, accent: true }] });
      }).join('');
    } else {
      body = `<div class="grid grid-auto">${Object.values(Content.EX).map((e) => `
        <a class="fig-card" href="#/exercise/${e.id}">
          <div class="fig-thumb" data-fig="ex:${e.id}"></div>
          <div class="fig-body"><h3>${esc(e.name)}</h3><div class="sk" style="font-style:normal">${esc(e.muscles)}</div></div>
        </a>`).join('')}</div>`;
    }
    return { tab: 'move', title: 'Move', accent: 'var(--move)', html: `<div class="page-head"><h1>Move</h1><p>Follow-along workouts with animated demonstrations of every move.</p></div>${tabs}${body}` };
  }

  function workoutDetail(id) {
    const base = Content.workout(id); if (!base) return notFound();
    const saved = PF().wk[id] || {};
    const w = Play.workoutWith(base, saved);
    const min = Math.round(Content.workoutSeconds(w) / 60);
    const rows = w.items.map((eid) => { const e = Content.EX[eid]; return `<a class="ex-row" href="#/exercise/${eid}"><div class="ex-fig" data-fig="exstill:${eid}"></div><div><div class="ex-name">${esc(e.name)}</div><div class="small muted">${esc(e.muscles)}</div></div><span class="ex-time">${w.work}s</span></a>`; }).join('');
    const tuned = saved.work != null || saved.rest != null || saved.rounds != null;
    return {
      tab: 'move', title: w.name, accent: 'var(--move)', back: '#/move',
      html: `
      <div class="hero" style="--c1:#ee5f38;--c2:#e0306b;margin-bottom:6px">
        <div class="eyebrow" style="color:#fff;opacity:.85">${esc(w.level)}</div>
        <h2 style="margin-top:4px">${esc(w.name)}</h2><p>${esc(w.tag)}</p>
        <div class="facts">${[`${min} min`, `${w.work}s work`, w.rest ? `${w.rest}s rest` : 'no rest', w.rounds > 1 ? `${w.rounds} rounds` : '1 round'].map((t) => `<span class="pill" style="background:rgba(255,255,255,.2);color:#fff">${t}</span>`).join('')}</div>
      </div>
      ${section('Timing', tuned ? `<button class="link" data-reset-wk="${id}">Reset to default</button>` : '')}
      <div class="card" style="padding:4px 16px">
        <div class="field" style="display:block"><label>Work per exercise</label><div style="margin-top:8px">${picker(`p:wk.${id}.work`, [20, 30, 40, 45, 60], w.work, (v) => v + 's')}</div></div>
        <div class="field" style="display:block"><label>Rest between exercises</label><div style="margin-top:8px">${picker(`p:wk.${id}.rest`, [0, 10, 15, 20, 30, 45, 60], w.rest, restLabel)}</div></div>
        <div class="field" style="display:block"><label>Rounds</label><div class="hint">${w.roundRest || 30}s rest between rounds</div><div style="margin-top:8px">${picker(`p:wk.${id}.rounds`, [1, 2, 3, 4], w.rounds)}</div></div>
      </div>
      ${section('Exercises', `<span class="small muted">${w.items.length} moves</span>`)}
      <div class="card ex-list" style="padding:6px 14px">${rows}</div>
      <p class="small muted" style="margin-top:12px">Tip: tap any exercise to see a full demonstration and form cues before you start. Listen to your body and slow down whenever you need to.</p>
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'workout', id: w.id })}>${ICON.play} Start workout · ${min} min</button></div>`
    };
  }

  function exerciseDetail(id) {
    const e = Content.EX[id]; if (!e) return notFound();
    const secs = st.exSecs, sets = PF().exSets, rest = PF().exRest;
    const dur = (v) => v < 60 ? v + 's' : fmt(v);
    return {
      tab: 'move', title: e.name, accent: 'var(--move)', back: '#/move',
      html: `
      ${stage('ex:' + e.id, { speed: true, cap: true })}
      <div class="detail-title"><div class="eyebrow">${esc(e.level)}</div><h1>${esc(e.name)}</h1><p>${esc(e.muscles)}</p></div>
      ${e.hl.length ? '<div class="legend-hl" style="margin-top:10px"><i></i> Muscles worked are highlighted in the demo</div>' : ''}
      ${section('How to do it')}${listSteps(e.steps)}
      ${e.tips ? section('Form tips') + listDots(e.tips) : ''}
      ${section('Practice')}
      <div class="card" style="padding:4px 16px">
        <div class="field" style="display:block"><label>Time per set</label><div style="margin-top:8px">${picker('exSecs', [20, 30, 45, 60, 90, 120], secs, dur)}</div></div>
        <div class="field" style="display:block"><label>Sets</label><div style="margin-top:8px">${picker('p:exSets', [1, 2, 3, 4, 5], sets)}</div></div>
        ${sets > 1 ? `<div class="field" style="display:block"><label>Rest between sets</label><div style="margin-top:8px">${picker('p:exRest', [15, 30, 45, 60, 90], rest, (v) => v + 's')}</div></div>` : ''}
      </div>
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'exercise', id: e.id, seconds: secs, sets, rest })}>${ICON.play} ${sets > 1 ? `${sets} × ${dur(secs)}` : 'Practice ' + dur(secs)}</button></div>`
    };
  }

  // ---------------------------------------------------------------------------
  // Yoga
  // ---------------------------------------------------------------------------
  function yogaList() {
    const tabs = `<div class="seg" data-seg="yogaTab"><button class="${st.yogaTab === 'flows' ? 'active' : ''}" data-v="flows">Flows</button><button class="${st.yogaTab === 'poses' ? 'active' : ''}" data-v="poses">Asana library</button></div>`;
    let body;
    if (st.yogaTab === 'flows') {
      body = Content.FLOWS.map((f) => {
        const min = Math.round(Content.flowSeconds(f, { pause: PF().flowPause, roundRest: PF().suryaRest, pace: PF().suryaPace }) / 60);
        return sCard({ href: '#/flow/' + f.id, icon: f.icon, title: f.name, sub: f.sub ? `${f.sub} — ${f.tag}` : f.tag, done: isDoneToday({ id: f.id }), meta: [{ t: min + ' min', icon: 'clock' }, { t: f.type === 'surya' ? '12 postures' : f.items.length + ' poses' }, { t: f.level, accent: true }] });
      }).join('');
    } else {
      const cats = ['All', ...new Set(Content.YOGA.map((y) => y.cat))];
      body = `<div class="chips" data-chips="yogaCat">${cats.map((c) => `<button class="chip ${st.yogaCat === c ? 'active' : ''}" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="grid grid-auto" style="margin-top:12px">${Content.YOGA.filter((y) => st.yogaCat === 'All' || y.cat === st.yogaCat).map((y) => `
        <a class="fig-card" href="#/pose/${y.id}">
          <div class="fig-thumb" data-fig="yoga:${y.id}"></div>
          <div class="fig-body"><h3>${esc(y.name)}</h3><div class="sk">${esc(y.sk)}</div></div>
        </a>`).join('')}</div>`;
    }
    return { tab: 'yoga', title: 'Yoga', accent: 'var(--yoga)', html: `<div class="page-head"><h1>Yoga</h1><p>Asana demonstrations and guided flows, from Sun Salutations to bedtime unwinding.</p></div>${tabs}${body}` };
  }

  function flowDetail(id) {
    const f = Content.flow(id); if (!f) return notFound();
    if (f.type === 'surya') {
      const rounds = st.suryaRounds || f.rounds, pace = PF().suryaPace || f.pace, roundRest = PF().suryaRest;
      const min = Math.round(Content.flowSeconds(f, { rounds, pace, roundRest }) / 60);
      const steps = Content.suryaSteps('R');
      return {
        tab: 'yoga', title: f.name, accent: 'var(--yoga)', back: '#/yoga',
        html: `
        ${stage('surya')}
        <p class="small" style="text-align:center;margin:-6px 0 14px" data-surya-cap><b>1. Prayer Pose</b> · Exhale</p>
        <div class="detail-title"><div class="eyebrow">${esc(f.level)}</div><h1>${esc(f.name)}</h1><div class="sk">${esc(f.sub)}</div><p>${esc(f.about)}</p></div>
        ${section('Rounds')}${picker('suryaRounds', [1, 2, 3, 5, 8, 12], rounds)}
        ${section('Pace')}${picker('p:suryaPace', [7, 5, 4], pace, (v) => ({ 7: 'Slow', 5: 'Steady', 4: 'Brisk' }[v]))}
        ${section('Rest between rounds')}${picker('p:suryaRest', [0, 10, 15, 20, 30, 45], roundRest, restLabel)}
        ${section('The 12 postures')}
        <div class="card ex-list" style="padding:6px 14px">${steps.map((s, i) => `<div class="ex-row"><div class="ex-fig" data-fig="pose:${s.pose}"></div><div><div class="ex-name">${i + 1}. ${esc(s.name)}</div><div class="small muted"><i>${esc(s.sk)}</i> · ${esc(s.breath)}</div></div></div>`).join('')}</div>
        ${caution('Move gently and within your range. Avoid if you have recent back, wrist or shoulder injuries; in pregnancy, practise a modified version with a teacher.')}
        <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'flow', id: 'surya', rounds, pace, roundRest })}>${ICON.play} Start · ${rounds} rounds · ${min} min</button></div>`
      };
    }
    const pause = PF().flowPause;
    const min = Math.round(Content.flowSeconds(f, { pause }) / 60);
    const rows = f.items.map(([pid, s]) => { const y = Content.yoga(pid); return `<a class="ex-row" href="#/pose/${pid}"><div class="ex-fig" data-fig="yoga:${pid}"></div><div><div class="ex-name">${esc(y.name)}</div><div class="small muted"><i>${esc(y.sk)}</i>${y.sides ? ' · both sides' : ''}</div></div><span class="ex-time">${s}s</span></a>`; }).join('');
    return {
      tab: 'yoga', title: f.name, accent: 'var(--yoga)', back: '#/yoga',
      html: `
      <div class="hero" style="--c1:#8a63f0;--c2:#c058c7;margin-bottom:6px">
        <div class="eyebrow" style="color:#fff;opacity:.85">${esc(f.level)}</div>
        <h2 style="margin-top:4px">${esc(f.name)}</h2><p>${esc(f.tag)}</p>
        <div class="facts"><span class="pill" style="background:rgba(255,255,255,.2);color:#fff">${min} min</span><span class="pill" style="background:rgba(255,255,255,.2);color:#fff">${f.items.length} poses</span></div>
      </div>
      ${section('Transition between poses')}<p class="small muted" style="margin:-6px 0 10px">A pause to come out of one pose and into the next. The demo shows the next pose while you move.</p>${picker('p:flowPause', [0, 5, 10, 15], pause, restLabel)}
      ${section('Sequence')}
      <div class="card ex-list" style="padding:6px 14px">${rows}</div>
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'flow', id: f.id, pause })}>${ICON.play} Start flow · ${min} min</button></div>`
    };
  }

  function poseDetail(id) {
    const y = Content.yoga(id); if (!y) return notFound();
    const secs = st['ps_' + id] || y.hold;
    const opts = [...new Set([15, 30, 45, 60, 90, 180, y.hold])].sort((a, b) => a - b);
    return {
      tab: 'yoga', title: y.name, accent: 'var(--yoga)', back: '#/yoga',
      html: `
      ${stage('yogalive:' + y.id, { cap: !!y.flowFrames })}
      <div class="detail-title"><div class="eyebrow">${esc(y.cat)} · ${esc(y.level)}</div><h1>${esc(y.name)}</h1><div class="sk">${esc(y.sk)}</div><p>“${esc(y.cue)}”</p></div>
      ${section('How to')}${listSteps(y.steps)}
      ${section('Benefits')}${listDots(y.benefits)}
      ${caution(y.caution)}
      ${section('Hold')}${picker('ps_' + id, opts, secs, (v) => v < 60 ? v + 's' : fmt(v))}
      ${y.sides ? '<p class="small muted" style="margin-top:8px">Held on each side.</p>' : ''}
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'pose', id: y.id, seconds: secs })}>${ICON.play} Practice ${secs < 60 ? secs + 's' : fmt(secs)}${y.sides ? ' each side' : ''}</button></div>`
    };
  }

  // ---------------------------------------------------------------------------
  // Mind
  // ---------------------------------------------------------------------------
  const audioMin = (it) => Math.max(1, Math.round(it.duration / 60));
  function audioCard(it) {
    return sCard({
      href: '#/audio/' + it.id, icon: 'headphones', title: it.title, sub: it.guide || Library.CATEGORIES[it.category] || '', done: isDoneToday({ id: it.id }),
      meta: [{ t: audioMin(it) + ' min', icon: 'clock' }, { t: Library.CATEGORIES[it.category] || 'Recorded' }].concat(Library.isDownloaded(it.id) ? [{ t: 'Offline', icon: 'download', accent: true }] : [{ t: 'Recorded', accent: true }])
    });
  }
  function studioCard() {
    return `<a class="card account-card studio-card" href="#/studio"><div class="avatar">${ICON.mic}</div><div style="flex:1"><b>Meditation studio</b><span class="small muted" style="display:block">Record or upload guided meditations</span></div><span class="chev">${ICON.chev}</span></a>`;
  }

  function mindList() {
    const meds = Meditations.list.map((m) => sCard({ href: '#/meditation/' + m.id, icon: m.icon, title: m.name, sub: m.tag, done: isDoneToday({ id: m.id }), meta: [{ t: m.minutes + ' min', icon: 'clock' }, { t: 'Guided', accent: true }] })).join('');
    const recorded = Library.items.map(audioCard).join('');
    return {
      tab: 'mind', title: 'Mind', accent: 'var(--mind)',
      html: `
      <div class="page-head"><h1>Mind</h1><p>Guided meditations with voice, ambient sound and gentle bells.</p></div>
      ${Library.isAdmin() ? studioCard() : ''}
      <div class="hero" style="--c1:#4776e6;--c2:#8a63f0">
        <h2>Silent meditation timer</h2><p>Sit in stillness. A bell marks the beginning and end.</p>
        <div style="margin-top:14px"><div class="small" style="opacity:.85;margin-bottom:6px;font-weight:650">Duration</div>${picker('timerMin', [3, 5, 10, 15, 20, 30], st.timerMin, (v) => v + 'm')}</div>
        <div style="margin-top:12px"><div class="small" style="opacity:.85;margin-bottom:6px;font-weight:650">Interval bell</div>${picker('timerBell', [0, 1, 5], st.timerBell, (v) => v ? 'Every ' + v + 'm' : 'None')}</div>
        <button class="btn" ${start({ kind: 'timer', minutes: st.timerMin, interval: st.timerBell })}>${ICON.play} Begin</button>
      </div>
      ${recorded ? section('Recorded meditations') + recorded : ''}
      ${section('Guided meditations')}${meds}`,
      after(root) {
        Library.refresh();
        $$('.hero .picker button', root).forEach((b) => { b.style.borderColor = 'rgba(255,255,255,.3)'; if (!b.classList.contains('active')) { b.style.background = 'rgba(255,255,255,.12)'; b.style.color = '#fff'; } else { b.style.background = '#fff'; b.style.color = '#1b1930'; } }); }
    };
  }

  function medDetail(id) {
    const m = Meditations.get(id); if (!m) return notFound();
    return {
      tab: 'mind', title: m.name, accent: 'var(--mind)', back: '#/mind',
      html: `
      <div class="detail-stage" style="display:grid;place-items:center;background:radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--mind) 25%, var(--surface-2)), var(--surface-2))"><div style="display:grid;place-items:center"><div class="orb-demo" style="width:min(40vw,190px);height:min(40vw,190px);border-radius:50%;background:radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--accent) 40%, #fff), var(--accent) 55%, transparent 75%);animation:breathe 10s ease-in-out infinite"></div></div></div>
      <div class="detail-title"><div class="eyebrow">${m.minutes} min · guided</div><h1>${esc(m.name)}</h1><p>${esc(m.about)}</p></div>
      ${section('Before you begin')}
      ${listDots(['Find a quiet spot and silence notifications.', 'Headphones make the voice and ambient sound more immersive.', m.ambient === 'rain' ? 'This session uses a soft rain-like sound bed.' : 'This session uses a soft ambient drone.', 'Voice guidance can be toggled from the speaker icon during the session.'])}
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'meditation', id: m.id })}>${ICON.play} Begin · ${m.minutes} min</button></div>`
    };
  }

  function audioDetail(id) {
    const it = Library.get(id);
    const base = { tab: 'mind', accent: 'var(--mind)', back: '#/mind' };
    if (!it) {
      return Object.assign(base, {
        title: 'Meditation', html: '<div class="page-head"><h1>Meditation</h1><p class="muted" data-audio-missing>Looking for this recording…</p></div>',
        after(root) {
          Library.refresh(true).then(() => {
            if (Library.get(id)) { if (current && current.title === 'Meditation') render(true); return; }
            const p = $('[data-audio-missing]', root); if (p) p.textContent = navigator.onLine ? 'This recording isn’t available any more.' : 'You’re offline and this recording isn’t saved on this device.';
          });
        }
      });
    }
    const dl = Library.isDownloaded(it.id);
    const sizeMB = it.size ? (it.size / 1048576).toFixed(it.size > 1048576 * 10 ? 0 : 1) + ' MB' : '';
    return Object.assign(base, {
      title: it.title,
      html: `
      <div class="detail-stage" style="display:grid;place-items:center;background:radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--mind) 25%, var(--surface-2)), var(--surface-2))"><div style="display:grid;place-items:center"><div class="orb-demo" style="width:min(40vw,190px);height:min(40vw,190px);border-radius:50%;background:radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--accent) 40%, #fff), var(--accent) 55%, transparent 75%);animation:breathe 10s ease-in-out infinite"></div></div></div>
      <div class="detail-title"><div class="eyebrow">${audioMin(it)} min · ${esc(Library.CATEGORIES[it.category] || 'Recorded')}</div><h1>${esc(it.title)}</h1>${it.guide ? `<div class="sk">with ${esc(it.guide)}</div>` : ''}${it.description ? `<p style="white-space:pre-line">${esc(it.description)}</p>` : ''}</div>
      <div class="card dl-card" data-dl-card>
        <div style="flex:1;min-width:0"><b>${dl ? 'Available offline' : 'Listen offline'}</b><div class="small muted" data-dl-note>${dl ? 'Saved on this device' + (sizeMB ? ' · ' + sizeMB : '') : 'Download to play without a connection' + (sizeMB ? ' · ' + sizeMB : '')}</div><div class="st-progress" data-dl-prog hidden><i></i></div></div>
        ${dl ? `<button class="btn btn-sm" data-dl-remove="${it.id}">${ICON.trash} Remove</button>` : `<button class="btn btn-sm btn-primary" data-dl="${it.id}">${ICON.download} Download</button>`}
      </div>
      ${section('Player')}
      ${listDots(['Play / pause, skip ±15 s, and drag to any point.', 'Loop it, slow it down or speed it up, and set a stop timer for sleep.', 'Add a soft background drone or rain under the voice.', 'Keeps playing with the screen locked — use your lock-screen controls.'])}
      ${Library.isAdmin() ? `<a class="btn btn-sm" href="#/studio" style="margin-top:16px">${ICON.edit} Manage in studio</a>` : ''}
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'audio', id: it.id })}>${ICON.play} Begin · ${audioMin(it)} min</button></div>`
    });
  }

  function studio() {
    const base = { tab: 'mind', title: 'Studio', accent: 'var(--mind)', back: '#/mind' };
    const head = '<div class="page-head"><h1>Meditation studio</h1><p>Record or upload guided meditations. Published ones appear in everyone’s Mind tab.</p></div>';
    if (!Library.enabled) return Object.assign(base, { html: head + '<div class="card"><p class="muted">Accounts aren’t set up for this copy of Prana.</p></div>' });
    if (!Sync.user) {
      return Object.assign(base, {
        html: head + `<div class="card"><p class="muted" data-studio-msg>${Sync.ready ? 'Sign in with your admin account to use the studio.' : 'Checking your account…'}</p><a class="btn btn-sm btn-primary" href="#/account" style="margin-top:12px">Sign in</a></div>`,
        after() { if (!Sync.ready) Sync.getClient().then(() => { if (current && current.title === 'Studio') render(true); }).catch(() => {}); }
      });
    }
    if (!Library.isAdmin()) {
      return Object.assign(base, {
        html: head + '<div class="card"><p class="muted" data-studio-msg>Checking studio access…</p></div>',
        after(root) {
          Library.checkAdmin().then((ok) => {
            if (ok) { if (current && current.title === 'Studio') render(true); return; }
            const p = $('[data-studio-msg]', root); if (p) p.textContent = 'Only admins can open the studio. If this is your project, add your account as an admin by running supabase/meditations.sql in Supabase.';
          });
        }
      });
    }
    return Object.assign(base, { html: head + '<div data-studio></div>', after(root) { Studio.mount($('[data-studio]', root)); } });
  }

  // ---------------------------------------------------------------------------
  // Habits — lifestyle counters, insights and rewards
  // ---------------------------------------------------------------------------
  const DAYMS = 864e5;
  const pad2 = (n) => String(n).padStart(2, '0');
  function since(ms, long) {
    const d = Math.floor(ms / DAYMS), h = Math.floor((ms % DAYMS) / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
    if (long) return `${d}<small>d</small> ${pad2(h)}<small>h</small> ${pad2(m)}<small>m</small> ${pad2(s)}<small>s</small>`;
    return `${h}h ${pad2(m)}m ${pad2(s)}s`;
  }
  const hIcon = (c) => ICON[c.icon] || ICON.sparkle;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const toLocalInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const fmtWhen = (ms) => new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  function milestoneProgress(s) {
    const nm = Habits.nextMilestone(s.currentDays);
    const prev = [0].concat(Habits.MILESTONES).filter((m) => m <= s.currentDays).pop();
    return { next: nm, pct: nm ? Math.min(1, (s.currentMs / DAYMS - prev) / (nm - prev)) : 1 };
  }

  function levelCard(x) {
    return `<a class="hero lvl-card" href="#/rewards" style="--c1:#e0457b;--c2:#8a63f0">
      <div class="lvl-top"><div class="lvl-badge"><small>LEVEL</small><b>${x.level}</b></div>
        <div style="flex:1;min-width:0"><div class="lvl-title">${esc(x.title)}</div><div class="small" style="opacity:.88">${x.total.toLocaleString()} XP · ${(x.need - x.into).toLocaleString()} XP to level ${x.level + 1}</div></div>
        <span class="chev" style="color:#fff">${ICON.chev}</span></div>
      <div class="lvl-bar"><i style="width:${(x.pct * 100).toFixed(1)}%"></i></div>
    </a>`;
  }
  function checkinCard() {
    if (Habits.checkedInToday()) {
      const n = Habits.checkinStreak(), mood = Habits.MOODS.find((m) => +m[0] === Habits.data.checkins[Store.dayKey()].mood);
      return `<div class="card ci-done"><span class="ci-emoji">${mood ? mood[1] : '✓'}</span><div><b>Checked in today</b><div class="small muted">${plural(n, 'day')} in a row · come back tomorrow for +5 XP</div></div></div>`;
    }
    return `<div class="card ci-card"><div class="row between"><div><b>Daily check-in</b><div class="small muted">How are you feeling today? <span class="xp-tag">+5 XP</span></div></div></div>
      <div class="ci-moods">${Habits.MOODS.map(([v, e, l]) => `<button type="button" data-checkin="${v}" aria-label="${l}"><span>${e}</span><small>${l}</small></button>`).join('')}</div></div>`;
  }
  function habitCard(c) {
    const s = Habits.stats(c), r = Habits.rankFor(s.currentDays), mp = milestoneProgress(s), ch = Habits.activeChallenge(c);
    return `<a class="card hb-card" href="#/habit/${c.id}" style="--hc:${c.color}">
      <div class="hb-ic">${hIcon(c)}</div>
      <div class="hb-main">
        <div class="hb-top"><h3>${esc(c.name)}</h3><span class="rank-pill" style="--rc:${r.rank.color}">${esc(r.rank.name)}</span></div>
        <div class="hb-count"><b data-tick-days="${s.start}">${s.currentDays}</b><span>${s.currentDays === 1 ? 'day' : 'days'}</span><span class="hb-hm" data-tick="${s.start}">${since(s.currentMs)}</span></div>
        <div class="prog-bar hb-bar"><i style="width:${(mp.pct * 100).toFixed(1)}%"></i></div>
        <div class="small muted hb-foot">${mp.next ? `${plural(mp.next - s.currentDays, 'day')} to <b>${Habits.milestoneName(mp.next)}</b>` : 'Every milestone unlocked'}${ch ? ` · ${ICON.target} ${ch.days}-day challenge` : ''}${s.isBest ? ' · <b class="hb-best">Best ever</b>' : ''}</div>
      </div>
    </a>`;
  }
  function presetGrid() {
    return `<div class="preset-grid">${Habits.PRESETS.map((p) => `<a class="preset" href="#/habits/new?p=${p.id}" style="--hc:${p.color}"><span class="hb-ic">${ICON[p.icon] || ICON.sparkle}</span><b>${esc(p.id === 'custom' ? 'Something else' : p.name)}</b></a>`).join('')}</div>`;
  }
  function badgeTile(a) {
    return `<div class="badge-tile ${a.got ? 'got' : ''}" title="${esc(a.desc)}"><span class="badge-ic">${ICON[a.icon] || ICON.star}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small><span class="xp-tag">${a.got ? '✓ ' : ''}+${a.xp} XP</span></div>`;
  }

  function habitsHome() {
    const cs = Habits.list(), x = Habits.xpInfo(), ach = Habits.achievements();
    const got = ach.filter((a) => a.got).length;
    return {
      tab: 'habits', title: 'Habits', accent: 'var(--habits)',
      html: `
      <div class="page-head"><h1>Habits</h1><p>Quit what holds you back. Every clean day, beaten urge and check-in earns XP.</p></div>
      ${levelCard(x)}
      <div class="quote-card">${ICON.sparkle}<p>${esc(Habits.lineOfDay())}</p></div>
      ${checkinCard()}
      ${section('Your counters', cs.length ? '<a href="#/habits/new">+ Add</a>' : '')}
      ${cs.length ? cs.map(habitCard).join('') : `<div class="card hb-empty"><b>Start your first counter</b><p class="small muted">Pick what you want to quit. Your streak starts now and every milestone unlocks a reward.</p></div>${presetGrid()}`}
      ${section('Rewards', `<a href="#/rewards">${got}/${ach.length} badges</a>`)}
      <a class="card badges-peek" href="#/rewards">${ach.slice().sort((a, b) => b.got - a.got).slice(0, 6).map((a) => `<span class="badge-ic ${a.got ? 'got' : ''}" title="${esc(a.name)}">${ICON[a.icon] || ICON.star}</span>`).join('')}<span class="chev">${ICON.chev}</span></a>
      <p class="small muted" style="margin:16px 4px 0">Counters sync privately with your account. Mark one as discreet to hide its name on the Today screen.</p>`,
      after() { celebrate(); }
    };
  }

  function habitNew() {
    const pid = new URLSearchParams(location.hash.split('?')[1] || '').get('p');
    if (!pid) {
      return { tab: 'habits', title: 'New counter', accent: 'var(--habits)', back: '#/habits', html: `<div class="page-head"><h1>What do you want to quit?</h1><p>Pick one — you can rename it and add more later.</p></div>${presetGrid()}` };
    }
    return habitFormPage(null, Habits.preset(pid));
  }
  function habitEdit(id) { const c = Habits.get(id); return c ? habitFormPage(c, Habits.preset(c.preset)) : notFound(); }

  function habitFormPage(c, p) {
    const editing = !!c;
    const v = c || { name: p.id === 'custom' ? '' : p.name, icon: p.icon, color: p.color, cost: p.cost ? '' : '', minutes: '', currency: Habits.defaultCurrency(), private: !!p.private, why: p.why || '', startAt: Date.now() };
    const curOpts = Object.keys(Habits.CUR).map((k) => `<option value="${k}" ${(v.currency || Habits.defaultCurrency()) === k ? 'selected' : ''}>${k} ${Habits.CUR[k]}</option>`).join('');
    const hasResets = editing && c.resets.length > 0;
    return {
      tab: 'habits', title: editing ? 'Edit counter' : 'New counter', accent: 'var(--habits)', back: editing ? '#/habit/' + c.id : '#/habits/new',
      html: `
      <div class="page-head"><h1>${editing ? 'Edit counter' : esc(p.id === 'custom' ? 'Your own counter' : p.name)}</h1>${!editing && p.why ? `<p>${esc(p.why)}</p>` : ''}</div>
      <form class="card auth-form hb-form" id="habitForm" novalidate style="--hc:${v.color}">
        <label class="fl">Name<input class="input" name="name" maxlength="40" required value="${esc(v.name)}" placeholder="e.g. No late-night snacks"></label>
        <div class="fl">Icon<div class="hf-icons" data-hf="icon">${Habits.ICONS.map((k) => `<button type="button" data-v="${k}" class="${k === v.icon ? 'on' : ''}" aria-label="${k}">${ICON[k] || ''}</button>`).join('')}</div></div>
        <div class="fl">Colour<div class="hf-colors" data-hf="color">${Habits.COLORS.map((k) => `<button type="button" data-v="${k}" class="${k === v.color ? 'on' : ''}" style="--sw:${k}" aria-label="Colour ${k}"></button>`).join('')}</div></div>
        ${hasResets ? '' : `<div class="fl">${editing ? 'Started' : 'When did you start?'}
          ${editing ? '' : `<div class="seg hf-seg" data-hf="when"><button type="button" data-v="now" class="active">Right now</button><button type="button" data-v="earlier">Earlier</button></div>`}
          <input class="input" type="datetime-local" name="startAt" value="${toLocalInput(v.startAt)}" max="${toLocalInput(Date.now())}" ${editing ? '' : 'hidden'}></div>`}
        <label class="fl">Your reason <span class="hint">Shown to you when an urge hits</span><textarea class="input st-ta" name="why" maxlength="140" rows="2" placeholder="Why does this matter to you?">${esc(v.why)}</textarea></label>
        <div class="hf-pair">
          <label class="fl">Money spent per day <span class="hint">Optional — tracks savings</span><div class="row" style="gap:8px"><select class="input" name="currency" style="max-width:110px">${curOpts}</select><input class="input" name="cost" type="number" min="0" step="0.5" inputmode="decimal" value="${v.cost || ''}" placeholder="${p.cost || 0}"></div></label>
          <label class="fl">Minutes per day it took <span class="hint">Optional — tracks time reclaimed</span><input class="input" name="minutes" type="number" min="0" max="1440" step="5" inputmode="numeric" value="${v.minutes || ''}" placeholder="${p.minutes || 0}"></label>
        </div>
        <div class="field" style="padding:0"><div><label for="hf_priv">Discreet</label><div class="hint">Hide the name on the Today screen</div></div><label class="switch"><input type="checkbox" id="hf_priv" name="private" ${v.private ? 'checked' : ''}><span></span></label></div>
        ${editing ? '' : `<div class="fl">Take a challenge <span class="hint">Commit to a goal for bonus XP</span><div class="hf-chips" data-hf="challenge"><button type="button" data-v="0" class="on">Not now</button>${Habits.CHALLENGE_DAYS.map((d) => `<button type="button" data-v="${d}">${d} days <small>+${Habits.challengeXP(d)}</small></button>`).join('')}</div></div>`}
        <div class="form-msg" role="alert"></div>
        <button class="btn btn-primary btn-block" type="submit">${editing ? 'Save changes' : `${ICON.flame} Start counter`}</button>
      </form>
      ${editing ? `<div class="card" style="margin-top:14px"><p class="small muted">Deleting removes this counter and its history from all your devices.</p><button class="btn btn-sm btn-danger" data-hb-act="delete" data-id="${c.id}" style="margin-top:10px">${ICON.trash} Delete counter</button></div>` : ''}`,
      after(root) {
        const form = $('#habitForm', root);
        const pick = { icon: v.icon, color: v.color, when: 'now', challenge: 0 };
        form.addEventListener('click', (e) => {
          const b = e.target.closest('[data-hf] button'); if (!b) return;
          const key = b.parentElement.dataset.hf;
          pick[key] = b.dataset.v;
          $$('button', b.parentElement).forEach((x) => { x.classList.toggle('on', x === b); x.classList.toggle('active', x === b); });
          if (key === 'color') form.style.setProperty('--hc', b.dataset.v);
          if (key === 'when') { const inp = $('[name="startAt"]', form); inp.hidden = b.dataset.v !== 'earlier'; if (!inp.hidden) inp.focus(); }
        });
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const f = (n) => form.elements[n];
          const msg = $('.form-msg', form);
          const name = f('name').value.trim();
          if (!name) { msg.className = 'form-msg err'; msg.textContent = 'Give your counter a name.'; f('name').focus(); return; }
          let startAt = Date.now();
          const si = f('startAt');
          if (si && (editing || pick.when === 'earlier') && si.value) {
            startAt = new Date(si.value).getTime();
            if (!(startAt > 0) || startAt > Date.now() + 60e3) { msg.className = 'form-msg err'; msg.textContent = 'The start time can’t be in the future.'; return; }
          }
          const data = { name, icon: pick.icon, color: pick.color, why: f('why').value.trim(), cost: +f('cost').value || 0, minutes: +f('minutes').value || 0, currency: f('currency').value, private: f('private').checked };
          if (editing) {
            if (si && !hasResets) data.startAt = startAt;
            Habits.update(c.id, data); toast('Saved'); location.hash = '#/habit/' + c.id;
          } else {
            const nc = Habits.add(Object.assign(data, { preset: p.id, startAt, challengeDays: +pick.challenge || 0 }));
            location.hash = '#/habit/' + nc.id;
          }
        });
      }
    };
  }

  function bars(values, labels, o = {}) {
    const max = Math.max(1, ...values);
    return `<div class="hbars ${o.cls || ''}">${values.map((v, i) => `<div class="hbar ${o.hi === i ? 'hi' : ''}"><span class="bv">${o.fmt ? o.fmt(v) : v || ''}</span><div class="hbar-t"><i style="height:${Math.max(v ? 6 : 2, (v / max) * 100).toFixed(1)}%"></i></div><span class="bl">${labels[i]}</span></div>`).join('')}</div>`;
  }

  function habitDetail(id) {
    const c = Habits.get(id); if (!c) return notFound();
    const s = Habits.stats(c), r = Habits.rankFor(s.currentDays), mp = milestoneProgress(s), ins = Habits.insights(c), ch = Habits.activeChallenge(c);
    const R = 52, CIRC = 2 * Math.PI * R;
    const allCh = c.challenges || [];
    const wonN = allCh.filter((x) => Habits.challengeStatus(c, x).status === 'won').length;
    let chHtml;
    if (ch) {
      const cs = Habits.challengeStatus(c, ch);
      const dayN = Math.min(ch.days, Math.floor((Date.now() - ch.startAt) / DAYMS) + 1);
      chHtml = `<div class="card ch-card"><div class="row between"><div><b>${ch.days}-day challenge</b><div class="small muted">Day ${dayN} of ${ch.days} · ends ${new Date(cs.end).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div></div><span class="xp-tag big">+${Habits.challengeXP(ch.days)} XP</span></div>
        <div class="prog-bar" style="margin-top:12px"><i style="width:${(cs.progress * 100).toFixed(1)}%;background:${c.color}"></i></div>
        <button class="link-quiet" data-hb-act="quitch" data-id="${c.id}">Give up this challenge</button></div>`;
    } else {
      chHtml = `<div class="card ch-card"><b>Take a challenge</b><div class="small muted">Commit to a number of days starting now. Make it — earn the reward.${wonN ? ` You’ve completed ${plural(wonN, 'challenge')} so far.` : ''}</div>
        <div class="hf-chips" style="margin-top:12px">${Habits.CHALLENGE_DAYS.map((d) => `<button type="button" data-hb-ch="${d}" data-id="${c.id}">${d} days <small>+${Habits.challengeXP(d)}</small></button>`).join('')}</div></div>`;
    }
    const statBox = (val, label) => `<div class="hs"><b>${val}</b><span>${label}</span></div>`;
    const DAYL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const hist = ins.history;
    const patterns = ins.slips ? `
      ${section('When slips happen')}
      <div class="card">
        <div class="small muted" style="margin-bottom:6px">By day of week</div>${bars(ins.weekday, DAYL, { hi: ins.weekday.indexOf(Math.max(...ins.weekday)) })}
        <div class="small muted" style="margin:14px 0 6px">By time of day</div>${bars(Object.values(ins.parts), Object.keys(ins.parts), { cls: 'wide', hi: Object.values(ins.parts).indexOf(Math.max(...Object.values(ins.parts))) })}
        ${Object.keys(ins.triggers).length ? `<div class="small muted" style="margin:14px 0 8px">Triggers</div><div class="trig-list">${Object.entries(ins.triggers).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<span class="pill">${esc(t)} · ${n}</span>`).join('')}</div>` : ''}
        ${ins.slips < 3 ? '<p class="small muted" style="margin-top:12px">Patterns get sharper after a few more entries.</p>' : ''}
      </div>` : '';
    const log = c.resets.slice(-8).reverse();
    return {
      tab: 'habits', title: c.name, accent: 'var(--habits)', back: '#/habits',
      html: `
      <div class="hb-hero" style="--hc:${c.color};--rc:${r.rank.color}">
        <div class="hb-ring">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" class="trk"/><circle cx="60" cy="60" r="${R}" class="val" stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="${(CIRC * (1 - mp.pct)).toFixed(1)}"/></svg>
          <div class="hb-ring-c"><span class="hb-ring-ic">${hIcon(c)}</span><b data-tick-days="${s.start}">${s.currentDays}</b><span>${s.currentDays === 1 ? 'day' : 'days'}</span></div>
        </div>
        <h1>${esc(c.name)}</h1>
        <div class="hb-live" data-tick="${s.start}" data-fmt="long">${since(s.currentMs, true)}</div>
        <div class="hb-rank"><span class="rank-pill big" style="--rc:${r.rank.color}">${ICON.trophy} ${esc(r.rank.name)}</span>${r.next ? `<span class="small muted">Next rank: <b>${esc(r.next.name)}</b> at ${r.next.d} days</span>` : ''}</div>
        ${mp.next ? `<div class="small muted">${plural(mp.next - s.currentDays, 'day')} to <b>${Habits.milestoneName(mp.next)}</b> · +${Habits.milestoneXP(mp.next)} XP</div>` : ''}
        ${c.why ? `<blockquote class="hb-why">“${esc(c.why)}”</blockquote>` : ''}
      </div>
      <div class="hb-actions">
        <button class="btn btn-primary" data-hb-act="urge" data-id="${c.id}" style="--accent:${c.color}">${ICON.shield} I’m having an urge</button>
        <button class="btn" data-hb-act="slip" data-id="${c.id}">I slipped</button>
      </div>
      ${chHtml}
      ${section('Stats')}
      <div class="hstats">
        ${statBox(s.currentDays + 'd', 'Current streak')}
        ${statBox(s.bestDays + 'd', 'Best streak')}
        ${statBox(s.attempts, s.attempts === 1 ? 'Attempt' : 'Attempts')}
        ${statBox(s.avgDays < 10 ? s.avgDays.toFixed(1) + 'd' : Math.round(s.avgDays) + 'd', 'Average streak')}
        ${statBox(Math.round(s.successRate * 100) + '%', `Clean days (${s.cleanDays}/${s.totalDays})`)}
        ${statBox(s.urges, 'Urges beaten')}
        ${c.cost ? statBox(Habits.money(s.saved, c.currency), 'Money saved') : ''}
        ${c.minutes ? statBox(Math.round(s.hoursBack) + 'h', 'Time reclaimed') : ''}
      </div>
      ${ins.lines.length ? section('Insights') + `<div class="card insight-list">${ins.lines.map((l) => `<div class="insight"><span class="ins-ic">${ICON[l.icon] || ICON.sparkle}</span><p>${l.text}</p></div>`).join('')}</div>` : ''}
      ${hist.length > 1 ? section('Streak history') + `<div class="card">${bars(hist.map((d) => Math.round(d * 10) / 10), hist.map((_, i) => i === hist.length - 1 ? 'Now' : '#' + (s.attempts - hist.length + i + 1)), { hi: hist.length - 1, fmt: (v) => (v >= 10 ? Math.round(v) : v) + 'd' })}</div>` : ''}
      ${patterns}
      ${section('Milestones', `<span class="small muted">${Habits.MILESTONES.filter((m) => s.bestDays >= m).length}/${Habits.MILESTONES.length}</span>`)}
      <div class="ms-grid">${Habits.MILESTONES.map((m) => { const got = s.bestDays >= m, rk = Habits.rankFor(m).rank; return `<div class="ms ${got ? 'got' : ''} ${mp.next === m ? 'next' : ''}" style="--rc:${rk.color}"><span class="ms-n">${m}</span><b>${Habits.milestoneName(m)}</b><small>+${Habits.milestoneXP(m)} XP</small></div>`; }).join('')}</div>
      ${log.length ? section('Slip log') + `<div class="card slip-log">${log.map((x) => `<div class="slip"><b>${fmtWhen(x.at)}</b>${x.trigger ? `<span class="pill">${esc(x.trigger)}</span>` : ''}${x.note ? `<p class="small muted">${esc(x.note)}</p>` : ''}</div>`).join('')}</div>` : ''}
      <div class="row" style="gap:8px;margin-top:18px"><a class="btn btn-sm" href="#/habit/${c.id}/edit">${ICON.edit} Edit</a></div>`,
      after() { celebrate(); }
    };
  }

  function rewardsPage() {
    const x = Habits.xpInfo(), ach = Habits.achievements();
    const P = [['practice', 'Practice minutes', 'wind'], ['clean', 'Clean days', 'flame'], ['milestones', 'Milestones', 'trophy'], ['challenges', 'Challenges', 'target'], ['urges', 'Urges beaten', 'shield'], ['checkins', 'Check-ins', 'calendar'], ['badges', 'Badges', 'star']];
    const LV = [[1, 'Novice'], [3, 'Seeker'], [5, 'Apprentice'], [8, 'Disciplined'], [12, 'Warrior'], [16, 'Master'], [20, 'Sage'], [25, 'Yogi'], [30, 'Enlightened']];
    return {
      tab: 'habits', title: 'Rewards', accent: 'var(--habits)', back: '#/habits',
      html: `
      <div class="page-head"><h1>Rewards</h1><p>XP comes from everything you do in Prana — practice, clean days, milestones, challenges, beaten urges and check-ins.</p></div>
      ${levelCard(x)}
      ${section('Where your XP comes from')}
      <div class="card xp-list">${P.map(([k, l, i]) => `<div class="xp-row"><span class="ins-ic">${ICON[i]}</span><span>${l}</span><b>${x.parts[k].toLocaleString()}</b></div>`).join('')}</div>
      <p class="small muted" style="margin:8px 4px 0">2 XP per practice minute · 10 XP per clean day · 15 XP per urge beaten (up to 5 a day) · 5 XP per check-in · bonuses for milestones, challenges and badges.</p>
      ${section('Badges', `<span class="small muted">${ach.filter((a) => a.got).length}/${ach.length}</span>`)}
      <div class="badge-grid">${ach.map(badgeTile).join('')}</div>
      ${section('Counter ranks')}
      <div class="card rank-ladder">${Habits.RANKS.map((rk) => `<div class="rank-row"><span class="rank-pill" style="--rc:${rk.color}">${esc(rk.name)}</span><span class="small muted">${rk.d ? rk.d + '+ days' : 'Start'}</span></div>`).join('')}</div>
      ${section('Level titles')}
      <div class="card rank-ladder">${LV.map(([l, t]) => `<div class="rank-row ${x.level >= l ? '' : 'locked'}"><b>${esc(t)}</b><span class="small muted">Level ${l}${x.level >= l ? ' ✓' : ''}</span></div>`).join('')}</div>`,
      after() { celebrate(); }
    };
  }

  // ---- sheets: urge SOS, slip, celebrations ------------------------------------------------
  function openSheet(inner, bind) {
    if ($('.sheet-backdrop')) return () => {};      // one sheet at a time
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const el = UI.h(`<div class="sheet-backdrop" role="dialog" aria-modal="true"><div class="sheet hb-sheet">${inner}</div></div>`);
    const close = () => el.remove();
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
    document.body.appendChild(el);
    if (bind) bind(el, close);
    return close;
  }
  function urgeSheet(c) {
    const s = Habits.stats(c);
    openSheet(`
      <div class="sos-head" style="--hc:${c.color}">${ICON.shield}<div><h2>Ride the wave</h2><p class="small muted">Urges rise, peak and pass — usually within 15 minutes.</p></div></div>
      <p class="sos-stake">You have <b>${s.currentDays ? plural(s.currentDays, 'day') : since(s.currentMs)}</b> on the line${s.bestDays > s.currentDays ? ` · best ${s.bestDays}d` : ''}.</p>
      ${c.why ? `<blockquote class="hb-why">“${esc(c.why)}”</blockquote>` : ''}
      <div class="sos-list">
        <button data-sos='{"kind":"breath","id":"sigh","minutes":2}'><span class="ins-ic">${ICON.wind}</span><span><b>Physiological sigh</b><small>2 min · the fastest way to calm down</small></span></button>
        <button data-sos='{"kind":"breath","id":"box","minutes":4}'><span class="ins-ic">${ICON.target}</span><span><b>Box breathing</b><small>4 min · steady, clear focus</small></span></button>
        <button data-sos='{"kind":"workout","id":"seven"}'><span class="ins-ic">${ICON.bolt}</span><span><b>7-minute workout</b><small>Burn the energy off</small></span></button>
      </div>
      <p class="small muted sos-tips">Or: splash cold water on your face · walk for 10 minutes · text a friend · leave the room you’re in.</p>
      <button class="btn btn-primary btn-block" data-sos-won style="--accent:${c.color}">💪 I beat this urge <span class="xp-tag light">+15 XP</span></button>
      <button class="btn btn-ghost btn-block" data-close style="margin-top:6px">Close</button>`, (el, close) => {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-sos]');
        if (b) {
          close();
          Play.start(JSON.parse(b.dataset.sos), { onDone: () => { Habits.urge(c.id, { sos: true }); toast('Urge beaten with your breath — +15 XP'); } });
          return;
        }
        if (e.target.closest('[data-sos-won]')) { Habits.urge(c.id); close(); toast('Urge beaten — +15 XP. That’s the muscle growing.'); Sound.success(); render(true); }
      });
    });
  }
  function slipSheet(c) {
    const s = Habits.stats(c);
    openSheet(`
      <h2>Slipped up?</h2>
      <p class="small muted" style="margin-top:4px">It happens. A slip is data, not a verdict. ${s.bestDays ? `Your best streak of <b>${plural(s.bestDays, 'day')}</b> stays on record.` : 'Every attempt teaches you something.'}</p>
      <div class="fl" style="margin-top:16px;font-weight:650">When?</div>
      <div class="seg hf-seg" data-slip-when style="margin-top:8px"><button type="button" data-v="now" class="active">Just now</button><button type="button" data-v="earlier">Earlier</button></div>
      <input class="input" type="datetime-local" data-slip-at hidden value="${toLocalInput(Date.now())}" min="${toLocalInput(s.start + 60e3)}" max="${toLocalInput(Date.now())}">
      <div class="fl" style="margin-top:14px;font-weight:650">What triggered it? <span class="hint" style="font-weight:500">optional — powers your insights</span></div>
      <div class="hf-chips" data-slip-trig style="margin-top:8px">${Habits.TRIGGERS.map((t) => `<button type="button" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <textarea class="input st-ta" data-slip-note maxlength="280" rows="2" placeholder="Anything you want to remember? (optional)" style="margin-top:12px;width:100%"></textarea>
      <button class="btn btn-block btn-danger" data-slip-go style="margin-top:14px">Reset counter</button>
      <button class="btn btn-ghost btn-block" data-close style="margin-top:6px">Cancel</button>`, (el, close) => {
      let when = 'now', trig = '';
      el.addEventListener('click', (e) => {
        const w = e.target.closest('[data-slip-when] button');
        if (w) { when = w.dataset.v; $$('[data-slip-when] button', el).forEach((x) => x.classList.toggle('active', x === w)); $('[data-slip-at]', el).hidden = when !== 'earlier'; return; }
        const t = e.target.closest('[data-slip-trig] button');
        if (t) { trig = trig === t.dataset.v ? '' : t.dataset.v; $$('[data-slip-trig] button', el).forEach((x) => x.classList.toggle('on', x.dataset.v === trig)); return; }
        if (e.target.closest('[data-slip-go]')) {
          let at = Date.now();
          if (when === 'earlier') { const v = $('[data-slip-at]', el).value; if (v) at = new Date(v).getTime(); }
          const res = Habits.slip(c.id, { at, trigger: trig, note: $('[data-slip-note]', el).value });
          close();
          toast(res && res.best ? `Fresh start. Your best is ${plural(res.best, 'day')} — let’s beat it.` : 'Fresh start. You’ve got this.');
          render(true);
        }
      });
    });
  }

  /** Edit your name from anywhere (Today's greeting). */
  function nameSheet() {
    openSheet(`
      <h2>What should we call you?</h2>
      <p class="small muted" style="margin-top:4px">Used in your greeting. Leave empty to stay anonymous.</p>
      <form data-name-form style="margin-top:14px">
        <input class="input" name="n" maxlength="40" autocomplete="given-name" enterkeyhint="done" placeholder="Your name" value="${esc(Store.data.profile.name)}" style="width:100%;height:50px;font-size:17px">
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:12px">Save</button>
      </form>
      <button class="btn btn-ghost btn-block" data-close style="margin-top:6px">Cancel</button>`, (el, close) => {
      const input = $('[name="n"]', el);
      setTimeout(() => { input.focus(); input.select(); }, 60);
      $('[data-name-form]', el).addEventListener('submit', (e) => {
        e.preventDefault();
        Store.data.profile.name = input.value.trim().slice(0, 40); Store.save();
        close(); render(true); toast(Store.data.profile.name ? `Nice to meet you, ${Store.data.profile.name}` : 'Name removed');
      });
    });
  }

  let celebrating = false;
  /** Discreet counters only hide their name on the Today screen. */
  const hideName = (c) => !!(c && c.private && /^#?\/?$/.test(location.hash));
  /** Show the biggest new reward (milestone, badge, challenge, level) with confetti. */
  function celebrate() {
    if (celebrating || Play.active || !window.Habits) return;
    const ev = Habits.pending();
    if (!ev.length) return;
    const show = ev.filter((e) => !e.hidden);
    Habits.markSeen(ev.map((e) => e.key));
    if (!show.length) return;
    celebrating = true;
    const top = show[0], more = show.slice(1, 4);
    const COLORS = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff', '#ff8fab', '#f9844a'];
    const conf = Array.from({ length: 46 }, (_, i) => `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${COLORS[i % COLORS.length]};animation-delay:${(Math.random() * 0.6).toFixed(2)}s;animation-duration:${(2.2 + Math.random() * 1.6).toFixed(2)}s;transform:rotate(${Math.round(Math.random() * 360)}deg)"></i>`).join('');
    let badge, title, sub;
    if (top.type === 'milestone') {
      badge = `<div class="cel-badge" style="--rc:${top.rank.color}"><b>${top.days}</b><small>${top.days === 1 ? 'DAY' : 'DAYS'}</small></div>`;
      title = top.title + '!';
      sub = `${hideName(top.c) ? 'Your counter' : esc(top.c.name)} · rank <b>${esc(top.rank.name)}</b>`;
    } else if (top.type === 'level') {
      badge = `<div class="cel-badge" style="--rc:#8a63f0"><small>LEVEL</small><b>${top.level}</b></div>`;
      title = 'Level up!'; sub = `You’re now a <b>${esc(top.levelTitle)}</b>`;
    } else {
      badge = `<div class="cel-badge" style="--rc:${top.type === 'challenge' ? '#12a594' : '#d4a017'}">${ICON[top.type === 'challenge' ? 'target' : top.icon] || ICON.star}</div>`;
      title = top.type === 'challenge' ? 'Challenge complete!' : 'Badge unlocked!';
      sub = top.type === 'challenge' ? `${esc(top.title)}${top.c && !hideName(top.c) ? ' · ' + esc(top.c.name) : ''}` : `<b>${esc(top.title)}</b> — ${esc(top.desc)}`;
    }
    const el = UI.h(`<div class="cel-backdrop" role="dialog" aria-modal="true" aria-label="Reward">
      <div class="confetti">${conf}</div>
      <div class="cel-card">
        ${badge}
        <h2>${title}</h2>
        <p>${sub}</p>
        ${top.xp ? `<div class="xp-tag big">+${top.xp} XP</div>` : ''}
        ${more.length ? `<div class="cel-more">${more.map((m) => `<span class="pill">${esc(m.type === 'milestone' ? m.title + ' · ' + (hideName(m.c) ? 'counter' : m.c.name) : m.title)}${m.xp ? ' · +' + m.xp + ' XP' : ''}</span>`).join('')}</div>` : ''}
        <p class="small cel-line">${esc(Habits.lineOfDay(1))}</p>
        <button class="btn btn-primary btn-block" data-cel-close style="--accent:#e0457b">Keep going</button>
      </div></div>`);
    const close = () => { el.remove(); celebrating = false; if (/^#\/(habits|habit\/|rewards|$)/.test(location.hash || '#/')) render(true); };
    el.addEventListener('click', (e) => { if (e.target.closest('[data-cel-close]') || e.target === el) close(); });
    document.body.appendChild(el);
    Sound.success(); Sound.vibrate([30, 50, 30, 50, 80]);
    setTimeout(() => { const b = $('[data-cel-close]', el); if (b) b.focus(); }, 50);
  }

  /** Counter chips on the Today screen. */
  function todayHabits() {
    const cs = Habits.list();
    if (!cs.length) return `<a class="card hb-promo" href="#/habits"><span class="hb-ic" style="--hc:var(--habits)">${ICON.shield}</span><div style="flex:1;min-width:0"><b>Quit a habit for good</b><span class="small muted" style="display:block">No fap, no porn, alcohol, smoking, sugar, social media… track your streak and earn rewards.</span></div><span class="chev">${ICON.chev}</span></a>`;
    return `${section('Your counters', '<a href="#/habits">Open</a>')}<div class="hb-strip">${cs.map((c) => { const s = Habits.stats(c); return `<a class="hb-chip" href="#/habit/${c.id}" style="--hc:${c.color}"><span class="hb-ic">${c.private ? ICON.lock : hIcon(c)}</span><span><b data-tick-days="${s.start}">${s.currentDays}</b><small> ${s.currentDays === 1 ? 'day' : 'days'}</small></span><em>${c.private ? 'Private' : esc(c.name)}</em></a>`; }).join('')}${Habits.checkedInToday() ? '' : `<a class="hb-chip ci-chip" href="#/habits"><span class="hb-ic" style="--hc:var(--habits)">${ICON.check}</span><span><b>Check in</b></span><em>+5 XP</em></a>`}</div>`;
  }

  // live counters: tick every second, re-render when a day rolls over
  setInterval(() => {
    const now = Date.now();
    $$('[data-tick]').forEach((el) => { el.innerHTML = since(now - +el.dataset.tick, el.dataset.fmt === 'long'); });
    let stale = false;
    $$('[data-tick-days]').forEach((el) => { if (Math.floor((now - +el.dataset.tickDays) / DAYMS) !== +el.textContent) stale = true; });
    if (stale && !Play.active && !$('.sheet-backdrop') && !$('.cel-backdrop') && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { render(true); celebrate(); }
  }, 1000);

  // ---------------------------------------------------------------------------
  // Programs
  // ---------------------------------------------------------------------------
  function programsList() {
    const cards = Content.PROGRAMS.map((p) => {
      const s = Store.program(p.id);
      return sCard({ href: '#/program/' + p.id, icon: p.icon, title: p.name, sub: p.tag, accent: UI.CAT_COLOR[p.cat], meta: [{ t: p.days + ' days', icon: 'calendar' }].concat(s ? [{ t: `${s.done.length}/${p.days} done`, accent: true }] : [{ t: UI.CAT_LABEL[p.cat] }]) });
    }).join('');
    return { tab: 'today', title: 'Programs', back: '#/', html: `<div class="page-head"><h1>Programs</h1><p>Multi-day challenges that build a habit, one day at a time. Consistency beats intensity.</p></div>${cards}` };
  }

  function programDetail(id) {
    const p = Content.program(id); if (!p) return notFound();
    const s = Store.program(id);
    const next = Store.nextProgramDay(id, p.days);
    const todayK = Store.dayKey();
    let grid = '';
    for (let d = 1; d <= p.days; d++) {
      const done = s && s.done.includes(d);
      const isNext = s && d === next;
      grid += `<button class="dg ${done ? 'done' : ''} ${isNext ? 'next' : ''}" data-pday="${d}" style="border:0" aria-label="Day ${d}${done ? ' completed' : ''}">${done ? ICON.check : d}</button>`;
    }
    let cta;
    if (!s) cta = `<button class="btn btn-primary" data-join="${id}">${ICON.calendar} Join · start Day 1</button>`;
    else if (!next) cta = `<button class="btn btn-primary" data-leave="${id}">${ICON.repeat} Completed — restart program</button>`;
    else {
      const desc = p.day(next);
      const lbl = p.label ? p.label(next, desc) : Play.describe(desc).title;
      cta = `<button class="btn btn-primary" data-pstart="${next}">${ICON.play} Day ${next}: ${esc(lbl)}${s.last === todayK ? ' (bonus)' : ''}</button>`;
    }
    const preview = s && next ? (() => { const d = Play.describe(p.day(next)); return `${section(`Day ${next}`, s.last === todayK ? '<span class="small muted">Today’s day is done ✓</span>' : '')}${sCard({ title: d.title, sub: d.sub, icon: d.icon, accent: UI.CAT_COLOR[d.cat], href: d.href || undefined, meta: [{ t: '~' + d.min + ' min', icon: 'clock' }] })}`; })() : '';
    return {
      tab: 'today', title: p.name, accent: UI.CAT_COLOR[p.cat], back: '#/programs',
      html: `
      <div class="detail-title" style="margin-top:6px"><div class="eyebrow">${p.days}-day program</div><h1>${esc(p.name)}</h1><p>${esc(p.about)}</p></div>
      ${s ? `<div class="card" style="margin-top:16px"><div class="row between"><b>${s.done.length} of ${p.days} days</b><span class="small muted">started ${Store.parseDay(s.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div><div class="prog-bar" style="margin-top:10px"><i style="width:${(100 * s.done.length / p.days).toFixed(1)}%"></i></div></div>` : ''}
      ${preview}
      ${section('Days')}<div class="day-grid">${grid}</div>
      <p class="small muted" style="margin-top:10px">Tap any day to preview it. One day per calendar day keeps the habit going — but you can always do a bonus day.</p>
      ${s ? `<button class="btn btn-ghost btn-sm" data-leave="${id}" style="margin-top:10px;color:var(--muted)">Leave program</button>` : ''}
      <div class="sticky-cta">${cta}</div>`,
      after(root) {
        root.addEventListener('click', (e) => {
          const j = e.target.closest('[data-join]');
          if (j) { Store.joinProgram(id); toast('Program joined — Day 1 is ready'); render(); return; }
          const l = e.target.closest('[data-leave]');
          if (l) { if (confirm('Reset this program? Your logged sessions stay in your history.')) { Store.leaveProgram(id); render(); } return; }
          const ps = e.target.closest('[data-pstart]');
          if (ps) { const d = +ps.dataset.pstart; Play.start(p.day(d), { title: `${p.name} · Day ${d}`, onDone: () => Store.completeProgramDay(id, d) }); return; }
          const pd = e.target.closest('[data-pday]');
          if (pd) { const d = +pd.dataset.pday; const desc = p.day(d); const ds = Play.describe(desc); toast(`Day ${d}: ${p.label ? p.label(d, desc) : ds.title}`); }
        });
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Progress
  // ---------------------------------------------------------------------------
  function achievements() {
    const t = Store.totals(), best = Store.bestStreak(), log = Store.data.log;
    const cnt = (c) => (t.byCat[c] || { n: 0 }).n;
    const days = {};
    log.forEach((s) => { (days[s.day] = days[s.day] || new Set()).add(s.cat === 'challenge' ? 'breathe' : s.cat); });
    const allRound = Object.values(days).some((set) => ['breathe', 'move', 'yoga', 'mind'].every((c) => set.has(c)));
    const hours = log.map((s) => new Date(s.at).getHours());
    const finishedProgram = Content.PROGRAMS.some((p) => { const s = Store.program(p.id); return s && s.done.length >= p.days; });
    return [
      ['First Breath', 'Complete a session', t.sessions >= 1, 'sparkle'],
      ['On a Roll', '3-day streak', best >= 3, 'flame'],
      ['Week Strong', '7-day streak', best >= 7, 'flame'],
      ['Habit Formed', '21-day streak', best >= 21, 'flame'],
      ['Unbreakable', '50-day streak', best >= 50, 'flame'],
      ['First Hour', '60 minutes total', t.minutes >= 60, 'clock'],
      ['Devoted', '5 hours total', t.minutes >= 300, 'clock'],
      ['Breathwork Fan', '10 breath sessions', cnt('breathe') + cnt('challenge') >= 10, 'wind'],
      ['Mover', '10 workouts', cnt('move') >= 10, 'move'],
      ['Yogi', '10 yoga sessions', cnt('yoga') >= 10, 'lotus'],
      ['Still Mind', '10 meditations', cnt('mind') >= 10, 'moon'],
      ['All-Rounder', 'All 4 practices in a day', allRound, 'star'],
      ['Early Bird', 'Practise before 7 am', hours.some((h) => h < 7 && h >= 4), 'sun'],
      ['Night Owl', 'Practise after 10 pm', hours.some((h) => h >= 22), 'moon'],
      ['Calm Lungs', 'BOLT score of 25s+', (Store.pb('bolt') || 0) >= 25, 'stopwatch'],
      ['Deep Diver', '2-minute breath hold', (Store.pb('maxHold') || 0) >= 120 || (Store.pb('powerHold') || 0) >= 120, 'target'],
      ['Finisher', 'Complete a program', finishedProgram, 'trophy']
    ];
  }

  function progress() {
    const t = Store.totals(), byDay = Store.minutesByDay(), todayK = Store.dayKey(), goal = S().goal;
    // last 7 days bars
    const vals = [];
    for (let i = 6; i >= 0; i--) { const k = Store.addDays(todayK, -i); vals.push([k, byDay[k] || 0]); }
    const maxV = Math.max(goal, ...vals.map((v) => v[1]));
    const bars = vals.map(([k, v]) => `<div class="bar"><em>${v ? Math.round(v) : ''}</em><i class="${v ? '' : 'zero'}" style="height:${Math.max(3, (v / maxV) * 100)}%"></i><span>${'SMTWTFS'[Store.parseDay(k).getDay()]}</span></div>`).join('');
    const week = vals.reduce((a, v) => a + v[1], 0);
    // heatmap: 17 weeks ending this week (columns = weeks, Sun..Sat rows)
    const weeks = 17, startD = Store.parseDay(todayK);
    startD.setDate(startD.getDate() - startD.getDay() - (weeks - 1) * 7);
    let heat = '';
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(startD); d.setDate(startD.getDate() + i);
      const k = Store.dayKey(d), v = byDay[k] || 0;
      const lvl = k > todayK ? 'future' : v === 0 ? '' : v < goal * 0.5 ? 'l1' : v < goal ? 'l2' : v < goal * 2 ? 'l3' : 'l4';
      heat += `<i class="${lvl}" title="${k}: ${Math.round(v)} min"></i>`;
    }
    const cats = ['breathe', 'challenge', 'move', 'yoga', 'mind'];
    const maxCat = Math.max(1, ...cats.map((c) => (t.byCat[c] || { min: 0 }).min));
    const split = cats.map((c) => { const v = t.byCat[c] || { n: 0, min: 0 }; return `<div class="split-row" style="--accent:${UI.CAT_COLOR[c]}"><span>${UI.CAT_LABEL[c].replace('Breath challenge', 'Challenges')}</span><div class="prog-bar"><i style="width:${(100 * v.min / maxCat).toFixed(1)}%"></i></div><span>${Math.round(v.min)}m</span></div>`; }).join('');
    const pbs = Object.keys(Play.RESULT_META).filter((k) => Store.pb(k) != null).map((k) => {
      const m = Play.RESULT_META[k], h = Store.data.hist[k] || [];
      const first = h.length ? h[0].v : null;
      const delta = first != null && h.length > 1 ? Store.pb(k) - first : 0;
      return `<a class="pb-row" href="#/challenge/${m.ch}"><div><div style="font-weight:650">${esc(m.label)}</div><div class="small muted">${h.length} test${h.length === 1 ? '' : 's'}${delta > 0 ? ` · +${delta}${m.unit} since first` : ''}</div></div><b>${Store.pb(k)}${esc(m.unit)}</b></a>`;
    }).join('');
    const badges = achievements().map(([n, d, ok, ic]) => `<div class="badge ${ok ? '' : 'locked'}"><div class="bi">${ok ? (ICON[ic] || ICON.trophy) : ICON.lock}</div><b>${esc(n)}</b><span>${esc(d)}</span></div>`).join('');
    const recent = Store.data.log.slice(-12).reverse().map((s) => `<div class="log-row"><span class="dotc" style="background:${UI.CAT_COLOR[s.cat] || 'var(--muted)'}"></span><div style="flex:1;min-width:0"><div style="font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.title)}</div><div class="small muted">${new Date(s.at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div></div><span class="small" style="font-weight:700">${fmtMin(s.sec)}</span></div>`).join('');
    return {
      tab: null, title: 'Progress', back: '#/',
      html: `
      <div class="page-head"><h1>Progress</h1><p>Every minute counts. Here is your practice at a glance.</p></div>
      <div class="stats">
        <div class="stat"><b>${Store.streak()}</b><span>day streak</span></div>
        <div class="stat"><b>${Store.bestStreak()}</b><span>best streak</span></div>
        <div class="stat"><b>${Math.round(t.minutes)}</b><span>total minutes</span></div>
        <div class="stat"><b>${t.sessions}</b><span>sessions</span></div>
      </div>
      ${section('Last 7 days', `<span class="small muted">${Math.round(week)} min · goal ${goal}/day</span>`)}
      <div class="card"><div class="bars">${bars}</div></div>
      ${section('Consistency', '<span class="small muted">last 17 weeks</span>')}
      <div class="card"><div class="heat">${heat}</div><div class="row small muted" style="margin-top:10px;gap:6px">Less <span class="heat" style="display:flex;gap:3px"><i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i></span> More</div></div>
      ${section('By practice')}
      <div class="card">${split}</div>
      ${section('Personal bests')}
      <div class="card" style="padding:4px 16px">${pbs || '<p class="small muted" style="padding:12px 0">Take a breath challenge (like the BOLT test) to start tracking personal bests.</p>'}</div>
      ${section('Achievements', `<span class="small muted">${achievements().filter((a) => a[2]).length}/${achievements().length}</span>`)}
      <div class="badges">${badges}</div>
      ${section('Recent sessions')}
      <div class="card" style="padding:4px 16px">${recent || '<p class="small muted" style="padding:12px 0">No sessions yet — your history will appear here.</p>'}</div>`
    };
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  function settings() {
    const s = S();
    const sw = (key, label, hint) => `<div class="field"><div><label for="sw_${key}">${label}</label>${hint ? `<div class="hint">${hint}</div>` : ''}</div><label class="switch"><input type="checkbox" id="sw_${key}" data-set="${key}" ${s[key] ? 'checked' : ''}><span></span></label></div>`;
    const voices = Sound.voices.filter((v) => /^en/i.test(v.lang));
    return {
      tab: null, title: 'Settings', back: '#/',
      html: `
      <div class="page-head"><h1>Settings</h1></div>
      ${accountCard()}
      ${Library.isAdmin() ? studioCard() : ''}
      ${PWA.standalone() ? '' : `<div class="card" style="padding:4px 16px;margin-bottom:12px"><div class="field"><div><label>Install app</label><div class="hint">Home-screen app that works offline</div></div><button class="btn btn-sm btn-primary" data-install style="--accent:var(--breathe)">${ICON.download} Install</button></div></div>`}
      <div class="card" style="padding:4px 16px">
        <div class="field"><label for="setName">Your name</label><input class="input" id="setName" value="${esc(Store.data.profile.name)}" placeholder="Add your name" autocomplete="given-name" enterkeyhint="done" maxlength="40" style="max-width:180px"></div>
        <div class="field" style="display:block"><label>Daily goal</label><div style="margin-top:10px">${picker('goal', [5, 10, 15, 20, 30, 45, 60], s.goal, (v) => v + ' min')}</div></div>
      </div>
      ${section('Guidance')}
      <div class="card" style="padding:4px 16px">
        ${sw('voice', 'Voice guidance', Sound.hasTTS ? 'Spoken cues during sessions' : 'Not supported in this browser')}
        ${voices.length ? `<div class="field"><label for="setVoice">Voice</label><select class="input" id="setVoice" style="max-width:200px"><option value="">Automatic</option>${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === s.voiceURI ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>` : ''}
        ${sw('sound', 'Sounds', 'Breath tones, bells and beeps')}
        ${sw('ambient', 'Ambient sound', 'Soft drone or rain during meditation')}
        ${sw('vibrate', 'Vibration', 'Haptic cues on supported phones')}
        ${sw('pip', 'Two camera angles', 'Show every move from the side and the front at the same time')}
        <div class="field"><label>Test</label><button class="btn btn-sm" id="testVoice">${ICON.volume} Play sample</button></div>
      </div>
      ${section('Appearance')}
      <div class="card" style="padding:4px 16px">
        <div class="field"><label for="setTheme">Theme</label><select class="input" id="setTheme"><option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Match system</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option></select></div>
      </div>
      ${section('Daily reminder')}
      <div class="card" style="padding:4px 16px">
        <div class="field"><div><label for="setRem">Practice time</label><div class="hint">Adds a repeating daily event with an alert to your calendar app.</div></div><input type="time" class="input" id="setRem" value="${esc(s.reminder)}"></div>
        <div class="field"><span></span><button class="btn btn-sm btn-primary" id="addCal" style="--accent:var(--breathe)">${ICON.calendar} Add to calendar</button></div>
      </div>
      ${section('Your data')}
      <div class="card" style="padding:4px 16px">
        <div class="field"><div><label>Backup</label><div class="hint">${Sync.user ? 'Stored on this device and synced to your account' : 'Everything is stored only on this device'}</div></div><button class="btn btn-sm" id="exportBtn">${ICON.download} Export</button></div>
        <div class="field"><label>Restore</label><label class="btn btn-sm" style="cursor:pointer">${ICON.upload} Import<input type="file" id="importFile" accept="application/json,.json" hidden></label></div>
        <div class="field"><label>Reset</label><button class="btn btn-sm btn-danger" id="resetBtn">Erase all data</button></div>
      </div>
      ${section('Share & about')}
      <div class="card" style="padding:4px 16px">
        <div class="field"><div><label>Share Prana</label><div class="hint">Send it to a friend — it’s free</div></div><button class="btn btn-sm btn-primary" data-share style="--accent:var(--breathe)">${ICON.heart} Share</button></div>
        ${/Android/i.test(navigator.userAgent) && !IN_TWA ? `<div class="field"><div><label>Android app</label><div class="hint">Install the app from a file</div></div><a class="btn btn-sm" href="${APK_URL}">${ICON.download} Get APK</a></div>` : ''}
        <div class="field"><label>Privacy policy</label><a class="btn btn-sm" href="privacy.html">Read</a></div>
      </div>
      <p class="small muted" style="margin:18px 4px">Prana offers general wellness guidance and is not a substitute for medical advice. Consult a qualified professional before starting a new exercise or breathing practice, especially if you are pregnant or have a heart, respiratory, blood-pressure or seizure condition.</p>`,
      after(root) {
        // Save as you type (phones often leave the page without "committing" the field).
        const nameIn = $('#setName', root);
        const saveName = () => { const v = nameIn.value.trim().slice(0, 40); if (v !== Store.data.profile.name) { Store.data.profile.name = v; Store.save(); } };
        nameIn.addEventListener('input', saveName);
        nameIn.addEventListener('change', () => { saveName(); toast(nameIn.value.trim() ? 'Name saved' : 'Name removed'); });
        nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameIn.blur(); });
        $$('[data-set]', root).forEach((i) => i.addEventListener('change', () => { s[i.dataset.set] = i.checked; Store.save(); }));
        const sv = $('#setVoice', root); if (sv) sv.addEventListener('change', () => { s.voiceURI = sv.value; Store.save(); Sound.speak('Breathe in… and breathe out.'); });
        $('#testVoice', root).addEventListener('click', () => { Sound.unlock(); Sound.bell(); setTimeout(() => Sound.speak('Welcome to Prana. Breathe in… and breathe out.'), 400); });
        $('#setTheme', root).addEventListener('change', (e) => { s.theme = e.target.value; Store.save(); applyTheme(); });
        $('#setRem', root).addEventListener('change', (e) => { s.reminder = e.target.value; Store.save(); });
        $('#addCal', root).addEventListener('click', () => { UI.download('prana-daily-practice.ics', makeICS(s.reminder), 'text/calendar'); toast('Open the downloaded file to add it to your calendar'); });
        $('#exportBtn', root).addEventListener('click', () => UI.download(`prana-backup-${Store.dayKey()}.json`, Store.exportJSON(), 'application/json'));
        $('#importFile', root).addEventListener('change', async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try { Store.importJSON(await f.text()); applyTheme(); toast('Backup restored'); render(); } catch (err) { toast('Could not import: ' + err.message); }
        });
        $('#resetBtn', root).addEventListener('click', () => { if (confirm(Sync.user ? 'Erase all sessions, results, programs and settings on this device AND in your account (on all your synced devices)? This cannot be undone.' : 'Erase all sessions, results, programs and settings on this device? This cannot be undone.')) { Store.reset(); applyTheme(); location.hash = '#/'; render(); } });
      }
    };
  }

  function makeICS(time) {
    const [hh, mm] = (time || '07:30').split(':');
    const d = new Date(); d.setDate(d.getDate() + 1);
    const p = (n) => String(n).padStart(2, '0');
    const dt = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(hh)}${p(mm)}00`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prana//Daily Practice//EN', 'BEGIN:VEVENT', `UID:prana-daily-${Date.now()}@prana.local`, `DTSTAMP:${stamp}`, `DTSTART:${dt}`, 'DURATION:PT15M', 'RRULE:FREQ=DAILY',
      'SUMMARY:Prana — breathe, move, meditate', 'DESCRIPTION:A few minutes of practice keeps your streak alive.', 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Time for your Prana practice', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  // ---------------------------------------------------------------------------
  // Account & sync
  // ---------------------------------------------------------------------------
  function syncStatusText() {
    const s = Sync.state;
    if (s.status === 'syncing') return 'Syncing…';
    if (s.status === 'offline') return 'Offline — will sync when you’re back online';
    if (s.status === 'error') return 'Sync problem: ' + (s.error || 'unknown error');
    if (s.lastSync) {
      const m = Math.round((Date.now() - s.lastSync) / 60000);
      return 'Synced ' + (m < 1 ? 'just now' : m < 60 ? m + ' min ago' : new Date(s.lastSync).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }));
    }
    return 'Sync on';
  }

  function account() {
    const base = { tab: null, title: 'Account', back: '#/settings' };
    if (!Sync.enabled) return Object.assign(base, { html: '<div class="page-head"><h1>Account</h1><p>Accounts aren’t switched on for this copy of Prana yet.</p></div>' });
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    if (!Sync.ready) {
      return Object.assign(base, {
        html: '<div class="page-head"><h1>Account</h1><p class="muted" data-acc-loading>Connecting…</p></div>',
        after(root) {
          Sync.getClient().then(() => { if (current && current.title === 'Account') render(true); })
            .catch((e) => { const p = $('[data-acc-loading]', root); if (p) p.textContent = e.message; });
        }
      });
    }
    const u = Sync.user;
    if (u && params.has('reset')) {
      return Object.assign(base, {
        html: `<div class="page-head"><h1>Choose a new password</h1><p>For ${esc(u.email)}</p></div>
        <form class="card auth-form" id="pwForm" novalidate>
          <label class="fl">New password<input class="input" type="password" name="password" autocomplete="new-password" minlength="8" required></label>
          <div class="form-msg" role="alert"></div>
          <button class="btn btn-primary btn-block" type="submit">Save password</button>
        </form>`,
        after(root) { bindPwForm(root, () => { toast('Password updated'); location.hash = '#/account'; }); }
      });
    }
    if (u) {
      const initial = (u.email || '?')[0].toUpperCase();
      return Object.assign(base, {
        html: `
        <div class="page-head"><h1>Account</h1></div>
        <div class="card">
          <div class="row" style="gap:14px"><div class="avatar">${esc(initial)}</div><div style="min-width:0"><b style="word-break:break-all">${esc(u.email)}</b><div class="small muted" data-sync-status>${esc(syncStatusText())}</div></div></div>
          <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap"><button class="btn btn-sm btn-primary" data-acc="sync">${ICON.repeat} Sync now</button><button class="btn btn-sm" data-acc="signout">Sign out</button></div>
        </div>
        <p class="small muted" style="margin:12px 4px">Your sessions, streaks, personal bests, programs and settings sync automatically across every device signed in to this account. Everything keeps working offline and syncs when you reconnect.</p>
        ${section('Change password')}
        <form class="card auth-form" id="pwForm" novalidate>
          <label class="fl">New password<input class="input" type="password" name="password" autocomplete="new-password" minlength="8" required></label>
          <div class="form-msg" role="alert"></div>
          <button class="btn btn-block" type="submit">Update password</button>
        </form>
        ${section('Delete account')}
        <div class="card"><p class="small muted">Permanently deletes your account and the copy of your data stored in the cloud. Data on this device is kept. This can’t be undone.</p><button class="btn btn-sm btn-danger" data-acc="delete" style="margin-top:12px">Delete my account</button></div>`,
        after(root) {
          bindPwForm(root, () => { toast('Password updated'); $('#pwForm input', root).value = ''; });
          root.addEventListener('click', async (e) => {
            const b = e.target.closest('[data-acc]'); if (!b) return;
            const act = b.dataset.acc;
            try {
              if (act === 'sync') { await Sync.syncNow(); toast(Sync.state.status === 'error' ? Sync.state.error : 'Synced'); }
              else if (act === 'signout') {
                if (!confirm('Sign out? Your progress is saved to your account and removed from this device. Sign in again to get it back.')) return;
                b.disabled = true; await Sync.signOut(); toast('Signed out'); location.hash = '#/settings';
              } else if (act === 'delete') {
                const typed = prompt('This permanently deletes your Prana account and its cloud data. Type DELETE to confirm.');
                if (typed !== 'DELETE') return;
                b.disabled = true; await Sync.deleteAccount(); toast('Account deleted'); location.hash = '#/settings';
              }
            } catch (err) { b.disabled = false; toast(err.message); }
          });
        }
      });
    }
    const mode = st.authMode || 'signin';
    const err = params.get('error');
    return Object.assign(base, {
      html: `
      <div class="page-head"><h1>${mode === 'signup' ? 'Create your account' : 'Sign in'}</h1><p>Keep your streaks, personal bests and programs in sync on every device.</p></div>
      <div class="seg" data-seg="authMode"><button class="${mode === 'signin' ? 'active' : ''}" data-v="signin">Sign in</button><button class="${mode === 'signup' ? 'active' : ''}" data-v="signup">Create account</button></div>
      <form class="card auth-form" id="authForm" novalidate>
        <label class="fl">Email<input class="input" type="email" name="email" autocomplete="email" inputmode="email" required></label>
        <label class="fl">Password<input class="input" type="password" name="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" minlength="${mode === 'signup' ? 8 : 1}" required>${mode === 'signup' ? '<span class="hint">At least 8 characters</span>' : ''}</label>
        <div class="form-msg ${err ? 'err' : ''}" role="alert">${err ? esc(err) : ''}</div>
        <button class="btn btn-primary btn-block" type="submit">${mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        ${mode === 'signin' ? '<button type="button" class="link center-link" data-acc="forgot">Forgot password?</button>' : ''}
      </form>
      <div class="or-row"><span>or</span></div>
      <button class="btn btn-block" data-acc="magic">${ICON.sparkle} Email me a sign-in link</button>
      <p class="small muted" style="margin:14px 4px">Progress already on this device will be added to your account.</p>`,
      after(root) {
        const form = $('#authForm', root), msg = $('.form-msg', form);
        const say = (t, ok) => { msg.textContent = t; msg.className = 'form-msg ' + (ok ? 'ok' : 'err'); };
        const email = () => form.email.value.trim();
        const validEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email());
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!validEmail()) return say('Enter a valid email address.');
          const pw = form.password.value;
          if (mode === 'signup' && pw.length < 8) return say('Password must be at least 8 characters.');
          if (!pw) return say('Enter your password.');
          const btn = $('button[type=submit]', form); btn.disabled = true; say('', true);
          try {
            if (mode === 'signup') {
              const r = await Sync.signUp(email(), pw);
              if (r.needsConfirm) say(`Almost done! We sent a confirmation link to ${email()}. Open it on this device to finish.`, true);
              else { toast('Account created — syncing your progress'); location.hash = '#/account'; }
            } else {
              await Sync.signIn(email(), pw);
              toast('Signed in — syncing your progress'); location.hash = '#/account';
            }
          } catch (er) { say(er.message); } finally { btn.disabled = false; }
        });
        root.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-acc]'); if (!b) return;
          if (!validEmail()) { say('Enter your email address first.'); form.email.focus(); return; }
          b.disabled = true;
          try {
            if (b.dataset.acc === 'magic') { await Sync.magicLink(email()); say(`Check your inbox — we sent a sign-in link to ${email()}.`, true); }
            else if (b.dataset.acc === 'forgot') { await Sync.resetPassword(email()); say(`If an account exists for ${email()}, a password-reset link is on its way.`, true); }
          } catch (er) { say(er.message); } finally { b.disabled = false; }
        });
      }
    });
  }
  function bindPwForm(root, onOk) {
    const f = $('#pwForm', root); if (!f) return;
    const msg = $('.form-msg', f);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw = f.password.value;
      if (pw.length < 8) { msg.textContent = 'Password must be at least 8 characters.'; msg.className = 'form-msg err'; return; }
      const b = $('button[type=submit]', f); b.disabled = true;
      try { await Sync.updatePassword(pw); onOk(); } catch (er) { msg.textContent = er.message; msg.className = 'form-msg err'; } finally { b.disabled = false; }
    });
  }
  function accountCard() {
    if (!Sync.enabled) return '';
    const u = Sync.user;
    if (u) return `<a class="card account-card" href="#/account"><div class="avatar">${esc((u.email || '?')[0].toUpperCase())}</div><div style="flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis">${esc(u.email)}</b><span class="small muted" data-sync-status>${esc(syncStatusText())}</span></div><span class="chev">${ICON.chev}</span></a>`;
    return `<a class="card account-card" href="#/account"><div class="avatar">${ICON.repeat}</div><div style="flex:1"><b>Sign in to sync</b><span class="small muted" style="display:block">Your progress on all your devices</span></div><span class="chev">${ICON.chev}</span></a>`;
  }

  function notFound() { return { tab: null, title: 'Not found', back: '#/', html: '<div class="page-head"><h1>Not found</h1><p>That page doesn’t exist.</p></div><a class="btn" href="#/">Go home</a>' }; }

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------
  const routes = [
    [/^\/?$/, today], [/^\/breathe$/, breatheList], [/^\/breathe\/([\w-]+)$/, breathDetail], [/^\/challenge\/([\w-]+)$/, challengeDetail],
    [/^\/move$/, moveList], [/^\/workout\/([\w-]+)$/, workoutDetail], [/^\/exercise\/([\w-]+)$/, exerciseDetail],
    [/^\/yoga$/, yogaList], [/^\/flow\/([\w-]+)$/, flowDetail], [/^\/pose\/([\w-]+)$/, poseDetail],
    [/^\/mind$/, mindList], [/^\/meditation\/([\w-]+)$/, medDetail], [/^\/audio\/([\w-]+)$/, audioDetail], [/^\/studio$/, studio],
    [/^\/habits$/, habitsHome], [/^\/habits\/new$/, habitNew], [/^\/habit\/([\w-]+)$/, habitDetail], [/^\/habit\/([\w-]+)\/edit$/, habitEdit], [/^\/rewards$/, rewardsPage],
    [/^\/programs$/, programsList], [/^\/program\/([\w-]+)$/, programDetail],
    [/^\/progress$/, progress], [/^\/settings$/, settings], [/^\/account$/, account]
  ];
  let current = null, navCount = 0;

  function render(keepScroll) {
    const y = window.scrollY;
    Figure.destroyAll();
    const path = (location.hash.slice(1) || '/').split('?')[0];
    let v = null;
    for (const [re, fn] of routes) { const m = path.match(re); if (m) { v = fn(m[1]); break; } }
    if (!v) v = notFound();
    if (!Store.data.profile.onboarded && path !== '/' && path !== '/account') { v = onboarding(); }
    current = v;
    view.style.setProperty('--accent', v.accent || 'var(--breathe)');
    view.innerHTML = v.html;
    view.classList.remove('view-enter'); void view.offsetWidth; if (!keepScroll) view.classList.add('view-enter');
    $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === v.tab));
    const back = $('#backBtn');
    back.hidden = !v.back; back.dataset.href = v.back || '';
    $('.tabbar').hidden = !Store.data.profile.onboarded;
    $('.topbar-right').style.visibility = Store.data.profile.onboarded ? '' : 'hidden';
    document.title = (v.title && v.title !== 'Today' ? v.title + ' · ' : '') + 'Prana';
    mountFigures(view);
    if (v.after) v.after(view);
    window.scrollTo(0, keepScroll ? y : 0);
  }

  // Delegated interactions within views
  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-install]')) { PWA.install(); return; }
    if (e.target.closest('[data-share]')) { sharePrana(); return; }
    if (e.target.closest('[data-edit-name]')) { nameSheet(); return; }
    if (e.target.closest('[data-sync-hide]')) { S().hideSyncNudge = true; Store.save(); toast('You can sign in any time from Settings'); render(true); return; }
    if (e.target.closest('[data-install-hide]')) { S().hideInstall = true; Store.save(); toast('You can install any time from Settings'); render(true); return; }
    const s = e.target.closest('[data-start]');
    if (s) {
      e.preventDefault();
      Play.start(JSON.parse(s.dataset.start));
      return;
    }
    const sb = e.target.closest('[data-speed]');
    if (sb) {
      st.speed = SPEEDS[(SPEEDS.indexOf(st.speed || 1) + 1) % SPEEDS.length];
      liveFigs.forEach((f) => f.setSpeed(st.speed));
      sb.textContent = speedLabel(st.speed);
      return;
    }
    const ci = e.target.closest('[data-checkin]');
    if (ci) { Habits.checkin(ci.dataset.checkin); toast('Checked in — +5 XP'); render(true); celebrate(); return; }
    const ha = e.target.closest('[data-hb-act]');
    if (ha) {
      const c = Habits.get(ha.dataset.id); if (!c) return;
      const act = ha.dataset.hbAct;
      if (act === 'urge') urgeSheet(c);
      else if (act === 'slip') slipSheet(c);
      else if (act === 'quitch') { if (confirm('Give up this challenge? Your counter keeps running — you just won’t get the challenge reward.')) { Habits.quitChallenge(c.id); render(true); } }
      else if (act === 'delete') { if (confirm(`Delete “${c.name}” and all its history? This can’t be undone.`)) { Habits.remove(c.id); toast('Counter deleted'); location.hash = '#/habits'; } }
      return;
    }
    const hc = e.target.closest('[data-hb-ch]');
    if (hc) { Habits.startChallenge(hc.dataset.id, +hc.dataset.hbCh); toast(`${hc.dataset.hbCh}-day challenge started — +${Habits.challengeXP(+hc.dataset.hbCh)} XP if you make it`); render(true); return; }
    const dlb = e.target.closest('[data-dl]');
    if (dlb) {
      const it = Library.get(dlb.dataset.dl); if (!it) return;
      dlb.disabled = true; dlb.textContent = 'Downloading…';
      const prog = $('[data-dl-prog]', view); if (prog) prog.hidden = false;
      Library.download(it, (p) => { const i = prog && $('i', prog); if (i) i.style.width = (p * 100).toFixed(1) + '%'; const n = $('[data-dl-note]', view); if (n) n.textContent = `Downloading… ${Math.round(p * 100)}%`; })
        .then(() => { toast('Saved for offline listening'); render(true); })
        .catch((err) => { toast(navigator.onLine ? err.message : 'You’re offline — connect to download'); render(true); });
      return;
    }
    const dlr = e.target.closest('[data-dl-remove]');
    if (dlr) { const it = Library.get(dlr.dataset.dlRemove); if (it) Library.removeDownload(it).then(() => { toast('Removed from this device'); render(true); }); return; }
    const rw = e.target.closest('[data-reset-wk]');
    if (rw) { delete PF().wk[rw.dataset.resetWk]; Store.save(); render(true); return; }
    const seg = e.target.closest('[data-seg] button');
    if (seg) { st[seg.parentElement.dataset.seg] = seg.dataset.v; render(true); return; }
    const chip = e.target.closest('[data-chips] .chip');
    if (chip) { st[chip.parentElement.dataset.chips] = chip.dataset.v; render(true); return; }
    const pk = e.target.closest('[data-picker] button');
    if (pk) {
      const key = pk.parentElement.dataset.picker;
      if (key === 'obGoal') { $$('button', pk.parentElement).forEach((b) => b.classList.toggle('active', b === pk)); return; }
      const val = isNaN(+pk.dataset.v) ? pk.dataset.v : +pk.dataset.v;
      if (key === 'goal') { S().goal = val; Store.save(); }
      else if (key.startsWith('p:')) setPref(key.slice(2), val);
      else st[key] = val;
      render(true);
    }
  });

  $('#backBtn').addEventListener('click', () => {
    if (navCount > 1) history.back();
    else location.hash = $('#backBtn').dataset.href || '#/';
  });
  window.addEventListener('hashchange', () => { navCount++; if (!Play.active) render(); });

  function applyTheme() {
    const t = S().theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  // icons in static chrome
  $('#backBtn').innerHTML = ICON.back;
  $('#progressLink').innerHTML = ICON.chart;
  $('#settingsLink').innerHTML = ICON.gear;
  $$('.tabbar [data-icon]').forEach((s) => { s.innerHTML = ICON[s.dataset.icon]; });
  ICON.star = ICON.sparkle;

  applyTheme();
  render();

  // Sync events: refresh when merged data arrives, route email-link results.
  Sync.on((evt) => {
    if (evt === 'data' || evt === 'auth') { applyTheme(); if (!Play.active) render(true); return; }
    if (evt === 'state') { $$('[data-sync-status]').forEach((n) => { n.textContent = syncStatusText(); }); return; }
    if (evt === 'recovery') { location.hash = '#/account?reset=1'; return; }
    if (evt && evt.type === 'link-signed-in') toast('Signed in — your progress is syncing');
    if (evt && evt.type === 'link-error') { location.hash = '#/account?error=' + encodeURIComponent(evt.message); }
  });
  Sync.boot();
  Library.on((what) => {
    if (Play.active) return;
    const h = location.hash;
    if (what === 'list' && /^#\/(mind|audio\/)/.test(h)) render(true);
    if (what === 'admin' && /^#\/(mind|settings|studio|audio\/)/.test(h)) render(true);
  });
  Library.refresh();

  // ---------------------------------------------------------------------------
  // Service worker: offline support + "update available" prompt
  // ---------------------------------------------------------------------------
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    let wantReload = false;
    const offerUpdate = (worker) => {
      if ($('#updateBar')) return;
      const bar = UI.h(`<div class="update-bar" id="updateBar" role="status"><span>${ICON.sparkle} A new version of Prana is ready</span><button class="btn btn-sm">Update</button></div>`);
      $('button', bar).addEventListener('click', () => {
        if (Play.active) { toast('Finish your session first — then tap Update'); return; }
        wantReload = true; bar.remove(); worker.postMessage('SKIP_WAITING');
      });
      document.body.appendChild(bar);
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (wantReload) location.reload(); });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing; if (!w) return;
          w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); });
        });
        // check for a new version when the app comes back to the foreground, and hourly
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
        setInterval(() => reg.update().catch(() => {}), 36e5);
      }).catch(() => {});
    });
  }

  window.addEventListener('offline', () => toast('You’re offline — Prana keeps working'));
  window.addEventListener('online', () => toast('Back online'));

  // Ask the browser not to evict saved progress (granted automatically for installed apps).
  if (navigator.storage && navigator.storage.persist && (PWA.standalone() || Store.data.log.length)) {
    navigator.storage.persisted().then((p) => { if (!p) navigator.storage.persist(); }).catch(() => {});
  }
  if (Sound.hasTTS) speechSynthesis.addEventListener('voiceschanged', () => { if (current && current.title === 'Settings' && !Play.active) render(true); });

  window.App = { refresh: () => render(true) };
})();
