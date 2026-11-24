import { api } from './api.js?v=20261124092833';
import { initStore, getState, subscribe, startSync } from './store.js?v=20261124092833';
import { initCharts, destroyCharts } from './charts.js?v=20261124092833';
import { $, $$, icon, escapeHtml, fmtDate, todayISO, toast } from './ui.js?v=20261124092833';
import {
  currentWeekKey,
  weekDaysForKey,
  weekLabelForKey,
  todayIndexInWeek,
  programStartsIn,
} from './program.js?v=20261124092833';
import { render as renderToday } from './views/today.js?v=20261124092833';
import { render as renderSleep } from './views/sleep.js?v=20261124092833';
import { render as renderPlan } from './views/plan.js?v=20261124092833';
import { render as renderSport } from './views/sport.js?v=20261124092833';
import { render as renderStretch } from './views/stretch.js?v=20261124092833';

const NAV = [
  { name: 'today', label: 'Today', icon: 'today', href: '#/today', title: 'Today' },
  { name: 'plan', label: 'Plan', icon: 'calendar', href: '#/plan', title: 'Weekly plan' },
  { name: 'sport', label: 'Training', icon: 'dumbbell', href: '#/sport', title: 'Training' },
  { name: 'stretch', label: 'Stretch', icon: 'stretch', href: '#/stretch', title: 'Stretch & core' },
  { name: 'sleep', label: 'Sleep', icon: 'moon', href: '#/sleep', title: 'Sleep & wake' },
];

const VIEWS = {
  today: renderToday,
  sleep: renderSleep,
  plan: renderPlan,
  sport: renderSport,
  stretch: renderStretch,
};

let lastRouteKey = null;
let renderedDate = null;
let routeTimer = null;
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const clean = raw.split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  if (!parts.length) return { name: 'today', param: null };
  const name = VIEWS[parts[0]] ? parts[0] : 'today';
  const param = parts[1] ? decodeURIComponent(parts[1]) : null;
  return { name, param };
}

