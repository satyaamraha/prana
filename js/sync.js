/* Prana — accounts (Supabase Auth) and cross-device sync.
 * The Supabase library is loaded on demand from a pinned CDN build with an
 * integrity hash, so people who never sign in download nothing extra and the
 * app keeps working fully offline. */
(function () {
  'use strict';
  const CFG = window.PRANA_CONFIG || {};
  const LIB = {
    src: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js',
    integrity: 'sha384-TcHRA3zBbn+Lexh5n+Oil4guNPOS3rjNDpGRAN46u/s/mB2IZ50ceC6TYDU2yvgK'
  };
  const AUTH_KEY = 'prana.auth';
  const META_KEY = 'prana.sync';
  const enabled = !!(CFG.supabaseUrl && CFG.supabaseKey);

  let client = null, loading = null, user = null;
  let state = { status: enabled ? 'signed-out' : 'disabled', error: null, lastSync: null };
  try { Object.assign(state, JSON.parse(localStorage.getItem(META_KEY) || '{}'), { status: state.status, error: null }); } catch (e) { /* ignore */ }
  const listeners = new Set();
  const emit = (evt) => listeners.forEach((fn) => { try { fn(evt, state); } catch (e) { console.error(e); } });
  function setState(patch, evt) {
    Object.assign(state, patch);
    try { localStorage.setItem(META_KEY, JSON.stringify({ lastSync: state.lastSync })); } catch (e) { /* ignore */ }
    emit(evt || 'state');
  }

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB.src; s.integrity = LIB.integrity; s.crossOrigin = 'anonymous'; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; s.remove(); reject(new Error('Couldn’t reach the sign-in service. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  const redirectTo = () => location.origin + location.pathname;

  async function getClient() {
    if (!enabled) throw new Error('Accounts aren’t set up for this app yet.');
    if (client) return client;
    await loadLib();
    client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: AUTH_KEY }
    });
    client.auth.onAuthStateChange((event, session) => {
      const prev = user && user.id;
      user = session ? session.user : null;
      if (event === 'PASSWORD_RECOVERY') emit('recovery');
      if (!user) setState({ status: 'signed-out' }, 'auth');
      else if (user.id !== prev) { setState({ status: 'synced' }, 'auth'); setTimeout(() => syncNow(), 0); }
    });
    const { data } = await client.auth.getSession();
    user = data.session ? data.session.user : null;
    setState({ status: user ? 'synced' : 'signed-out' }, 'auth');
    cleanUrl();
    return client;
  }

  /** Remove ?code=… / error params left by email links. */
  function cleanUrl() {
    const u = new URL(location.href);
    let changed = false;
    for (const p of ['code', 'error', 'error_code', 'error_description']) if (u.searchParams.has(p)) { u.searchParams.delete(p); changed = true; }
    if (changed) history.replaceState(null, '', u.pathname + (u.search || '') + (u.hash || '#/'));
  }
  function urlAuthError() {
    const u = new URL(location.href);
    const hashParams = new URLSearchParams((location.hash.split('?')[1]) || location.hash.replace(/^#/, ''));
    return u.searchParams.get('error_description') || hashParams.get('error_description');
  }

  // ---- auth actions ------------------------------------------------------------
  const friendly = (e) => {
    const m = (e && (e.message || e.error_description)) || String(e);
    if (/invalid login credentials/i.test(m)) return 'That email and password don’t match. Try again or reset your password.';
    if (/email not confirmed/i.test(m)) return 'Please confirm your email first — check your inbox for the link.';
    if (/user already registered/i.test(m)) return 'There’s already an account with that email. Sign in instead.';
    if (/password should be at least/i.test(m)) return 'Password must be at least 6 characters.';
    if (/rate limit|too many/i.test(m)) return 'Too many attempts. Please wait a few minutes and try again.';
    if (/failed to fetch|network/i.test(m)) return 'Couldn’t reach the server. Check your connection.';
    return m;
  };
  async function run(fn) {
    try { return await fn(await getClient()); }
    catch (e) { throw new Error(friendly(e)); }
  }
  const check = ({ data, error }) => { if (error) throw error; return data; };

  const signUp = (email, password) => run(async (c) => {
    const d = check(await c.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } }));
    return { needsConfirm: !d.session };
  });
  const signIn = (email, password) => run(async (c) => check(await c.auth.signInWithPassword({ email, password })));
  const magicLink = (email) => run(async (c) => check(await c.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } })));
  const resetPassword = (email) => run(async (c) => check(await c.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() })));
  const updatePassword = (password) => run(async (c) => check(await c.auth.updateUser({ password })));
  /** Sign out. Progress is saved to the cloud first, then removed from this device
   *  (settings stay) so someone else signing in here can't merge into it. */
  const signOut = () => run(async (c) => {
    await syncNow();
    if (state.status === 'error') throw new Error('Couldn’t save your latest progress — check your connection before signing out.');
    const { error } = await c.auth.signOut({ scope: 'local' });
    if (error) throw error;
    user = null;
    const keep = Store.snapshot();
    Store.replace({ profile: { onboarded: true, name: '' }, settings: keep.settings }, { silent: true });
    setState({ status: 'signed-out', lastSync: null }, 'data');
  });
  const deleteAccount = () => run(async (c) => {
    check(await c.rpc('delete_my_account'));
    await c.auth.signOut({ scope: 'local' });
    user = null; setState({ status: 'signed-out', lastSync: null }, 'auth');
  });

  // ---- sync ----------------------------------------------------------------------
  let syncing = false, again = false, timer = 0;
  async function syncNow() {
    if (!user || !client) return;
    if (syncing) { again = true; return; }
    if (!navigator.onLine) { setState({ status: 'offline' }); return; }
    syncing = true; setState({ status: 'syncing', error: null });
    try {
      const { data: row, error } = await client.from('user_data').select('data, updated_at').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      const local = Store.snapshot();
      const merged = row && row.data ? Store.mergeDocs(local, row.data) : local;
      const changedLocally = JSON.stringify(merged) !== JSON.stringify(local);
      if (changedLocally) Store.replace(merged, { silent: true });
      const up = await client.from('user_data').upsert({ user_id: user.id, data: Store.snapshot() });
      if (up.error) throw up.error;
      setState({ status: 'synced', lastSync: Date.now() }, changedLocally ? 'data' : 'state');
    } catch (e) {
      setState({ status: 'error', error: friendly(e) });
    } finally {
      syncing = false;
      if (again) { again = false; schedule(); }
    }
  }
  function schedule(ms) {
    if (!user) return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, ms == null ? 2500 : ms);
  }
  Store.onChange(() => schedule());
  window.addEventListener('online', () => schedule(500));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(300); });

  /** Restore a saved session (or finish an email-link sign-in) on startup. */
  function boot() {
    if (!enabled) return;
    let hasSession = false;
    try { hasSession = !!localStorage.getItem(AUTH_KEY); } catch (e) { /* ignore */ }
    const fromEmail = new URL(location.href).searchParams.has('code') || /error_description/.test(location.href);
    if (!hasSession && !fromEmail) return;
    const err = urlAuthError();
    getClient().then(() => {
      if (err) emit({ type: 'link-error', message: err });
      else if (fromEmail && user) emit({ type: 'link-signed-in' });
      else if (fromEmail && !user) emit({ type: 'link-error', message: 'Your email is confirmed. Please sign in to continue.' });
    }).catch((e) => setState({ status: 'error', error: friendly(e) }));
  }

  window.Sync = {
    get enabled() { return enabled; },
    get ready() { return !!client; },
    get user() { return user; },
    get state() { return state; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getClient, boot, syncNow, signUp, signIn, magicLink, resetPassword, updatePassword, signOut, deleteAccount
  };
})();
