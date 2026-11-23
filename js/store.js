import { api } from './api.js?v=20261123125934';
import { toast } from './ui.js?v=20261123125934';

let state = null;
let listeners = new Set();
let timer = null;
let saving = false;
let dirty = false;
let pendingRemote = null;
let syncStarted = false;
let remoteToastAt = 0;
let pendingNotify = false;

export function initStore(initial) {
  if (initial) {
    if (!Array.isArray(initial.stretchLogs)) initial.stretchLogs = [];
    if (!Array.isArray(initial.coreLogs)) initial.coreLogs = [];
    if (!initial.weightLogs || typeof initial.weightLogs !== 'object' || Array.isArray(initial.weightLogs)) {
      initial.weightLogs = {};
    }
    if (!initial.settings || typeof initial.settings !== 'object') initial.settings = {};
    if (!(Number(initial.settings.corePerWeek) > 0)) initial.settings.corePerWeek = 3;
    if (!(Number(initial.settings.weightGoal) > 0)) initial.settings.weightGoal = 0;
    if (typeof initial.settings.weightGoalDate !== 'string') initial.settings.weightGoalDate = '';
  }
  state = initial;
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  for (const fn of listeners) fn(state);
}

/** Apply a mutation locally, re-render, then persist (debounced). */
export function update(mutator) {
  if (!state) return;
  mutator(state);
  notify();
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(flush, 250);
}

/** Replace the whole state (after conflict / external reload). */
export function replaceState(next) {
  if (!next) return;
  state = next;
  notify();
}

/* ---------------- live sync ---------------- */

function isInlineEditing() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return false;
  const view = document.getElementById('view');
  return !!(view && view.contains(el));
}

function showSyncedToast() {
  const now = Date.now();
  if (now - remoteToastAt < 2500) return;
  remoteToastAt = now;
  toast('Synced from another device', 'info');
}

function notifyWhenDoneEditing() {
  if (pendingNotify) return;
  pendingNotify = true;
  const handler = () => {
    window.setTimeout(() => {
      if (!isInlineEditing()) {
        document.removeEventListener('focusout', handler);
        pendingNotify = false;
        notify();
      }
    }, 60);
  };
  document.addEventListener('focusout', handler);
}

/**
 * Apply a state pushed by another device. Never overwrites a local save that
 * is still in flight; it waits for the save to finish instead.
 */
export function applyRemoteState(next, { silent = false } = {}) {
  if (!next || !state) return;
  if (Number(next.rev) <= Number(state.rev)) return;
  if (saving || dirty) {
    pendingRemote = next;
    return;
  }
  const editing = isInlineEditing();
  state = next;
  if (editing) {
    notifyWhenDoneEditing();
  } else {
    notify();
  }
  if (!silent) showSyncedToast();
}

function setSyncStatus(on) {
  const el = document.getElementById('sync-live');
  if (!el) return;
  el.classList.toggle('off', !on);
  const label = el.querySelector('em');
  if (label) label.textContent = on ? 'Cloud sync' : 'Reconnecting…';
}

export async function refreshFromServer({ silent = true } = {}) {
  if (!state) return;
  if (saving || dirty) {
    window.setTimeout(() => refreshFromServer({ silent }), 1200);
    return;
  }
  try {
    const next = await api.loadState();
    setSyncStatus(true);
    if (next) applyRemoteState(next, { silent });
  } catch (_) {
    setSyncStatus(false);
  }
}

export function startSync() {
  if (syncStarted || !state) return;
  syncStarted = true;

  if (api.mode === 'cloud') {
    setSyncStatus(true);
    const poll = () => {
      if (!document.hidden) refreshFromServer({ silent: true });
    };
    window.setInterval(poll, 4000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshFromServer({ silent: true });
    });
    window.addEventListener('online', () => refreshFromServer({ silent: true }));
    poll();
    return;
  }

  if (typeof EventSource !== 'undefined' && api.eventsUrl) {
    const source = new EventSource(api.eventsUrl);
    source.onopen = () => setSyncStatus(true);
    source.addEventListener('hello', () => {
      setSyncStatus(true);
      refreshFromServer({ silent: true });
    });
    source.addEventListener('state', (event) => {
      setSyncStatus(true);
      try {
        const payload = JSON.parse(event.data);
        applyRemoteState(payload.state, { silent: false });
      } catch (_) {
        /* Ignore malformed events. */
      }
    });
    source.onerror = () => setSyncStatus(false);
  }
}

export async function flush() {
  if (!state || !dirty || saving) return;
  saving = true;
  dirty = false;
  try {
    const result = await api.saveState(state);
    if (result && result.conflict) {
      state = result.state || state;
      notify();
      toast('Data refreshed from another device', 'info');
      return;
    }
    if (result && typeof result.rev === 'number') {
      state.rev = result.rev;
    }
    setSyncStatus(true);
  } catch (err) {
    dirty = true;
    setSyncStatus(false);
    toast(err.message || 'Could not save — retrying', 'error');
    clearTimeout(timer);
    timer = setTimeout(flush, 4000);
  } finally {
    saving = false;
    if (!dirty && pendingRemote) {
      const next = pendingRemote;
      pendingRemote = null;
      applyRemoteState(next);
    }
  }
}
