/* ============================================================
   Better — GitHub Pages shell + Supabase sync.
   One private space, one state document, one secret key.
   The publishable key is safe to ship; the space key is not.
   ============================================================ */

const BACKEND = {
  url: 'https://ionpogbjxtuwfahigylg.supabase.co',
  apikey: 'sb_publishable_Q-wxx5m9kIMa5Ku56p-dyg_eN-_VEoC',
};

const KEY_SLOT = 'routine.cloud.key';
const CACHE_SLOT = 'routine.cloud.v2.state';
const SYNC_SLOT = 'routine.cloud.v2.syncedAt';
const PENDING_SLOT = 'routine.cloud.v2.pending';
const LEGACY_SLOTS = ['routine.cloud.state', 'routine.cloud.syncedAt', 'routine.cloud.pending'];
const ROW_ID = 'routine-cloud-state-v2';
const MEMBER_ID = 'routine-owner';

export class CloudError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CloudError';
    this.code = code;
  }
}

function storage() {
  try {
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

function read(slot) {
  try {
    return storage()?.getItem(slot) || '';
  } catch (_) {
    return '';
  }
}

function write(slot, value) {
  try {
    if (value == null || value === '') storage()?.removeItem(slot);
    else storage()?.setItem(slot, value);
  } catch (_) {
    /* quota/private mode */
  }
}

function validKey(value) {
  return /^RT(?:-[A-Z0-9]{4}){8}$/.test(String(value || '').trim().toUpperCase());
}

/** Accept a one-time ?key=RT-… link, store it, then clean the address bar. */
export function acceptKeyFromUrl() {
  let url;
  try {
    url = new URL(window.location.href);
  } catch (_) {
    return false;
  }
  const candidate = (url.searchParams.get('key') || '').trim().toUpperCase();
  if (!validKey(candidate)) return false;
  setKey(candidate);
  url.searchParams.delete('key');
  try {
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch (_) {
    /* history can be unavailable in odd webviews */
  }
  return true;
}

export function setKey(value) {
  const key = String(value || '').trim().toUpperCase();
  if (!validKey(key)) {
    throw new CloudError('BAD_KEY', 'That connection key does not look right. It should start with RT- and contain eight groups of four characters.');
  }
  write(KEY_SLOT, key);
  return key;
}

export function getKey() {
  return read(KEY_SLOT);
}

export function hasKey() {
  return validKey(getKey());
}

export function clearKey() {
  write(KEY_SLOT, '');
  write(CACHE_SLOT, '');
  write(SYNC_SLOT, '');
  write(PENDING_SLOT, '');
  for (const slot of LEGACY_SLOTS) write(slot, '');
}

export function cachedState() {
  const raw = read(CACHE_SLOT);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function cacheState(state) {
  try {
    write(CACHE_SLOT, JSON.stringify(state));
  } catch (_) {
    /* if storage is full, cloud still has it */
  }
}

function syncedAt() {
  return read(SYNC_SLOT) || '1970-01-01T00:00:00.000Z';
}

function setSyncedAt(value) {
  if (value) write(SYNC_SLOT, value);
}

async function rpc(name, body) {
  let res;
  try {
    res = await fetch(`${BACKEND.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        apikey: BACKEND.apikey,
        Authorization: `Bearer ${BACKEND.apikey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (_) {
    throw new CloudError('OFFLINE', 'Better is offline. Check your connection.');
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    /* non-JSON */
  }
  if (!res.ok) {
    const detail =
      (json && (json.message || json.hint || json.error_description)) ||
      text.slice(0, 160) ||
      `Cloud request failed (${res.status})`;
    if (/invalid key/i.test(detail)) {
      throw new CloudError('BAD_KEY', 'This connection key is not attached to a Better space.');
    }
    throw new CloudError('CLOUD_ERROR', String(detail));
  }
  return json;
}

function newestState(rows) {
  return (rows || [])
    .filter((row) => row && row.id === ROW_ID && row.kind === 'routine_state' && row.payload)
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
}

async function pull(since = '1970-01-01T00:00:00.000Z') {
  const key = getKey();
  if (!validKey(key)) throw new CloudError('NEEDS_SETUP', 'Connect this device to Better.');
  const data = await rpc('na_pull', { p_key: key, p_since: since });
  return { data, row: newestState(data.joy) };
}

function withServerRev(state, row) {
  if (!state) return null;
  const serverRev = Math.max(
    Number(state.rev) || 0,
    Date.parse(row?.updated_at || '') || 0
  );
  return { ...state, rev: serverRev };
}

/** First load for this device: cloud wins, unless a local unsynced edit exists. */
export async function loadInitial() {
  if (!hasKey()) throw new CloudError('NEEDS_SETUP', 'Connect this device to Better.');
  // Do not replay a queued save from before the reset into the new shared state.
  for (const slot of LEGACY_SLOTS) write(slot, '');
  const local = cachedState();
  const pending = read(PENDING_SLOT) === '1';

  if (pending && local) {
    try {
      const saved = await pushState(local);
      return { ...local, rev: saved.rev };
    } catch (_) {
      return local;
    }
  }

  let pulled;
  try {
    pulled = await pull('1970-01-01T00:00:00.000Z');
  } catch (err) {
    if (
      local &&
      !['BAD_KEY', 'NEEDS_SETUP', 'NO_DATA'].includes(err.code)
    ) {
      return local;
    }
    throw err;
  }
  const { data, row } = pulled;
  if (row) {
    const next = withServerRev(row.payload, row);
    cacheState(next);
    setSyncedAt(data.server_time || row.updated_at);
    write(PENDING_SLOT, '');
    return next;
  }

  if (local) {
    const saved = await pushState(local);
    return { ...local, rev: saved.rev };
  }

  throw new CloudError('NO_DATA', 'No Better data is stored under this key.');
}

/** Poll: returns only when the cloud has a newer state. */
export async function pullChanges() {
  if (!hasKey()) return null;
  const { data, row } = await pull(syncedAt());
  if (!row) {
    if (data.server_time) setSyncedAt(data.server_time);
    return null;
  }
  const next = withServerRev(row.payload, row);
  cacheState(next);
  setSyncedAt(data.server_time || row.updated_at);
  return next;
}

/** Save the whole document as one private cloud record. */
export async function pushState(state) {
  if (!hasKey()) throw new CloudError('NEEDS_SETUP', 'Connect this device to Better.');
  const next = {
    ...state,
    rev: Number(state.rev) || 0,
    updatedAt: new Date().toISOString(),
  };
  cacheState(next);
  write(PENDING_SLOT, '1');
  const result = await rpc('na_push', {
    p_key: getKey(),
    p_data: {
      joy: [
        {
          id: ROW_ID,
          member_id: MEMBER_ID,
          kind: 'routine_state',
          day: null,
          payload: next,
        },
      ],
    },
  });
  write(PENDING_SLOT, '');
  const serverTime = result && result.server_time;
  const rev = Date.parse(serverTime || '') || Date.now();
  setSyncedAt(serverTime || new Date().toISOString());
  return { ok: true, rev, serverTime };
}

/** Validate an entered key by trying to read the space. */
export async function connect(value) {
  setKey(value);
  try {
    return await loadInitial();
  } catch (err) {
    if (err.code === 'BAD_KEY' || err.code === 'NO_DATA') clearKey();
    throw err;
  }
}

export function keyPreview() {
  const key = getKey();
  if (!key) return '';
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export const backend = { ...BACKEND, rowId: ROW_ID };