function buildShell() {
  const app = $('#app');
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">
            <img src="./icons/elan-192.png" alt="" width="46" height="46" />
          </div>
          <div>
            <div class="brand-name">Better</div>
            <div class="brand-sub">Personal tracker</div>
          </div>
        </div>
        <nav class="nav" aria-label="Main">
          ${NAV.map(
            (item) => `
            <a class="nav-item" href="${item.href}" data-nav="${item.name}">
              ${icon(item.icon)}<span>${item.label}</span>
            </a>`
          ).join('')}
        </nav>
        <div class="sidebar-foot">
          <div class="side-program" id="side-program"></div>
          <button class="btn btn-secondary btn-sm" data-export>${icon('download')} Export data</button>
          <div class="sidebar-note">
            Use the same connection key on each device to sync Better.
          </div>
          <div class="sync-live" id="sync-live">
            <span class="sync-dot"></span><em>Cloud sync</em>
          </div>
        </div>
      </aside>

      <main class="main">
        <header class="daily-masthead">
          <span class="masthead-brand"><img src="./icons/icon.svg?v=20261124092833" alt="" width="24" height="24" /> Better <span id="section-label"></span></span>
          <span class="masthead-tools">
            <span id="masthead-note"></span>
            <label class="theme-control">
              <span class="appearance-label">Appearance</span>
              <select id="theme-mode" aria-label="Appearance">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </span>
        </header>
        <div class="view" id="view"></div>
      </main>

      <nav class="tabbar" aria-label="Main">
        ${NAV.map(
          (item) => `
          <a class="tab" href="${item.href}" data-nav="${item.name}">
            ${icon(item.icon)}<span>${item.label}</span>
          </a>`
        ).join('')}
      </nav>
    </div>`;

}

function updateNav(name) {
  $$('[data-nav]').forEach((el) => {
    const active = el.dataset.nav === name;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

function updateSideProgram() {
  const el = $('#side-program');
  const state = getState();
  if (!el || !state) return;
  const week = currentWeekKey();
  const label = weekLabelForKey(week);
  const days = weekDaysForKey(week);
  const plan = state.plans[week] || [];
  const done = plan.filter((s) => s.done).length;
  const pct = plan.length ? Math.round((done / plan.length) * 100) : 0;
  const todayIndex = todayIndexInWeek();
  const startsIn = programStartsIn();

  const pips = days
    .map((date, i) => {
      const dayPlan = plan.filter((s) => Number(s.day) === i);
      const isDone = dayPlan.length > 0 && dayPlan.every((s) => s.done);
      const has = dayPlan.length > 0;
      const cls = [
        'sp-day',
        i === todayIndex ? 'today' : '',
        startsIn > 0 && i === 0 ? 'upcoming' : '',
        isDone ? 'done' : '',
        has ? 'has' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const title = `${fmtDate(date, 'full')} — ${
        dayPlan.length ? dayPlan.map((s) => s.title).join(', ') : 'no sessions'
      }`;
      return `<span class="${cls}" title="${escapeHtml(title)}"><i></i><em>${escapeHtml(
        fmtDate(date, 'day').slice(0, 2)
      )}</em></span>`;
    })
    .join('');

  el.innerHTML = `
    <div class="sp-head"><span>Program</span><b>Week ${label.number}</b></div>

    <div class="sp-range">${escapeHtml(label.range)} · ${
      startsIn === 1 ? 'Starts tomorrow' : startsIn > 0 ? `Starts in ${startsIn} days` : `Day ${todayIndex + 1}`
    }</div>
    <div class="sp-days">${pips}</div>
    <div class="sp-bar"><i style="width:${pct}%"></i></div>
    <div class="sp-foot"><span>${done}/${plan.length} sessions</span><span>${pct}%</span></div>
  `;
}

function renderRoute() {
  if (location.hash === '#/sport/plan') {
    location.replace('#/plan');
    return;
  }
  if (location.hash === '#/sport/exercises') {
    location.replace('#/sport');
    return;
  }
  if (location.hash === '#/habits') {
    location.replace('#/today');
    return;
  }
  const { name, param } = parseHash();
  const view = $('#view');
  if (!view) return;

  const key = `${name}/${param || ''}`;
  const sameRoute = key === lastRouteKey;
  const scrollY = window.scrollY;

  destroyCharts();
  updateNav(name);
  const navItem = NAV.find((n) => n.name === name);
  document.documentElement.dataset.section = name;
  $('#section-label').textContent = param === 'weight' && name === 'sport' ? 'Body weight' : navItem.label;
  document.title = navItem ? `${navItem.title} · Better` : 'Better';
  const note = $('#masthead-note');
  renderedDate = todayISO();
  if (note) note.textContent = fmtDate(renderedDate, 'medium');

  try {
    VIEWS[name](view, param);
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="card"><div class="empty">
      <div class="empty-icon">${icon('alert')}</div>
      <div class="empty-title">Something went wrong</div>
      <div class="empty-text">${escapeHtml(err.message || String(err))}</div>
      <button class="btn btn-secondary" onclick="location.reload()">Reload app</button>
    </div></div>`;
  }

  updateSideProgram();

  if (!sameRoute) {
    view.classList.remove('route-enter');
    void view.offsetWidth;
    view.classList.add('route-enter');
    clearTimeout(routeTimer);
    routeTimer = window.setTimeout(() => view.classList.remove('route-enter'), 1800);
  }

  lastRouteKey = key;
  requestAnimationFrame(() => {
    window.scrollTo(0, sameRoute ? scrollY : 0);
  });
}

let globalActionsReady = false;

