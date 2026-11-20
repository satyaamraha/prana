/* Prana — recorded meditation library (Supabase table + storage bucket).
 * Everyone can stream published recordings; the list is cached so it shows
 * offline, and individual recordings can be downloaded for offline listening.
 * Admins (see supabase/meditations.sql) can add, edit and delete recordings. */
(function () {
  'use strict';
  const CFG = window.PRANA_CONFIG || {};
  const enabled = !!(CFG.supabaseUrl && CFG.supabaseKey);
  const LIST_KEY = 'prana.library', DL_KEY = 'prana.audioDl', ADMIN_KEY = 'prana.admin';
  const AUDIO_CACHE = 'prana-audio';
  const BUCKET = 'meditations';
  const MAX_BYTES = 50 * 1024 * 1024;
  const CATEGORIES = { calm: 'Calm', sleep: 'Sleep', focus: 'Focus', anxiety: 'Anxiety relief', body: 'Body scan', breath: 'Breath', morning: 'Morning' };
  const COLS = 'id,title,description,guide,category,duration_sec,audio_path,mime,size_bytes,published,created_at';

  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full / private mode */ } };

  let items = read(LIST_KEY, { items: [] }).items || [];
  let downloads = read(DL_KEY, {});
  let adminFor = read(ADMIN_KEY, null);   // user id that was confirmed as admin
  let loading = null, lastFetch = 0;
  const listeners = new Set();
  const emit = (what) => listeners.forEach((fn) => { try { fn(what); } catch (e) { console.error(e); } });

  const norm = (r) => ({
    id: r.id, title: r.title, description: r.description || '', guide: r.guide || '', category: r.category || 'calm',
    duration: r.duration_sec, path: r.audio_path, mime: r.mime || '', size: r.size_bytes || 0, published: !!r.published, created: r.created_at
  });
  const audioUrl = (it) => `${CFG.supabaseUrl}/storage/v1/object/public/${BUCKET}/${it.path.split('/').map(encodeURIComponent).join('/')}`;

  /** Fetch the published list (no sign-in needed). Quietly keeps the cache when offline. */
  function refresh(force) {
    if (!enabled) return Promise.resolve(items);
    if (loading) return loading;
    if (!force && Date.now() - lastFetch < 60e3) return Promise.resolve(items);
    loading = fetch(`${CFG.supabaseUrl}/rest/v1/audio_meditations?select=${COLS}&published=eq.true&order=created_at.desc`, { headers: { apikey: CFG.supabaseKey } })
      .then((r) => (r.ok ? r.json() : r.status === 404 ? [] : Promise.reject(new Error('HTTP ' + r.status))))
      .then((rows) => {
        lastFetch = Date.now();
        const next = rows.map(norm);
        const changed = JSON.stringify(next) !== JSON.stringify(items);
        items = next; write(LIST_KEY, { items, at: lastFetch });
        if (changed) emit('list');
        return items;
      })
      .catch(() => items)
      .finally(() => { loading = null; });
    return loading;
  }

  // ---- offline downloads -----------------------------------------------------
  const isDownloaded = (id) => !!downloads[id];
  async function download(it, onProgress) {
    const url = audioUrl(it);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed (' + res.status + ')');
    const total = +res.headers.get('content-length') || it.size || 0;
    let blob;
    if (res.body && res.body.getReader && onProgress) {
      const reader = res.body.getReader(), chunks = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        if (total) onProgress(Math.min(1, got / total));
      }
      blob = new Blob(chunks, { type: it.mime || res.headers.get('content-type') || 'audio/mpeg' });
    } else blob = await res.blob();
    const cache = await caches.open(AUDIO_CACHE);
    await cache.put(url, new Response(blob, { headers: { 'Content-Type': blob.type, 'Content-Length': String(blob.size) } }));
    downloads[it.id] = { path: it.path, size: blob.size, at: Date.now() };
    write(DL_KEY, downloads); emit('downloads');
  }
  async function removeDownload(it) {
    try { const cache = await caches.open(AUDIO_CACHE); await cache.delete(audioUrl(it)); } catch (e) { /* ignore */ }
    delete downloads[it.id]; write(DL_KEY, downloads); emit('downloads');
  }
  /** A URL the <audio> element can play: the offline copy when there is one. */
  async function playableUrl(it) {
    if (it.localUrl) return it.localUrl;
    if (downloads[it.id] && 'caches' in window) {
      try {
        const hit = await (await caches.open(AUDIO_CACHE)).match(audioUrl(it));
        if (hit) return URL.createObjectURL(await hit.blob());
      } catch (e) { /* fall through to streaming */ }
      delete downloads[it.id]; write(DL_KEY, downloads);
    }
    return audioUrl(it);
  }
  const downloadedBytes = () => Object.values(downloads).reduce((a, d) => a + (d.size || 0), 0);

  // ---- admin -------------------------------------------------------------------
  const isAdmin = () => !!(Sync.user && adminFor && adminFor === Sync.user.id);
  async function checkAdmin() {
    if (!enabled || !Sync.user) { if (adminFor) { adminFor = null; write(ADMIN_KEY, null); emit('admin'); } return false; }
    try {
      const c = await Sync.getClient();
      const { data, error } = await c.rpc('is_admin');
      if (error) throw error;
      const next = data ? Sync.user.id : null;
      if (next !== adminFor) { adminFor = next; write(ADMIN_KEY, next); emit('admin'); }
    } catch (e) { /* offline or table missing: keep the last known answer */ }
    return isAdmin();
  }
  async function client() {
    const c = await Sync.getClient();
    if (!Sync.user) throw new Error('Please sign in first.');
    return c;
  }
  /** Every recording including drafts (admins only). */
  async function adminList() {
    const c = await client();
    const { data, error } = await c.from('audio_meditations').select(COLS).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(norm);
  }

  const EXT = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/flac': 'flac' };
  const BY_EXT = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac' };
  function mimeOf(blob, name) {
    let t = (blob.type || '').split(';')[0].trim().toLowerCase();
    if (!EXT[t]) t = BY_EXT[((name || '').split('.').pop() || '').toLowerCase()] || t;
    return t;
  }
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  /** Upload with progress (XHR — fetch can't report upload progress). */
  function putFile(path, blob, mime, token, onProgress) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('POST', `${CFG.supabaseUrl}/storage/v1/object/${BUCKET}/${path}`);
      x.setRequestHeader('apikey', CFG.supabaseKey);
      x.setRequestHeader('Authorization', 'Bearer ' + token);
      x.setRequestHeader('Content-Type', mime);
      x.setRequestHeader('cache-control', 'max-age=31536000');
      x.setRequestHeader('x-upsert', 'false');
      x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      x.onload = () => {
        if (x.status >= 200 && x.status < 300) return resolve();
        let msg = 'Upload failed (' + x.status + ')';
        try { const j = JSON.parse(x.responseText); msg = j.message || j.error || msg; } catch (e) { /* not json */ }
        if (/mime type .* not supported|invalid_mime_type/i.test(msg)) msg = 'That audio format isn’t accepted. Use MP3, M4A, WAV, WebM, OGG or FLAC.';
        if (/exceeded the maximum allowed size|payload too large/i.test(msg) || x.status === 413) msg = 'That file is larger than 50 MB. Export it at a lower bitrate (e.g. 64–96 kbps MP3) and try again.';
        if (/row-level security|unauthorized|not allowed/i.test(msg) || x.status === 403) msg = 'This account isn’t an admin, so it can’t upload.';
        reject(new Error(msg));
      };
      x.onerror = () => reject(new Error('Upload failed — check your connection and try again.'));
      x.send(blob);
    });
  }

  /** Create a recording: upload the audio, then add it to the library. */
  async function create({ blob, filename, title, description, guide, category, duration, published }, onProgress) {
    const c = await client();
    const mime = mimeOf(blob, filename);
    if (!EXT[mime]) throw new Error('That doesn’t look like a supported audio file (MP3, M4A, WAV, WebM, OGG or FLAC).');
    if (blob.size > MAX_BYTES) throw new Error('That file is larger than 50 MB. Export it at a lower bitrate (e.g. 64–96 kbps MP3) and try again.');
    const { data: s } = await c.auth.getSession();
    if (!s.session) throw new Error('Please sign in again.');
    const path = `${uuid()}.${EXT[mime]}`;
    await putFile(path, blob, mime, s.session.access_token, onProgress);
    const row = { title: title.trim(), description: (description || '').trim(), guide: (guide || '').trim(), category, duration_sec: Math.max(1, Math.round(duration)), audio_path: path, mime, size_bytes: blob.size, published: !!published };
    const { data, error } = await c.from('audio_meditations').insert(row).select(COLS).single();
    if (error) { await c.storage.from(BUCKET).remove([path]).catch(() => {}); throw error; }
    refresh(true);
    return norm(data);
  }
  async function update(id, patch) {
    const c = await client();
    const row = {};
    if (patch.title != null) row.title = patch.title.trim();
    if (patch.description != null) row.description = patch.description.trim();
    if (patch.guide != null) row.guide = patch.guide.trim();
    if (patch.category != null) row.category = patch.category;
    if (patch.published != null) row.published = !!patch.published;
    const { data, error } = await c.from('audio_meditations').update(row).eq('id', id).select(COLS).single();
    if (error) throw error;
    refresh(true);
    return norm(data);
  }
  async function remove(it) {
    const c = await client();
    const { error } = await c.from('audio_meditations').delete().eq('id', it.id);
    if (error) throw error;
    await c.storage.from(BUCKET).remove([it.path]).catch(() => {});
    if (downloads[it.id]) await removeDownload(it);
    items = items.filter((x) => x.id !== it.id); write(LIST_KEY, { items, at: lastFetch }); emit('list');
  }

  // keep the admin flag in step with sign-in / sign-out
  if (enabled && window.Sync) Sync.on((evt) => { if (evt === 'auth') checkAdmin(); });

  window.Library = {
    enabled, CATEGORIES, MAX_BYTES,
    get items() { return items; },
    get(id) { return items.find((x) => x.id === id) || null; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    refresh, audioUrl, playableUrl, isDownloaded, download, removeDownload, downloadedBytes,
    isAdmin, checkAdmin, adminList, create, update, remove, mimeOf
  };
})();
