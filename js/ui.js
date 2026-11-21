/* Shared UI helpers: icons, formatting, modals, toasts. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------------- icons ---------------- */
const PATHS = {
  today:
    '<path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  moon: '<path d="M20.5 13.2A8.6 8.6 0 1 1 10.8 3.5a6.9 6.9 0 0 0 9.7 9.7Z"/>',
  habits:
    '<circle cx="12" cy="12" r="9"/><path d="m8.4 12.4 2.4 2.4 4.8-5.2"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
  stretch:
    '<circle cx="12" cy="5" r="2"/><path d="M12 7.5v5.5m0 0-3.2 6m3.2-6 3.2 6M6.2 9.8l5.8 1.4 5.8-1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  download:
    '<path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M4 17v3h16v-3"/>',
  trash:
    '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
  flame:
    '<path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-2 1-3.6 2.2-5.1C10.4 5.5 12 3 12 3Z"/><path d="M12 21a3 3 0 0 0 3-3c0-1.7-3-5-3-5s-3 3.3-3 5a3 3 0 0 0 3 3Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  copy: '<path d="M4 8h16v12H4z"/><path d="M3 4.5h18v3.5H3zM9.5 12.5h5"/>',
  bolt: '<path d="M13 2 4.5 13.5H11l-1 8.5 9-12h-6.5z"/>',
  pulse: '<path d="M3 12h4l2.5-7 4.5 14 2.5-7H21"/>',
  note: '<path d="M5 4h14v16H5z"/><path d="M8.5 9h7M8.5 13h7M8.5 17h4"/>',
  pencil: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="m14 6 4 4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  scale:
    '<rect x="3.5" y="4" width="17" height="16" rx="4"/><path d="M8 15.5a4 4 0 0 1 8 0"/><path d="M12 15.5l2.2-3.4"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M12 13v4M8.5 21h7M10 21c0-2 .8-4 2-4s2 2 2 4"/>',
  sunrise:
    '<path d="M4 18h16M6.5 14.5a5.5 5.5 0 0 1 11 0"/><path d="M12 3v4M4.6 8.6l2.8 2.8M19.4 8.6l-2.8 2.8M2 21h20"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>',
  alert:
    '<path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17v.5"/>',
  sparkles:
    '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  arrowRight: '<path d="M4 12h15m0 0-5-5m5 5-5 5"/>',
  power:
    '<path d="M12 3v9"/><path d="M6.4 6.5a8 8 0 1 0 11.2 0"/>',
  heart:
    '<path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 3.4C19.5 15.4 12 20 12 20Z"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6M12 2v3"/>',
  walking:
    '<circle cx="13" cy="4.5" r="1.8"/><path d="M11 8.5 9 13l2.5 2 .8 5.5M15 8.5l1.5 4.5-2 3M7 21l2.5-6M17 21l-1-4.5"/>',
};

export function icon(name, cls = '') {
  const path = PATHS[name] || PATHS.info;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

/* ---------------- escaping ---------------- */
export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

export function uid(prefix = 'x') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ---------------- dates & times ---------------- */
export function isoDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return isoDate(new Date());
}

/** Turn an ISO timestamp into a LOCAL YYYY-MM-DD key. */
export function localDateKey(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return isoDate(d);
}

/** Parse YYYY-MM-DD as a LOCAL date (avoids UTC shifting). */
export function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -offset);
}

export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function parseWeekKey(key) {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(key || ''));
  if (!match) return startOfWeek(new Date());
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(year, 0, 4, 12);
  return addDays(startOfWeek(jan4), (week - 1) * 7);
}

export function shiftWeek(key, delta) {
  return weekKey(addDays(parseWeekKey(key), delta * 7));
}

export function weekDays(key) {
  const monday = parseWeekKey(key);
  return Array.from({ length: 7 }, (_, i) => isoDate(addDays(monday, i)));
}

export function weekNumber(key) {
  return Number(String(key).split('-W')[1]) || 1;
}

