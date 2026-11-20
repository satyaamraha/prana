/* Prana — tiny UI helpers and icon set. */
(function () {
  'use strict';
  const P = (d, fill) => `<svg viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const path = (d) => `<path d="${d}"/>`;

  const ICON = {
    home: P(path('M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z')),
    wind: P(path('M3 8h11a3 3 0 1 0-3-3') + path('M3 12h16a3 3 0 1 1-3 3') + path('M3 16h8')),
    move: P(path('M3 12h4l3-8 4 16 3-8h4')),
    lotus: P(path('M12 20c-4.5 0-8.5-2.2-9.5-6.5 3.2-.2 6.4 1 9.5 4 3.1-3 6.3-4.2 9.5-4-1 4.3-5 6.5-9.5 6.5z') + path('M12 17.5c-2.2-2-3.3-4.6-3.3-7.4 0-2 1.2-4.2 3.3-6.6 2.1 2.4 3.3 4.6 3.3 6.6 0 2.8-1.1 5.4-3.3 7.4z')),
    moon: P(path('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z')),
    chart: P(path('M4 20V11') + path('M10 20V5') + path('M16 20v-7') + path('M21 20H3')),
    gear: P('<circle cx="12" cy="12" r="3"/>' + path('M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z')),
    play: P(path('M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z'), true),
    pause: P('<rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/>', true),
    next: P(path('M5 5.2v13.6a1 1 0 0 0 1.6.8l9-6.8a1 1 0 0 0 0-1.6l-9-6.8A1 1 0 0 0 5 5.2z') + '<rect x="17" y="4" width="2.5" height="16" rx="1"/>', true),
    prev: P(path('M19 5.2v13.6a1 1 0 0 1-1.6.8l-9-6.8a1 1 0 0 1 0-1.6l9-6.8A1 1 0 0 1 19 5.2z') + '<rect x="4.5" y="4" width="2.5" height="16" rx="1"/>', true),
    close: P(path('M6 6l12 12') + path('M18 6L6 18')),
    check: P(path('M5 12.5l4.5 4.5L19 7.5')),
    flame: P(path('M12 22c4 0 7-2.9 7-7 0-4.2-3-6.3-4.2-10.5-2 1.8-3.1 3.8-3.2 6-1-.9-1.9-2-2.1-3.7C7.3 9 5 11.7 5 15c0 4.1 3 7 7 7z')),
    trophy: P(path('M8 21h8') + path('M12 17v4') + path('M7 4h10v5a5 5 0 0 1-10 0z') + path('M17 5h3v2a3 3 0 0 1-3 3') + path('M7 5H4v2a3 3 0 0 0 3 3')),
    clock: P('<circle cx="12" cy="12" r="9"/>' + path('M12 7v5l3 2')),
    chev: P(path('M9 6l6 6-6 6')),
    back: P(path('M15 6l-6 6 6 6')),
    volume: P(path('M4 9.5h3.5L13 5v14l-5.5-4.5H4z') + path('M16.5 9a4.5 4.5 0 0 1 0 6') + path('M19 6.5a8 8 0 0 1 0 11')),
    mute: P(path('M4 9.5h3.5L13 5v14l-5.5-4.5H4z') + path('M17 9.5l5 5') + path('M22 9.5l-5 5')),
    calendar: P('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/>' + path('M3.5 10h17') + path('M8.5 3v4') + path('M15.5 3v4')),
    target: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
    alert: P(path('M12 3l9.5 16.5h-19z') + path('M12 10v4') + path('M12 17h.01')),
    bolt: P(path('M13 2L4 14h7l-1 8 9-12h-7z')),
    sun: P('<circle cx="12" cy="12" r="4"/>' + path('M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4')),
    heart: P(path('M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 4 4 7.3 4c2 0 3.6 1.1 4.7 2.7C13.1 5.1 14.7 4 16.7 4 20 4 22.4 7.2 21.2 10.6 19.5 15.4 12 20 12 20z')),
    leaf: P(path('M5 19c0-8 5.5-14 15-15-1 9.5-7 15-15 15z') + path('M5 19l7-7')),
    sparkle: P(path('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z') + path('M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z')),
    bed: P(path('M3 18v-8') + path('M3 14h18v4') + path('M21 14v-2a3 3 0 0 0-3-3h-7v5') + '<circle cx="7" cy="11.5" r="1.8"/>'),
    stopwatch: P('<circle cx="12" cy="13.5" r="7.5"/>' + path('M12 13.5V10') + path('M10 2.5h4') + path('M18.5 6.5l1.5-1.5')),
    stairs: P(path('M3 20h5v-5h5v-5h5V5h3')),
    download: P(path('M12 4v11') + path('M7 10l5 5 5-5') + path('M4 20h16')),
    upload: P(path('M12 20V9') + path('M7 14l5-5 5 5') + path('M4 4h16')),
    lock: P('<rect x="5" y="11" width="14" height="10" rx="2"/>' + path('M8 11V8a4 4 0 0 1 8 0v3')),
    mic: P('<rect x="9" y="3" width="6" height="11" rx="3"/>' + path('M5 11a7 7 0 0 0 14 0') + path('M12 18v3')),
    stop: P('<rect x="6" y="6" width="12" height="12" rx="2.2"/>', true),
    trash: P(path('M4 7h16') + path('M10 11v6') + path('M14 11v6') + path('M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13') + path('M9 7V4h6v3')),
    edit: P(path('M4 20h4L19 9l-4-4L4 16z') + path('M14 6l4 4')),
    headphones: P(path('M4 15v-3a8 8 0 0 1 16 0v3') + '<rect x="3" y="14" width="4.5" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6"/>'),
    back15: P(path('M4.6 9A8 8 0 1 1 4 12') + path('M4 4.5V9h4.5') + '<text x="12.6" y="15.6" font-size="7.4" font-weight="800" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">15</text>'),
    fwd15: P(path('M19.4 9A8 8 0 1 0 20 12') + path('M20 4.5V9h-4.5') + '<text x="11.4" y="15.6" font-size="7.4" font-weight="800" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">15</text>'),
    repeat: P(path('M17 2l3 3-3 3') + path('M4 11V9a4 4 0 0 1 4-4h12') + path('M7 22l-3-3 3-3') + path('M20 13v2a4 4 0 0 1-4 4H4'))
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }
  function fmtMin(sec) {
    const m = sec / 60;
    if (m < 1) return Math.round(sec) + ' sec';
    return (m < 10 ? Math.round(m * 10) / 10 : Math.round(m)) + ' min';
  }
  let toastT = 0;
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const CAT_COLOR = { breathe: 'var(--breathe)', challenge: 'var(--challenge)', move: 'var(--move)', yoga: 'var(--yoga)', mind: 'var(--mind)' };
  const CAT_LABEL = { breathe: 'Breathing', challenge: 'Breath challenge', move: 'Workout', yoga: 'Yoga', mind: 'Meditation' };

  window.UI = { ICON, esc, $, $$, h, fmt, fmtMin, toast, download, CAT_COLOR, CAT_LABEL };
})();
