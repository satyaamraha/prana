/* Prana — app shell, router and screens. */
(function () {
  'use strict';
  const { ICON, esc, $, $$, fmt, fmtMin, toast } = UI;
  const view = $('#view');
  const S = () => Store.data.settings;

  // ---------------------------------------------------------------------------
  // Install (PWA)
  // ---------------------------------------------------------------------------
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

  function mountFigures(root) {
    $$('[data-fig]', root).forEach((elm) => {
      const spec = elm.dataset.fig;
      const [type, id] = spec.split(':');
      try {
        if (type === 'ex') {
          const e = Content.EX[id];
          const f = new Figure(elm, { anchor: e.anchor || 'hip', prop: e.prop || null, label: e.name + ' demonstration' });
          f.loop(e.frames.map(([n, hh, t]) => ({ pose: Poses.get(n), h: hh, t })));
          if (elm.dataset.still != null) { f.pause(); }
        } else if (type === 'exstill') {
          const e = Content.EX[id];
          const fr = e.frames[e.frames.length > 1 ? 1 : 0];
          Figure.still(elm, Poses.get(fr[0]), { prop: e.prop || null, anchor: e.anchor || 'hip' });
        } else if (type === 'pose') {
          Figure.still(elm, Poses.get(id));
        } else if (type === 'yoga') {
          const y = Content.yoga(id);
          Figure.still(elm, Poses.get(y.flowFrames ? y.flowFrames[0][0] : y.pose));
        } else if (type === 'yogalive') {
          const y = Content.yoga(id);
          const f = new Figure(elm, { label: y.name, mat: true });
          if (y.flowFrames) f.loop(y.flowFrames.map(([n, hh, t]) => ({ pose: Poses.get(n), h: hh, t })), { anchor: 'rhand' });
          else f.show(Poses.get(y.pose), { dur: 0 });
        } else if (type === 'surya') {
          const steps = Content.suryaSteps('R');
          const f = new Figure(elm, { label: 'Sun Salutation demonstration', mat: true });
          let k = 0;
          f.show(Poses.get(steps[0].pose), { dur: 0 });
          const iv = setInterval(() => {
            if (!elm.isConnected) { clearInterval(iv); return; }
            k = (k + 1) % steps.length;
            const s = steps[k];
            f.show(Poses.get(s.pose), { dur: k === 0 ? 0 : 1.2, anchor: s.anchor });
            const cap = $('[data-surya-cap]');
            if (cap) cap.innerHTML = `<b>${k + 1}. ${esc(s.name)}</b> · ${esc(s.breath)}`;
          }, 2200);
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
        <h1>${greet}${name ? ', ' + esc(name) : ''}</h1>
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
      ${installCard()}
      ${section('Today’s practice', `<span class="small muted">${doneCount}/3 done</span>`)}
      ${planHtml}
      ${section('Your programs', '<a href="#/programs">Browse all</a>')}
      ${progHtml}
      ${section('Quick start')}
      <div class="quick">${quick}</div>`
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
    return {
      tab: 'breathe', title: b.name, accent: 'var(--breathe)', back: '#/breathe',
      html: `
      <div class="detail-stage" style="display:grid;place-items:center"><div style="display:grid;place-items:center"><div class="orb-demo" style="width:min(42vw,200px);height:min(42vw,200px);border-radius:50%;background:radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 40%, #fff), var(--accent) 55%, color-mix(in srgb, var(--accent) 55%, #000));animation:breathe ${b.phases ? b.phases.reduce((a, p) => a + p[1], 0) : 8}s ease-in-out infinite;box-shadow:0 0 50px color-mix(in srgb, var(--accent) 40%, transparent)"></div></div></div>
      <div class="detail-title"><div class="eyebrow">${CAT_NAME[b.cat]} · ${esc(b.level)}</div><h1>${esc(b.name)}</h1>${b.sub ? `<div class="sk">${esc(b.sub)}</div>` : ''}<p>${esc(b.about)}</p></div>
      ${section('Pattern')}${phasesHtml}
      ${fixed ? '' : section('Duration') + picker('bm_' + id, opts, mins, (v) => v + ' min')}
      ${section('How to')}${listSteps(b.steps)}
      ${section('Benefits')}${listDots(b.benefits)}
      ${caution(b.caution)}
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'breath', id: b.id, minutes: fixed ? undefined : mins })}>${ICON.play} Start · ${fixed ? b.minutes : mins} min</button></div>`
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
      body = Content.WORKOUTS.map((w) => {
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
    const w = Content.workout(id); if (!w) return notFound();
    const min = Math.round(Content.workoutSeconds(w) / 60);
    const rows = w.items.map((eid) => { const e = Content.EX[eid]; return `<a class="ex-row" href="#/exercise/${eid}"><div class="ex-fig" data-fig="exstill:${eid}"></div><div><div class="ex-name">${esc(e.name)}</div><div class="small muted">${esc(e.muscles)}</div></div><span class="ex-time">${w.work}s</span></a>`; }).join('');
    return {
      tab: 'move', title: w.name, accent: 'var(--move)', back: '#/move',
      html: `
      <div class="hero" style="--c1:#ee5f38;--c2:#e0306b;margin-bottom:6px">
        <div class="eyebrow" style="color:#fff;opacity:.85">${esc(w.level)}</div>
        <h2 style="margin-top:4px">${esc(w.name)}</h2><p>${esc(w.tag)}</p>
        <div class="facts">${[`${min} min`, `${w.work}s work`, `${w.rest}s rest`, w.rounds > 1 ? `${w.rounds} rounds` : '1 round'].map((t) => `<span class="pill" style="background:rgba(255,255,255,.2);color:#fff">${t}</span>`).join('')}</div>
      </div>
      ${section('Exercises', `<span class="small muted">${w.items.length} moves</span>`)}
      <div class="card ex-list" style="padding:6px 14px">${rows}</div>
      <p class="small muted" style="margin-top:12px">Tip: tap any exercise to see a full demonstration and form cues before you start. Listen to your body and slow down whenever you need to.</p>
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'workout', id: w.id })}>${ICON.play} Start workout · ${min} min</button></div>`
    };
  }

  function exerciseDetail(id) {
    const e = Content.EX[id]; if (!e) return notFound();
    const secs = st.exSecs;
    return {
      tab: 'move', title: e.name, accent: 'var(--move)', back: '#/move',
      html: `
      <div class="detail-stage"><div data-fig="ex:${e.id}"></div></div>
      <div class="detail-title"><div class="eyebrow">${esc(e.level)}</div><h1>${esc(e.name)}</h1><p>${esc(e.muscles)}</p></div>
      ${section('How to do it')}${listSteps(e.steps)}
      ${e.tips ? section('Form tips') + listDots(e.tips) : ''}
      ${section('Practice')}${picker('exSecs', [20, 30, 45, 60, 90, 120], secs, (v) => v < 60 ? v + 's' : fmt(v))}
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'exercise', id: e.id, seconds: secs })}>${ICON.play} Practice ${secs < 60 ? secs + 's' : fmt(secs)}</button></div>`
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
        const min = Math.round(Content.flowSeconds(f) / 60);
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
      const rounds = st.suryaRounds || f.rounds, pace = st.suryaPace || f.pace;
      const ff = Object.assign({}, f, { pace });
      const min = Math.round(Content.flowSeconds(ff, rounds) / 60);
      const steps = Content.suryaSteps('R');
      return {
        tab: 'yoga', title: f.name, accent: 'var(--yoga)', back: '#/yoga',
        html: `
        <div class="detail-stage"><div data-fig="surya"></div></div>
        <p class="small" style="text-align:center;margin:-6px 0 14px" data-surya-cap><b>1. Prayer Pose</b> · Exhale</p>
        <div class="detail-title"><div class="eyebrow">${esc(f.level)}</div><h1>${esc(f.name)}</h1><div class="sk">${esc(f.sub)}</div><p>${esc(f.about)}</p></div>
        ${section('Rounds')}${picker('suryaRounds', [1, 2, 3, 5, 8, 12], rounds)}
        ${section('Pace')}${picker('suryaPace', [7, 5, 4], pace, (v) => ({ 7: 'Slow', 5: 'Steady', 4: 'Brisk' }[v]))}
        ${section('The 12 postures')}
        <div class="card ex-list" style="padding:6px 14px">${steps.map((s, i) => `<div class="ex-row"><div class="ex-fig" data-fig="pose:${s.pose}"></div><div><div class="ex-name">${i + 1}. ${esc(s.name)}</div><div class="small muted"><i>${esc(s.sk)}</i> · ${esc(s.breath)}</div></div></div>`).join('')}</div>
        ${caution('Move gently and within your range. Avoid if you have recent back, wrist or shoulder injuries; in pregnancy, practise a modified version with a teacher.')}
        <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'flow', id: 'surya', rounds })} data-pace="${pace}">${ICON.play} Start · ${rounds} rounds · ${min} min</button></div>`
      };
    }
    const min = Math.round(Content.flowSeconds(f) / 60);
    const rows = f.items.map(([pid, s]) => { const y = Content.yoga(pid); return `<a class="ex-row" href="#/pose/${pid}"><div class="ex-fig" data-fig="yoga:${pid}"></div><div><div class="ex-name">${esc(y.name)}</div><div class="small muted"><i>${esc(y.sk)}</i>${y.sides ? ' · both sides' : ''}</div></div><span class="ex-time">${s}s</span></a>`; }).join('');
    return {
      tab: 'yoga', title: f.name, accent: 'var(--yoga)', back: '#/yoga',
      html: `
      <div class="hero" style="--c1:#8a63f0;--c2:#c058c7;margin-bottom:6px">
        <div class="eyebrow" style="color:#fff;opacity:.85">${esc(f.level)}</div>
        <h2 style="margin-top:4px">${esc(f.name)}</h2><p>${esc(f.tag)}</p>
        <div class="facts"><span class="pill" style="background:rgba(255,255,255,.2);color:#fff">${min} min</span><span class="pill" style="background:rgba(255,255,255,.2);color:#fff">${f.items.length} poses</span></div>
      </div>
      ${section('Sequence')}
      <div class="card ex-list" style="padding:6px 14px">${rows}</div>
      <div class="sticky-cta"><button class="btn btn-primary" ${start({ kind: 'flow', id: f.id })}>${ICON.play} Start flow · ${min} min</button></div>`
    };
  }

  function poseDetail(id) {
    const y = Content.yoga(id); if (!y) return notFound();
    const secs = st['ps_' + id] || y.hold;
    const opts = [...new Set([15, 30, 45, 60, 90, 180, y.hold])].sort((a, b) => a - b);
    return {
      tab: 'yoga', title: y.name, accent: 'var(--yoga)', back: '#/yoga',
      html: `
      <div class="detail-stage"><div data-fig="yogalive:${y.id}"></div></div>
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
  function mindList() {
    const meds = Meditations.list.map((m) => sCard({ href: '#/meditation/' + m.id, icon: m.icon, title: m.name, sub: m.tag, done: isDoneToday({ id: m.id }), meta: [{ t: m.minutes + ' min', icon: 'clock' }, { t: 'Guided', accent: true }] })).join('');
    return {
      tab: 'mind', title: 'Mind', accent: 'var(--mind)',
      html: `
      <div class="page-head"><h1>Mind</h1><p>Guided meditations with voice, ambient sound and gentle bells.</p></div>
      <div class="hero" style="--c1:#4776e6;--c2:#8a63f0">
        <h2>Silent meditation timer</h2><p>Sit in stillness. A bell marks the beginning and end.</p>
        <div style="margin-top:14px"><div class="small" style="opacity:.85;margin-bottom:6px;font-weight:650">Duration</div>${picker('timerMin', [3, 5, 10, 15, 20, 30], st.timerMin, (v) => v + 'm')}</div>
        <div style="margin-top:12px"><div class="small" style="opacity:.85;margin-bottom:6px;font-weight:650">Interval bell</div>${picker('timerBell', [0, 1, 5], st.timerBell, (v) => v ? 'Every ' + v + 'm' : 'None')}</div>
        <button class="btn" ${start({ kind: 'timer', minutes: st.timerMin, interval: st.timerBell })}>${ICON.play} Begin</button>
      </div>
      ${section('Guided meditations')}${meds}`,
      after(root) { $$('.hero .picker button', root).forEach((b) => { b.style.borderColor = 'rgba(255,255,255,.3)'; if (!b.classList.contains('active')) { b.style.background = 'rgba(255,255,255,.12)'; b.style.color = '#fff'; } else { b.style.background = '#fff'; b.style.color = '#1b1930'; } }); }
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
      ${PWA.standalone() ? '' : `<div class="card" style="padding:4px 16px;margin-bottom:12px"><div class="field"><div><label>Install app</label><div class="hint">Home-screen app that works offline</div></div><button class="btn btn-sm btn-primary" data-install style="--accent:var(--breathe)">${ICON.download} Install</button></div></div>`}
      <div class="card" style="padding:4px 16px">
        <div class="field"><label for="setName">Name</label><input class="input" id="setName" value="${esc(Store.data.profile.name)}" style="max-width:180px"></div>
        <div class="field" style="display:block"><label>Daily goal</label><div style="margin-top:10px">${picker('goal', [5, 10, 15, 20, 30, 45, 60], s.goal, (v) => v + ' min')}</div></div>
      </div>
      ${section('Guidance')}
      <div class="card" style="padding:4px 16px">
        ${sw('voice', 'Voice guidance', Sound.hasTTS ? 'Spoken cues during sessions' : 'Not supported in this browser')}
        ${voices.length ? `<div class="field"><label for="setVoice">Voice</label><select class="input" id="setVoice" style="max-width:200px"><option value="">Automatic</option>${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === s.voiceURI ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>` : ''}
        ${sw('sound', 'Sounds', 'Breath tones, bells and beeps')}
        ${sw('ambient', 'Ambient sound', 'Soft drone or rain during meditation')}
        ${sw('vibrate', 'Vibration', 'Haptic cues on supported phones')}
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
        <div class="field"><div><label>Backup</label><div class="hint">Everything is stored only on this device.</div></div><button class="btn btn-sm" id="exportBtn">${ICON.download} Export</button></div>
        <div class="field"><label>Restore</label><label class="btn btn-sm" style="cursor:pointer">${ICON.upload} Import<input type="file" id="importFile" accept="application/json,.json" hidden></label></div>
        <div class="field"><label>Reset</label><button class="btn btn-sm btn-danger" id="resetBtn">Erase all data</button></div>
      </div>
      <p class="small muted" style="margin:18px 4px">Prana offers general wellness guidance and is not a substitute for medical advice. Consult a qualified professional before starting a new exercise or breathing practice, especially if you are pregnant or have a heart, respiratory, blood-pressure or seizure condition.</p>`,
      after(root) {
        $('#setName', root).addEventListener('change', (e) => { Store.data.profile.name = e.target.value.trim().slice(0, 40); Store.save(); toast('Saved'); });
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
        $('#resetBtn', root).addEventListener('click', () => { if (confirm('Erase all sessions, results, programs and settings on this device? This cannot be undone.')) { Store.reset(); applyTheme(); location.hash = '#/'; render(); } });
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

  function notFound() { return { tab: null, title: 'Not found', back: '#/', html: '<div class="page-head"><h1>Not found</h1><p>That page doesn’t exist.</p></div><a class="btn" href="#/">Go home</a>' }; }

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------
  const routes = [
    [/^\/?$/, today], [/^\/breathe$/, breatheList], [/^\/breathe\/([\w-]+)$/, breathDetail], [/^\/challenge\/([\w-]+)$/, challengeDetail],
    [/^\/move$/, moveList], [/^\/workout\/([\w-]+)$/, workoutDetail], [/^\/exercise\/([\w-]+)$/, exerciseDetail],
    [/^\/yoga$/, yogaList], [/^\/flow\/([\w-]+)$/, flowDetail], [/^\/pose\/([\w-]+)$/, poseDetail],
    [/^\/mind$/, mindList], [/^\/meditation\/([\w-]+)$/, medDetail],
    [/^\/programs$/, programsList], [/^\/program\/([\w-]+)$/, programDetail],
    [/^\/progress$/, progress], [/^\/settings$/, settings]
  ];
  let current = null, navCount = 0;

  function render(keepScroll) {
    const y = window.scrollY;
    Figure.destroyAll();
    const path = (location.hash.slice(1) || '/').split('?')[0];
    let v = null;
    for (const [re, fn] of routes) { const m = path.match(re); if (m) { v = fn(m[1]); break; } }
    if (!v) v = notFound();
    if (!Store.data.profile.onboarded && path !== '/') { v = onboarding(); }
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
    if (e.target.closest('[data-install-hide]')) { S().hideInstall = true; Store.save(); toast('You can install any time from Settings'); render(true); return; }
    const s = e.target.closest('[data-start]');
    if (s) {
      e.preventDefault();
      const desc = JSON.parse(s.dataset.start);
      if (desc.kind === 'flow' && desc.id === 'surya' && s.dataset.pace) {
        const f = Content.flow('surya'); const old = f.pace; f.pace = +s.dataset.pace;
        Play.start(desc); f.pace = old;
      } else Play.start(desc);
      return;
    }
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