export function weekLabel(key) {
  const monday = parseWeekKey(key);
  const sunday = addDays(monday, 6);
  const month = (d) => d.toLocaleDateString('en-US', { month: 'short' });
  const range =
    monday.getMonth() === sunday.getMonth()
      ? `${month(monday)} ${monday.getDate()} – ${sunday.getDate()}`
      : `${month(monday)} ${monday.getDate()} – ${month(sunday)} ${sunday.getDate()}`;
  return { title: `Week ${weekNumber(key)}`, range };
}

export function isCurrentWeek(key) {
  return key === weekKey(new Date());
}

export function fmtDate(iso, style = 'medium') {
  const d = parseISO(iso);
  if (style === 'weekday') return d.toLocaleDateString('en-US', { weekday: 'long' });
  if (style === 'day') return d.toLocaleDateString('en-US', { weekday: 'short' });
  if (style === 'short') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (style === 'full') {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function relativeDay(iso) {
  if (iso === todayISO()) return 'Today';
  if (iso === isoDate(addDays(new Date(), -1))) return 'Yesterday';
  return fmtDate(iso, 'medium');
}

export function timeToMin(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function minToTime(total) {
  const v = ((Math.round(total) % 1440) + 1440) % 1440;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Minutes since 18:00, used to keep bed/wake times on one continuous axis. */
export function clockToAxis(min) {
  return ((min - 1080) % 1440 + 1440) % 1440;
}
export function axisToClock(v) {
  return ((1080 + v) % 1440 + 1440) % 1440;
}

export function deltaInfo(actualMin, targetMin) {
  let diff = actualMin - targetMin;
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  const abs = Math.abs(Math.round(diff));
  let label;
  if (abs < 1) label = 'on target';
  else label = `${abs} min ${diff > 0 ? 'late' : 'early'}`;
  const tone = abs <= 15 ? 'green' : abs <= 45 ? 'amber' : 'red';
  return { diff, abs, label, tone };
}

export function fmtDuration(minutes) {
  const m = Math.round(Number(minutes) || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

/* ---------------- numbers ---------------- */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
export function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}
export function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}
export function mean(arr) {
  return arr.length ? sum(arr) / arr.length : 0;
}
export function pct(a, b) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}
export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/* ---------------- toasts ---------------- */
export function toast(message, type = 'success') {
  const wrap = $('#toasts');
  if (!wrap) return;
  while (wrap.children.length >= 3) wrap.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ic = type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check';
  el.innerHTML = `${icon(ic)}<span>${escapeHtml(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }, 2800);
}

/* ---------------- modals ---------------- */
let openModals = 0;

export function openModal({ title, body = '', footer = '', onMount, onClose, labelledBy }) {
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal-head">
        <div class="modal-title">${escapeHtml(title)}</div>
        <button class="icon-btn" type="button" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  root.appendChild(backdrop);
  openModals += 1;
  document.body.style.overflow = 'hidden';

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.remove();
    openModals = Math.max(0, openModals - 1);
    if (!openModals) document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  $$('[data-close]', backdrop).forEach((btn) => btn.addEventListener('click', close));

  if (onMount) onMount(backdrop);
  setTimeout(() => {
    const first = backdrop.querySelector(
      '.modal-body input:not([type="hidden"]):not([readonly]), .modal-body select, .modal-body textarea'
    );
    if (first) first.focus();
  }, 80);

  return { root: backdrop, modal: $('.modal', backdrop), close };
}

export function formModal({
  title,
  body = '',
  submitText = 'Save',
  cancelText = 'Cancel',
  onSubmit,
  onMount,
  extraHtml = '',
  danger = false,
}) {
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal-head">
        <div class="modal-title">${escapeHtml(title)}</div>
        <button class="icon-btn" type="button" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <form>
        <div class="modal-body">${body}</div>
        <div class="modal-foot">
          ${extraHtml}
          <button type="button" class="btn btn-secondary" data-close>${escapeHtml(cancelText)}</button>
          <button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${escapeHtml(submitText)}</button>
        </div>
      </form>
    </div>`;
  root.appendChild(backdrop);
  openModals += 1;
  document.body.style.overflow = 'hidden';

  const form = $('form', backdrop);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.remove();
    openModals = Math.max(0, openModals - 1);
    if (!openModals) document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  $$('[data-close]', backdrop).forEach((btn) => btn.addEventListener('click', close));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      if (submitBtn) submitBtn.disabled = true;
      const result = await onSubmit(data, form);
      if (result !== false) close();
    } catch (err) {
      toast((err && err.message) || 'Something went wrong', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  if (onMount) onMount(backdrop, form);
  setTimeout(() => {
    const first = backdrop.querySelector(
      '.modal-body input:not([type="hidden"]):not([readonly]), .modal-body select, .modal-body textarea'
    );
    if (first) first.focus();
  }, 80);

  return { root: backdrop, form, close };
}

export function confirmDialog({ title = 'Are you sure?', message, confirmText = 'Delete', danger = true }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const { root, close } = openModal({
      title,
      body: `<p class="muted" style="font-size:14px;line-height:1.55">${escapeHtml(message)}</p>`,
      footer: `${''}<button type="button" class="btn btn-secondary" data-no>Cancel</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${escapeHtml(confirmText)}</button>`,
      onClose: () => finish(false),
    });
    $('[data-no]', root).addEventListener('click', () => {
      finish(false);
      close();
    });
    $('[data-yes]', root).addEventListener('click', () => {
      finish(true);
      close();
    });
  });
}

/* ---------------- small markup builders ---------------- */
export function animateDash(ring, from) {
  if (!ring?.animate || !Number.isFinite(from) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = Number(ring.getAttribute('stroke-dashoffset'));
  if (Math.abs(to - from) < .05) return;
  ring.animate(
    [{ strokeDashoffset: `${from}px` }, { strokeDashoffset: `${to}px` }],
    { duration: 640, easing: 'cubic-bezier(.18,.8,.22,1)' }
  );
}

export function progressRing({
  value,
  max,
  valueText,
  label = '',
  tone = 'accent',
  size = 88,
}) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;
  const offset = circ * (1 - ratio);
  const complete = max > 0 && value >= max;
  const green = complete || tone === 'green';
  const cls = green ? 'green complete' : '';
  const gid = `ring-${Math.random().toString(36).slice(2, 9)}`;
  const from = green ? '#34C759' : '#0A84FF';
  const to = green ? '#248A3D' : '#0066CC';
  return `
    <div class="ring ${cls}" style="--size:${size}px">
      <svg viewBox="0 0 84 84" aria-hidden="true">
        <defs>
          <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${from}"></stop>
            <stop offset="1" stop-color="${to}"></stop>
          </linearGradient>
        </defs>
        <circle class="track" cx="42" cy="42" r="${radius}"></circle>
        <circle class="fill" cx="42" cy="42" r="${radius}"
          style="stroke:url(#${gid});--circ:${circ.toFixed(2)};--offset:${offset.toFixed(2)}"
          stroke-dasharray="${circ.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"></circle>
      </svg>
      <div class="ring-center">
        <div class="ring-value">${escapeHtml(valueText != null ? valueText : `${value}/${max}`)}</div>
        ${label ? `<div class="ring-label">${escapeHtml(label)}</div>` : ''}
      </div>
    </div>`;
}

/** Apple Fitness–style triple activity rings. Values are 0–100. */
export function activityRings({
  move = 0,
  exercise = 0,
  stand = 0,
  centerText = '',
  label = '',
  size = 128,
}) {
  const rings = [
    { value: move, r: 50, cls: 'ar-move' },
    { value: exercise, r: 39, cls: 'ar-exercise' },
    { value: stand, r: 28, cls: 'ar-stand' },
  ];
  const stroke = 8;
  return `
    <div class="activity-rings" style="--size:${size}px">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        ${rings
          .map((ring) => {
            const trackCls = ring.cls.replace('ar-', 'ar-track-');
            return `<circle class="ar-track ${trackCls}" cx="60" cy="60" r="${ring.r}" stroke-width="${stroke}"></circle>`;
          })
          .join('')}
        ${rings
          .map((ring) => {
            const circ = 2 * Math.PI * ring.r;
            const offset = circ * (1 - clamp(ring.value / 100, 0, 1));
            return `<circle class="ar-fill ${ring.cls}" cx="60" cy="60" r="${
              ring.r
            }" stroke-width="${stroke}" stroke-dasharray="${circ.toFixed(
              2
            )}" stroke-dashoffset="${offset.toFixed(
              2
            )}" style="--circ:${circ.toFixed(2)};--offset:${offset.toFixed(
              2
            )}"></circle>`;
          })
          .join('')}
      </svg>
      <div class="rings-center">
        <b>${escapeHtml(centerText)}</b>
        <span>${escapeHtml(label)}</span>
      </div>
    </div>`;
}

function emptyArt(iconName) {
  const kind = {
    moon: 'sleep',
    dumbbell: 'train',
    stretch: 'stretch',
    calendar: 'plan',
    note: 'plan',
    chart: 'spark',
    sparkles: 'spark',
  }[iconName];
  if (!kind) return '';
  const id = uid('art');

  if (kind === 'sleep') {
    return `<div class="empty-art"><svg viewBox="0 0 220 130" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="${id}g">
          <stop stop-color="#5E5CE6" stop-opacity=".22"/>
          <stop offset="1" stop-color="#5E5CE6" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${id}m" x1="62" y1="24" x2="136" y2="98" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0A84FF"/>
          <stop offset="1" stop-color="#5E5CE6"/>
        </linearGradient>
        <mask id="${id}k">
          <rect width="220" height="130" fill="#fff"/>
          <circle cx="124" cy="50" r="34" fill="#000"/>
        </mask>
      </defs>
      <circle cx="108" cy="62" r="58" fill="url(#${id}g)"/>
      <circle cx="100" cy="62" r="38" fill="url(#${id}m)" mask="url(#${id}k)"/>
      <circle cx="158" cy="30" r="2.1" fill="#0A84FF" opacity=".45"/>
      <circle cx="176" cy="56" r="1.5" fill="#5E5CE6" opacity=".45"/>
      <circle cx="56" cy="28" r="1.4" fill="#0A84FF" opacity=".35"/>
      <circle cx="38" cy="58" r="1.1" fill="#5E5CE6" opacity=".3"/>
      <path d="M28 110c28-14 56-14 84 0s56 14 80 0" stroke="#0A84FF" stroke-opacity=".2" stroke-width="1.5" stroke-linecap="round"/>
    </svg></div>`;
  }

  if (kind === 'train') {
    return `<div class="empty-art"><svg viewBox="0 0 220 130" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="#FF9F0A" stop-opacity=".24"/>
          <stop offset="1" stop-color="#FF9F0A" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="${id}l" x1="24" y1="100" x2="196" y2="32" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF9F0A"/>
          <stop offset="1" stop-color="#FF375F"/>
        </linearGradient>
      </defs>
      <path d="M24 102c32-12 52-42 82-44s48 22 92-24v70H24z" fill="url(#${id}a)"/>
      <path d="M24 102c32-12 52-42 82-44s48 22 92-24" stroke="url(#${id}l)" stroke-width="2" stroke-linecap="round"/>
      <g transform="translate(66 60) rotate(-11)">
        <rect x="0" y="8" width="88" height="5" rx="2.5" fill="#FF9F0A" opacity=".65"/>
        <rect x="0" y="0" width="9" height="21" rx="3" fill="#FF9F0A"/>
        <rect x="79" y="0" width="9" height="21" rx="3" fill="#FF9F0A"/>
        <rect x="-8" y="3" width="6" height="15" rx="2" fill="#FF375F" opacity=".7"/>
        <rect x="90" y="3" width="6" height="15" rx="2" fill="#FF375F" opacity=".7"/>
      </g>
      <circle cx="180" cy="28" r="1.7" fill="#FF9F0A" opacity=".45"/>
    </svg></div>`;
  }

  if (kind === 'stretch') {
    return `<div class="empty-art"><svg viewBox="0 0 220 130" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="${id}r" x1="18" y1="104" x2="204" y2="18" gradientUnits="userSpaceOnUse">
          <stop stop-color="#BF5AF2"/>
          <stop offset=".5" stop-color="#5E5CE6"/>
          <stop offset="1" stop-color="#64D2FF"/>
        </linearGradient>
      </defs>
      <path d="M18 92c26-54 58-54 82 0s54 54 102-6" stroke="url(#${id}r)" stroke-width="2" stroke-linecap="round" opacity=".9"/>
      <path d="M18 106c26-54 58-54 82 0s54 54 102-6" stroke="url(#${id}r)" stroke-width="1.2" stroke-linecap="round" opacity=".38"/>
      <circle cx="123" cy="66" r="3.5" fill="#64D2FF" opacity=".65"/>
      <circle cx="42" cy="30" r="1.5" fill="#BF5AF2" opacity=".5"/>
      <circle cx="192" cy="96" r="1.7" fill="#5E5CE6" opacity=".45"/>
    </svg></div>`;
  }

  if (kind === 'plan') {
    return `<div class="empty-art"><svg viewBox="0 0 220 130" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="${id}p" x1="44" y1="26" x2="164" y2="108" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0A84FF" stop-opacity=".1"/>
          <stop offset="1" stop-color="#FF9F0A" stop-opacity=".06"/>
        </linearGradient>
      </defs>
      <rect x="44" y="24" width="120" height="84" rx="13" fill="url(#${id}p)" stroke="#D1D1D6"/>
      <path d="M44 47h120" stroke="#D1D1D6"/>
      <circle cx="58" cy="35" r="2" fill="#8E8E93"/>
      <circle cx="68" cy="35" r="2" fill="#8E8E93"/>
      <g fill="#C7C7CC">
        <circle cx="62" cy="62" r="2.2"/><circle cx="82" cy="62" r="2.2"/><circle cx="102" cy="62" r="2.2"/><circle cx="122" cy="62" r="2.2"/><circle cx="142" cy="62" r="2.2"/>
        <circle cx="62" cy="82" r="2.2"/><circle cx="82" cy="82" r="2.2"/><circle cx="122" cy="82" r="2.2"/><circle cx="142" cy="82" r="2.2"/>
      </g>
      <rect x="96" y="72" width="20" height="20" rx="5" fill="#0A84FF"/>
      <path d="m101 82 3 3 6-7" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="172" cy="38" r="9" stroke="#FF9F0A" stroke-opacity=".55" stroke-width="1.4"/>
    </svg></div>`;
  }

  return `<div class="empty-art"><svg viewBox="0 0 220 130" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="${id}s" x1="40" y1="95" x2="180" y2="25" gradientUnits="userSpaceOnUse">
        <stop stop-color="#0A84FF"/>
        <stop offset="1" stop-color="#BF5AF2"/>
      </linearGradient>
    </defs>
    <circle cx="108" cy="64" r="42" stroke="#D1D1D6" stroke-dasharray="3 7"/>
    <circle cx="108" cy="64" r="27" stroke="#0A84FF" stroke-opacity=".3"/>
    <path d="M48 98c24-36 44-48 60-30s34 14 64-24" stroke="url(#${id}s)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="172" cy="44" r="3" fill="#BF5AF2"/>
  </svg></div>`;
}

export function emptyState({ iconName = 'sparkles', title, text = '', action = '' }) {
  return `
    <div class="empty">
      ${emptyArt(iconName) || `<div class="empty-icon">${icon(iconName)}</div>`}
      <div class="empty-title">${escapeHtml(title)}</div>
      ${text ? `<div class="empty-text">${escapeHtml(text)}</div>` : ''}
      ${action}
    </div>`;
}

export function badge(text, tone = 'muted', iconName = '') {
  return `<span class="badge ${tone}">${iconName ? icon(iconName) : ''}${escapeHtml(text)}</span>`;
}

export function sectionTitle(title, right = '') {
  return `<div class="section-title"><span>${escapeHtml(title)}</span>${right}</div>`;
}
