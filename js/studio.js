/* Prana — admin studio: record or upload guided meditations and manage the library.
 * State lives here (not in the DOM) so a recording survives page re-renders. */
(function () {
  'use strict';
  const { ICON, esc, $, $$, fmt, toast } = UI;
  const MAX_REC_SEC = 90 * 60;               // 64 kbps × 90 min ≈ 43 MB, under the 50 MB limit
  const REC_TYPES = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

  const blankForm = () => ({ title: '', guide: '', description: '', category: 'calm', published: true });
  const S = {
    tab: 'record',
    rec: { state: 'idle', error: '' },      // idle | asking | recording | paused | done
    file: null,                             // { blob, name, url, duration, error }
    form: blankForm(),
    saving: null,                           // { progress, error }
    list: null, listErr: '', editing: null, busy: {}
  };
  let root = null;

  const size = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const hms = (sec) => { sec = Math.floor(sec); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
  const draw = () => { if (root && root.isConnected) root.innerHTML = html(); };

  // ---------------------------------------------------------------------------
  // Recording
  // ---------------------------------------------------------------------------
  const R = { stream: null, recorder: null, chunks: [], t0: 0, before: 0, actx: null, analyser: null, raf: 0, blob: null, url: '', mime: '', dur: 0 };
  const recElapsed = () => R.before + (S.rec.state === 'recording' ? (performance.now() - R.t0) / 1000 : 0);

  async function startRec() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      S.rec = { state: 'idle', error: 'Recording isn’t supported in this browser. Record in another app (e.g. Voice Memos) and use Upload instead.' }; draw(); return;
    }
    S.rec = { state: 'asking', error: '' }; draw();
    try {
      R.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch (e) {
      S.rec = { state: 'idle', error: e && e.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow the microphone for this site in your browser settings, then try again.' : 'No microphone was found.' };
      draw(); return;
    }
    R.mime = REC_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    try { R.recorder = new MediaRecorder(R.stream, Object.assign({ audioBitsPerSecond: 64000 }, R.mime ? { mimeType: R.mime } : {})); }
    catch (e) { R.recorder = new MediaRecorder(R.stream); }
    R.chunks = [];
    R.recorder.ondataavailable = (e) => { if (e.data && e.data.size) R.chunks.push(e.data); };
    R.recorder.onstop = () => {
      R.dur = recElapsed();
      R.blob = new Blob(R.chunks, { type: (R.recorder.mimeType || R.mime || 'audio/webm').split(';')[0] });
      R.url = URL.createObjectURL(R.blob);
      stopInputs();
      S.rec = { state: 'done', error: '' };
      draw();
    };
    R.recorder.start(1000);
    R.before = 0; R.t0 = performance.now();
    S.rec = { state: 'recording', error: '' };
    // level meter
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      R.actx = new C();
      const src = R.actx.createMediaStreamSource(R.stream);
      R.analyser = R.actx.createAnalyser(); R.analyser.fftSize = 1024;
      src.connect(R.analyser);
    } catch (e) { R.analyser = null; }
    draw();
    tick();
  }
  function tick() {
    cancelAnimationFrame(R.raf);
    const buf = R.analyser ? new Float32Array(R.analyser.fftSize) : null;
    let level = 0;
    const frame = () => {
      if (S.rec.state !== 'recording' && S.rec.state !== 'paused') return;
      const t = recElapsed();
      if (buf && S.rec.state === 'recording') {
        R.analyser.getFloatTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const db = 20 * Math.log10(Math.sqrt(sum / buf.length) + 1e-6);
        level = Math.max(level * 0.82, Math.min(1, Math.max(0, (db + 60) / 55)));
      } else level *= 0.8;
      if (root) {
        const tm = $('[data-rec-time]', root), mt = $('[data-rec-meter]', root);
        if (tm) tm.textContent = hms(t);
        if (mt) { mt.style.width = (level * 100).toFixed(1) + '%'; mt.classList.toggle('hot', level > 0.92); }
      }
      if (t >= MAX_REC_SEC) { stopRec(); toast('Reached the 90-minute limit — recording stopped'); return; }
      R.raf = requestAnimationFrame(frame);
    };
    R.raf = requestAnimationFrame(frame);
  }
  function pauseRec() {
    if (S.rec.state !== 'recording') return;
    R.before = recElapsed(); R.recorder.pause(); S.rec.state = 'paused'; draw(); tick();
  }
  function resumeRec() {
    if (S.rec.state !== 'paused') return;
    R.t0 = performance.now(); R.recorder.resume(); S.rec.state = 'recording'; draw(); tick();
  }
  function stopRec() {
    if (S.rec.state !== 'recording' && S.rec.state !== 'paused') return;
    R.before = recElapsed(); S.rec.state = 'paused';   // freeze the clock; onstop finishes
    cancelAnimationFrame(R.raf);
    R.recorder.stop();
  }
  function stopInputs() {
    cancelAnimationFrame(R.raf);
    if (R.stream) R.stream.getTracks().forEach((t) => t.stop());
    if (R.actx) R.actx.close().catch(() => {});
    R.stream = null; R.actx = null; R.analyser = null;
  }
  function discardRec() {
    if (R.recorder && R.recorder.state !== 'inactive') { R.recorder.onstop = null; try { R.recorder.stop(); } catch (e) { /* ignore */ } }
    stopInputs();
    if (R.url) URL.revokeObjectURL(R.url);
    Object.assign(R, { recorder: null, chunks: [], blob: null, url: '', dur: 0, before: 0 });
    S.rec = { state: 'idle', error: '' };
  }
  const recording = () => S.rec.state === 'recording' || S.rec.state === 'paused' || S.rec.state === 'asking';

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------
  /** Duration of an audio file (works around files that report Infinity). */
  function probeDuration(url) {
    return new Promise((resolve) => {
      const a = document.createElement('audio');
      let done = false;
      const finish = (v) => { if (done) return; done = true; a.removeAttribute('src'); a.load(); resolve(v); };
      a.preload = 'metadata';
      a.onloadedmetadata = () => {
        if (isFinite(a.duration) && a.duration > 0) finish(a.duration);
        else { a.ontimeupdate = () => { if (isFinite(a.duration) && a.duration > 0) finish(a.duration); }; a.currentTime = 1e7; }
      };
      a.onerror = () => finish(0);
      setTimeout(() => finish(isFinite(a.duration) ? a.duration : 0), 12000);
      a.src = url;
    });
  }
  async function pickFile(file) {
    if (!file) return;
    if (S.file && S.file.url) URL.revokeObjectURL(S.file.url);
    const mime = Library.mimeOf(file, file.name);
    if (!/^audio\//.test(mime)) { S.file = { error: `“${file.name}” isn’t an audio file.` }; draw(); return; }
    if (file.size > Library.MAX_BYTES) { S.file = { error: `“${file.name}” is ${size(file.size)} — the limit is 50 MB. Export it as MP3 at 64–96 kbps and try again.` }; draw(); return; }
    const url = URL.createObjectURL(file);
    S.file = { blob: file, name: file.name, url, duration: 0, probing: true };
    if (!S.form.title) S.form.title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120);
    draw();
    const d = await probeDuration(url);
    if (!S.file || S.file.url !== url) return;
    S.file.probing = false; S.file.duration = d;
    if (!d) S.file.error = 'Couldn’t read this file’s length — it may be in a format this browser can’t play. MP3 or M4A work everywhere.';
    draw();
  }
  function clearFile() { if (S.file && S.file.url) URL.revokeObjectURL(S.file.url); S.file = null; }

  // ---------------------------------------------------------------------------
  // Save / manage
  // ---------------------------------------------------------------------------
  async function save() {
    const src = S.tab === 'record' ? (R.blob ? { blob: R.blob, filename: 'recording', duration: R.dur } : null)
      : (S.file && S.file.blob && S.file.duration ? { blob: S.file.blob, filename: S.file.name, duration: S.file.duration } : null);
    if (!src) return;
    const f = S.form;
    if (!f.title.trim()) { S.saving = { progress: 0, error: 'Please give it a title.' }; draw(); const t = $('[name="title"]', root); if (t) t.focus(); return; }
    S.saving = { progress: 0, error: '' }; draw();
    try {
      const item = await Library.create(Object.assign({}, src, f), (p) => {
        S.saving.progress = p;
        const bar = root && $('[data-save-bar]', root); if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
        const lbl = root && $('[data-save-lbl]', root); if (lbl) lbl.textContent = `Uploading… ${Math.round(p * 100)}%`;
      });
      toast(item.published ? 'Published — it’s now in everyone’s Mind tab' : 'Saved as a draft');
      if (S.tab === 'record') discardRec(); else clearFile();
      S.form = blankForm(); S.saving = null; S.tab = 'library'; S.list = null;
      draw(); loadList();
    } catch (e) {
      S.saving = { progress: 0, error: e.message || String(e) }; draw();
    }
  }
  async function loadList() {
    S.listErr = '';
    try { S.list = await Library.adminList(); } catch (e) { S.listErr = e.message || String(e); S.list = []; }
    draw();
  }
  async function itemAction(act, id) {
    const it = (S.list || []).find((x) => x.id === id); if (!it) return;
    if (act === 'play') { Play.start({ kind: 'audio', id: it.id, item: it }); return; }
    if (act === 'edit') { S.editing = S.editing === id ? null : id; draw(); return; }
    S.busy[id] = true; draw();
    try {
      if (act === 'toggle') { await Library.update(id, { published: !it.published }); toast(it.published ? 'Unpublished — now a draft' : 'Published'); }
      else if (act === 'delete') {
        if (!confirm(`Delete “${it.title}”? The recording is removed for everyone. This can’t be undone.`)) { delete S.busy[id]; draw(); return; }
        await Library.remove(it); toast('Deleted');
      } else if (act === 'saveedit') {
        const form = $(`[data-edit-form="${id}"]`, root);
        const v = (n) => $(`[name="${n}"]`, form);
        if (!v('title').value.trim()) { toast('Title can’t be empty'); delete S.busy[id]; draw(); return; }
        await Library.update(id, { title: v('title').value, guide: v('guide').value, description: v('description').value, category: v('category').value, published: v('published').checked });
        S.editing = null; toast('Saved');
      }
      delete S.busy[id];
      await loadList();
    } catch (e) { delete S.busy[id]; draw(); toast(e.message || String(e)); }
  }

  // ---------------------------------------------------------------------------
  // Markup
  // ---------------------------------------------------------------------------
  const catOptions = (cur) => Object.entries(Library.CATEGORIES).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');
  function detailsForm(ready) {
    const f = S.form, sv = S.saving;
    return `<form class="card auth-form st-form" data-st-form novalidate>
      <label class="fl">Title<input class="input" name="title" maxlength="120" required value="${esc(f.title)}" placeholder="e.g. Ten-minute evening wind-down"></label>
      <label class="fl">Guide <span class="hint">Optional — shown under the title</span><input class="input" name="guide" maxlength="80" value="${esc(f.guide)}" placeholder="Your name"></label>
      <label class="fl">Description<textarea class="input st-ta" name="description" maxlength="2000" rows="3" placeholder="What this meditation is for and how it feels">${esc(f.description)}</textarea></label>
      <label class="fl">Category<select class="input" name="category">${catOptions(f.category)}</select></label>
      <div class="field" style="padding:0"><div><label for="st_pub">Publish now</label><div class="hint">Off saves it as a draft only you can see</div></div><label class="switch"><input type="checkbox" id="st_pub" name="published" ${f.published ? 'checked' : ''}><span></span></label></div>
      ${sv && !sv.error ? `<div class="st-progress"><i data-save-bar style="width:${(sv.progress * 100).toFixed(1)}%"></i></div><div class="small muted" data-save-lbl>Uploading… ${Math.round(sv.progress * 100)}%</div>` : ''}
      ${sv && sv.error ? `<div class="form-msg err" role="alert">${esc(sv.error)}</div>` : ''}
      <button class="btn btn-primary btn-block" type="submit" ${!ready || (sv && !sv.error) ? 'disabled' : ''}>${ICON.upload} ${f.published ? 'Publish' : 'Save draft'}</button>
    </form>`;
  }

  function recordTab() {
    const r = S.rec;
    if (r.state === 'done') {
      return `<div class="card st-card">
          <div class="st-done-head"><b>Your recording</b><span class="small muted">${hms(R.dur)} · ${size(R.blob.size)}</span></div>
          <audio class="st-audio" controls preload="metadata" src="${R.url}"></audio>
          <div class="row" style="gap:8px;margin-top:10px"><button class="btn btn-sm" data-st="discard">${ICON.trash} Discard & record again</button></div>
        </div>
        ${section('Details')}${detailsForm(true)}`;
    }
    if (r.state === 'recording' || r.state === 'paused') {
      const on = r.state === 'recording';
      return `<div class="card st-card st-rec ${on ? 'live' : ''}">
          <div class="st-rec-badge"><i></i>${on ? 'Recording' : 'Paused'}</div>
          <div class="st-time" data-rec-time>${hms(recElapsed())}</div>
          <div class="st-meter"><i data-rec-meter></i></div>
          <div class="st-rec-ctl">
            <button class="st-round" data-st="discard" aria-label="Discard recording">${ICON.trash}</button>
            <button class="st-round main" data-st="${on ? 'pause' : 'resume'}" aria-label="${on ? 'Pause' : 'Resume'}">${on ? ICON.pause : ICON.mic}</button>
            <button class="st-round" data-st="stop" aria-label="Finish recording">${ICON.stop}</button>
          </div>
          <p class="small muted" style="text-align:center;margin-top:10px">${on ? 'Speak naturally — leave pauses for the listener.' : 'Paused. Resume to keep going, or finish to review.'} Up to 90 minutes.</p>
        </div>`;
    }
    return `<div class="card st-card st-start">
        <button class="st-mic" data-st="start" ${r.state === 'asking' ? 'disabled' : ''} aria-label="Start recording">${ICON.mic}</button>
        <b>${r.state === 'asking' ? 'Waiting for microphone permission…' : 'Tap to start recording'}</b>
        ${r.error ? `<div class="form-msg err" role="alert" style="margin-top:8px">${esc(r.error)}</div>` : ''}
      </div>
      <ul class="list-dots st-tips">
        <li>Find a quiet room; soft furnishings reduce echo.</li>
        <li>Hold the phone or mic 15–20 cm from your mouth, slightly to the side.</li>
        <li>Speak slowly and leave silences — they’re part of the practice.</li>
        <li>You can pause and resume; you’ll review before anything is published.</li>
      </ul>`;
  }

  function uploadTab() {
    const f = S.file;
    const pickBtn = `<label class="btn btn-primary">${ICON.upload} Choose audio file<input type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.opus,.flac,.webm" data-st-file hidden></label>`;
    if (!f || !f.blob) {
      return `<div class="card st-card st-drop" data-st-drop>
          <div class="st-drop-ic">${ICON.headphones}</div>
          <b>Upload a recording</b>
          <p class="small muted">MP3, M4A, WAV, OGG, FLAC or WebM · up to 50 MB (about 1¾ hours of voice at 64 kbps)</p>
          ${pickBtn}
          ${f && f.error ? `<div class="form-msg err" role="alert" style="margin-top:10px">${esc(f.error)}</div>` : ''}
        </div>`;
    }
    return `<div class="card st-card">
        <div class="st-done-head"><b style="word-break:break-all">${esc(f.name)}</b><span class="small muted">${f.probing ? 'Reading…' : hms(f.duration)} · ${size(f.blob.size)}</span></div>
        <audio class="st-audio" controls preload="metadata" src="${f.url}"></audio>
        ${f.error ? `<div class="form-msg err" role="alert">${esc(f.error)}</div>` : ''}
        <div class="row" style="gap:8px;margin-top:10px"><button class="btn btn-sm" data-st="clearfile">Choose another file</button></div>
      </div>
      ${section('Details')}${detailsForm(!f.probing && !!f.duration)}`;
  }

  function libraryTab() {
    if (S.list == null) { loadList(); return '<p class="muted" style="padding:12px 4px">Loading your recordings…</p>'; }
    if (S.listErr) return `<div class="card"><div class="form-msg err">${esc(S.listErr)}</div><button class="btn btn-sm" data-st="reload" style="margin-top:10px">Try again</button></div>`;
    if (!S.list.length) return '<div class="card"><p class="muted">No recordings yet. Record or upload your first guided meditation.</p></div>';
    return S.list.map((it) => {
      const busy = !!S.busy[it.id];
      const edit = S.editing === it.id ? `<form class="auth-form st-edit" data-edit-form="${it.id}" novalidate>
          <label class="fl">Title<input class="input" name="title" maxlength="120" value="${esc(it.title)}"></label>
          <label class="fl">Guide<input class="input" name="guide" maxlength="80" value="${esc(it.guide)}"></label>
          <label class="fl">Description<textarea class="input st-ta" name="description" maxlength="2000" rows="3">${esc(it.description)}</textarea></label>
          <label class="fl">Category<select class="input" name="category">${catOptions(it.category)}</select></label>
          <div class="field" style="padding:0"><label for="pub_${it.id}">Published</label><label class="switch"><input type="checkbox" id="pub_${it.id}" name="published" ${it.published ? 'checked' : ''}><span></span></label></div>
          <div class="row" style="gap:8px"><button class="btn btn-sm btn-primary" type="button" data-it="saveedit" data-id="${it.id}" ${busy ? 'disabled' : ''}>Save</button><button class="btn btn-sm" type="button" data-it="edit" data-id="${it.id}">Cancel</button></div>
        </form>` : '';
      return `<div class="card st-item ${busy ? 'busy' : ''}">
          <div class="st-item-top">
            <button class="st-play" data-it="play" data-id="${it.id}" aria-label="Play ${esc(it.title)}">${ICON.play}</button>
            <div style="flex:1;min-width:0"><b class="st-item-title">${esc(it.title)}</b>
              <div class="small muted">${esc(Library.CATEGORIES[it.category] || '')} · ${hms(it.duration)} · ${size(it.size)}${it.guide ? ' · ' + esc(it.guide) : ''}</div></div>
            <span class="pill ${it.published ? 'accent' : ''}">${it.published ? 'Live' : 'Draft'}</span>
          </div>
          <div class="row st-item-act">
            <button class="btn btn-sm" data-it="edit" data-id="${it.id}" ${busy ? 'disabled' : ''}>${ICON.edit} Edit</button>
            <button class="btn btn-sm" data-it="toggle" data-id="${it.id}" ${busy ? 'disabled' : ''}>${it.published ? 'Unpublish' : 'Publish'}</button>
            <button class="btn btn-sm btn-danger" data-it="delete" data-id="${it.id}" ${busy ? 'disabled' : ''}>${ICON.trash} Delete</button>
          </div>
          ${edit}
        </div>`;
    }).join('');
  }
  const section = (t) => `<div class="section"><h2>${esc(t)}</h2></div>`;

  function html() {
    const tabs = [['record', 'Record'], ['upload', 'Upload'], ['library', 'Library' + (S.list && S.list.length ? ` (${S.list.length})` : '')]];
    const body = S.tab === 'record' ? recordTab() : S.tab === 'upload' ? uploadTab() : libraryTab();
    return `<div class="seg st-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-st-tab="${k}" class="${S.tab === k ? 'active' : ''}" aria-selected="${S.tab === k}">${l}</button>`).join('')}</div>${body}`;
  }

  // ---------------------------------------------------------------------------
  function mount(el) {
    root = el;
    draw();
    if (S.rec.state === 'recording' || S.rec.state === 'paused') tick();
    el.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-st-tab]');
      if (tab) {
        if (recording() && tab.dataset.stTab !== 'record') { toast('Finish or discard the recording first'); return; }
        S.tab = tab.dataset.stTab; S.saving = null; draw(); return;
      }
      const b = e.target.closest('[data-st]');
      if (b) {
        const a = b.dataset.st;
        if (a === 'start') startRec();
        else if (a === 'pause') pauseRec();
        else if (a === 'resume') resumeRec();
        else if (a === 'stop') stopRec();
        else if (a === 'discard') { if ((S.rec.state === 'done' || recElapsed() > 10) && !confirm('Discard this recording?')) return; discardRec(); S.saving = null; draw(); }
        else if (a === 'clearfile') { clearFile(); S.saving = null; draw(); }
        else if (a === 'reload') { S.list = null; draw(); }
        return;
      }
      const it = e.target.closest('[data-it]');
      if (it) itemAction(it.dataset.it, it.dataset.id);
    });
    el.addEventListener('input', (e) => {
      const form = e.target.closest('[data-st-form]'); if (!form) return;
      const n = e.target.name; if (!n) return;
      S.form[n] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (n === 'published') { const btn = $('button[type="submit"]', form); if (btn) btn.innerHTML = `${ICON.upload} ${S.form.published ? 'Publish' : 'Save draft'}`; }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-st-file]')) { pickFile(e.target.files[0]); return; }
      const form = e.target.closest('[data-st-form]');
      if (form && e.target.name) S.form[e.target.name] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    });
    el.addEventListener('submit', (e) => { if (e.target.matches('[data-st-form]')) { e.preventDefault(); save(); } });
    el.addEventListener('dragover', (e) => { const z = e.target.closest('[data-st-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
    el.addEventListener('dragleave', (e) => { const z = e.target.closest('[data-st-drop]'); if (z) z.classList.remove('over'); });
    el.addEventListener('drop', (e) => { const z = e.target.closest('[data-st-drop]'); if (z) { e.preventDefault(); z.classList.remove('over'); pickFile(e.dataTransfer.files[0]); } });
  }

  // Leaving the studio mid-recording pauses it (the microphone stays reserved until you come back).
  window.addEventListener('hashchange', () => {
    if (S.rec.state === 'recording' && !/^#\/studio/.test(location.hash)) { pauseRec(); toast('Recording paused — return to Studio to continue'); }
  });
  window.addEventListener('beforeunload', (e) => {
    if (recording() || S.rec.state === 'done' || (S.saving && !S.saving.error)) { e.preventDefault(); e.returnValue = ''; }
  });

  window.Studio = { mount, get busy() { return recording() || S.rec.state === 'done'; } };
})();