function exportState() {
  const state = getState();
  if (!state) return;
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `better-backup-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyCloudKey() {
  const key = api.getKey();
  if (!key) return;
  try {
    await navigator.clipboard.writeText(key);
    toast('Cloud key copied');
  } catch (_) {
    const field = document.createElement('textarea');
    field.value = key;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    try {
      document.execCommand('copy');
      toast('Cloud key copied');
    } catch (_) {
      toast('Could not copy the key', 'error');
    }
    field.remove();
  }
}

function installGlobalActions() {
  if (globalActionsReady) return;
  globalActionsReady = true;
  document.addEventListener('click', (event) => {
    const exportTrigger = event.target.closest('[data-export]');
    if (exportTrigger) {
      event.preventDefault();
      exportState();
      return;
    }
    const keyTrigger = event.target.closest('[data-copy-key]');
    if (keyTrigger) {
      event.preventDefault();
      copyCloudKey();
    }
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (location.protocol !== 'https:' && !local) return;
  navigator.serviceWorker.register('./sw.js').catch(() => {
    /* offline install support is optional */
  });
}

function startApp(state) {
  initStore(state);
  buildShell();
  const themeMode = $('#theme-mode');
  if (themeMode && window.BetterTheme) {
    themeMode.value = window.BetterTheme.mode;
    themeMode.addEventListener('change', () => { window.BetterTheme.set(themeMode.value); });
    window.addEventListener('better-theme-change', () => {
      themeMode.value = window.BetterTheme.mode;
      initCharts();
      renderRoute();
    });
  }
  installGlobalActions();
  const bootEl = $('#boot');
  if (bootEl) bootEl.remove();
  const app = $('#app');
  app.hidden = false;

  subscribe(() => renderRoute());
  window.addEventListener('hashchange', renderRoute);
  if (!location.hash) location.hash = '#/today';
  renderRoute();
  const checkDate = () => {
    if (document.hidden || renderedDate === todayISO()) return;
    if (document.activeElement?.matches('input, textarea, select') || $('#modal-root')?.childElementCount) return;
    renderRoute();
  };
  window.setInterval(checkDate, 15_000);
  window.addEventListener('focus', checkDate);
  document.addEventListener('visibilitychange', checkDate);
  startSync();
  registerServiceWorker();
}

function showBootError(err) {
  const boot = $('#boot');
  if (!boot) return;
  boot.innerHTML = `
    <div class="boot-mark">!</div>
    <div class="boot-text" style="max-width:360px;text-align:center">
      Better couldn’t connect.<br /><span class="faint">${escapeHtml(
        err.message || String(err)
      )}</span>
    </div>
    <button class="btn btn-primary" onclick="location.reload()">Try again</button>`;
}

function showCloudSetup(err) {
  const boot = $('#boot');
  if (!boot) return;
  boot.classList.add('boot-cloud');
  boot.innerHTML = `
    <div class="cloud-setup">
      <div class="cloud-setup-emblem">
        <img src="./icons/elan-192.png" alt="" width="84" height="84" />
      </div>
      <div class="cloud-setup-kicker">Private sync</div>
      <h1>Connect to Better</h1>
      <p class="cloud-setup-copy">
        Paste the private key created for your space. Use the same key on your
        Mac and Android.
      </p>
      <form class="cloud-form" id="cloud-form">
        <input
          class="input"
          id="cloud-key"
          name="key"
          placeholder="RT-XXXX-XXXX-XXXX-XXXX"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          aria-label="Private connection key"
        />
        <button class="btn btn-primary" type="submit" id="cloud-connect">Connect</button>
      </form>
      <div class="cloud-setup-error" id="cloud-error" role="alert">${
        err && err.code === 'BAD_KEY' ? escapeHtml(err.message) : ''
      }</div>
      <p class="cloud-setup-fine">
        Your key is stored only on this device. There is no account to create.
      </p>
    </div>`;
  const form = $('#cloud-form');
  const input = $('#cloud-key');
  const button = $('#cloud-connect');
  const error = $('#cloud-error');
  input.focus();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const key = input.value.trim();
    if (!key) {
      input.focus();
      return;
    }
    button.disabled = true;
    button.textContent = 'Connecting…';
    error.textContent = '';
    try {
      const state = await api.connect(key);
      startApp(state);
    } catch (connectError) {
      error.textContent = connectError.message || 'Could not connect to this space.';
      button.disabled = false;
      button.textContent = 'Connect';
      if (connectError.code === 'BAD_KEY') input.select();
    }
  });
}

async function boot() {
  initCharts();
  api.acceptKeyFromUrl();
  try {
    const state = await api.loadInitial();
    startApp(state);
  } catch (err) {
    console.error(err);
    if (['NEEDS_SETUP', 'BAD_KEY', 'NO_DATA'].includes(err.code)) {
      showCloudSetup(err);
    } else {
      showBootError(err);
    }
  }
}

boot();
