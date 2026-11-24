import { getState, update } from '../store.js?v=20261124092540';
import {
  $,
  $$,
  icon,
  escapeHtml,
  toast,
  confirmDialog,
  formModal,
  emptyState,
  todayISO,
  fmtDate,
  relativeDay,
  parseISO,
} from '../ui.js?v=20261124092540';
import {
  currentWeekKey,
  weekDaysForKey,
  weekNumberForKey,
  shiftWeekKey,
  programStartsIn,
} from '../program.js?v=20261124092540';
import { mobilityChart } from '../charts.js?v=20261124092540';

const TRACKS = {
  stretch: {
    logs: 'stretchLogs',
    setting: 'stretchPerWeek',
    label: 'Stretch',
    icon: 'stretch',
    tone: 'stretch',
    defaultTarget: 5,
    doneLabel: 'Stretched today',
    actionLabel: 'I stretched today',
  },
  core: {
    logs: 'coreLogs',
    setting: 'corePerWeek',
    label: 'Core',
    icon: 'target',
    tone: 'core',
    defaultTarget: 3,
    doneLabel: 'Core done today',
    actionLabel: 'Core done today',
  },
};

function targetFor(state, track) {
  const meta = TRACKS[track];
  const value = Number(state.settings?.[meta.setting]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : meta.defaultTarget;
}

function logsFor(state, track) {
  const list = state[TRACKS[track].logs];
  return Array.isArray(list) ? list : [];
}

function hasLog(state, date, track) {
  return logsFor(state, track).some((log) => log.date === date);
}

function logsInWeek(state, key, track) {
  const set = new Set(weekDaysForKey(key));
  return logsFor(state, track).filter((log) => set.has(log.date));
}

function weeklyStreak(state, target, track) {
  let streak = 0;
  let key = currentWeekKey();
  if (logsInWeek(state, key, track).length >= target) streak += 1;
  key = shiftWeekKey(key, -1);
  for (let i = 0; i < 260; i += 1) {
    if (weekNumberForKey(key) < 1) break;
    if (logsInWeek(state, key, track).length >= target) {
      streak += 1;
      key = shiftWeekKey(key, -1);
    } else {
      break;
    }
  }
  return streak;
}

/** Program weeks only (never before Week 1), up to 8 most recent. */
function recentWeeks(state) {
  const currentKey = currentWeekKey();
  const currentNum = weekNumberForKey(currentKey);
  const firstNum = Math.max(1, currentNum - 7);
  const weeks = [];
  for (let n = firstNum; n <= currentNum; n += 1) {
    const key = shiftWeekKey(currentKey, n - currentNum);
    weeks.push({
      key,
      week: n,
      stretch: logsInWeek(state, key, 'stretch').length,
      core: logsInWeek(state, key, 'core').length,
    });
  }
  return weeks;
}

function duoRing({ weekNum, stretchPct, corePct, size }) {
  const r1 = 78;
  const r2 = 56;
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const p1 = Math.max(0, Math.min(1, stretchPct / 100));
  const p2 = Math.max(0, Math.min(1, corePct / 100));
  return `<svg class="duo-ring" width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true">
    <g transform="rotate(-90 100 100)">
      <circle class="duo-track" cx="100" cy="100" r="${r1}" fill="none" stroke-width="10.5"/>
      <circle class="duo-stretch" cx="100" cy="100" r="${r1}" fill="none" stroke-width="10.5" stroke-linecap="round" stroke-dasharray="${c1.toFixed(
    2
  )}" stroke-dashoffset="${(c1 * (1 - p1)).toFixed(2)}"/>
      <circle class="duo-track" cx="100" cy="100" r="${r2}" fill="none" stroke-width="9"/>
      <circle class="duo-core" cx="100" cy="100" r="${r2}" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c2.toFixed(
    2
  )}" stroke-dashoffset="${(c2 * (1 - p2)).toFixed(2)}"/>
    </g>
    <text class="duo-week" x="100" y="101" text-anchor="middle">${String(weekNum).padStart(
      2,
      '0'
    )}</text>
    <text class="duo-week-label" x="100" y="119" text-anchor="middle">week</text>
  </svg>`;
}

function trackCard(state, track, days, today, preStart) {
  const meta = TRACKS[track];
  const target = targetFor(state, track);
  const done = logsInWeek(state, currentWeekKey(), track).length;
  const doneToday = hasLog(state, today, track);
  const remaining = Math.max(0, target - done);
  const percent = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  return `
    <article class="card track-card track-${meta.tone}">
      <div class="track-head">
        <div class="track-icon">${icon(meta.icon)}</div>
        <div class="track-heading">
          <div class="track-title">${meta.label}</div>
          <div class="track-sub">${done} of ${target} this week</div>
        </div>
        <span class="track-status ${remaining === 0 ? 'met' : ''}">${
    remaining === 0 ? 'Target met' : `${remaining} to go`
  }</span>
      </div>
      <div class="track-progress">
        <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
      </div>
      <button class="track-cta ${doneToday ? 'is-done' : ''}" data-track-today="${track}" aria-pressed="${doneToday}">
        ${icon(doneToday ? 'check' : meta.icon)}
        ${doneToday ? meta.doneLabel : meta.actionLabel}
      </button>
      <div class="stretch-days track-days">
        ${days
          .map((date) => {
            const on = hasLog(state, date, track);
            const future = date > today;
            return `<button class="stretch-day ${on ? 'on' : ''} ${
              date === today ? 'today' : ''
            }" ${future ? 'disabled' : ''} data-track-day="${track}" data-date="${date}" aria-pressed="${on}" title="${escapeHtml(
              fmtDate(date, 'medium')
            )}${future ? '' : ' · tap to log or remove'}">
              <span class="stretch-day-name">${fmtDate(date, 'day').slice(0, 1)}</span>
              <span class="stretch-dot">${on ? icon('check') : ''}</span>
              <span class="stretch-day-num">${parseISO(date).getDate()}</span>
            </button>`;
          })
          .join('')}
      </div>
      <div class="track-hint">${
        preStart ? 'The new week begins tomorrow.' : 'Tap a day to log or remove.'
      }</div>
    </article>`;
}

export function render(root) {
  const state = getState();
  const today = todayISO();
  const week = currentWeekKey();
  const days = weekDaysForKey(week);
  const weekNum = weekNumberForKey(week);
  const startsIn = programStartsIn();
  const preStart = startsIn > 0;

  const stretchTarget = targetFor(state, 'stretch');
  const coreTarget = targetFor(state, 'core');
  const stretchDone = logsInWeek(state, week, 'stretch').length;
  const coreDone = logsInWeek(state, week, 'core').length;
  const stretchToday = hasLog(state, today, 'stretch');
  const coreToday = hasLog(state, today, 'core');
  const stretchStreak = weeklyStreak(state, stretchTarget, 'stretch');
  const coreStreak = weeklyStreak(state, coreTarget, 'core');
  const stretchTotal = logsFor(state, 'stretch').length;
  const coreTotal = logsFor(state, 'core').length;
  const totalAll = stretchTotal + coreTotal;
  const weeks = recentWeeks(state);
  const stretchPct = stretchTarget ? Math.min(100, (stretchDone / stretchTarget) * 100) : 0;
  const corePct = coreTarget ? Math.min(100, (coreDone / coreTarget) * 100) : 0;
  const bothComplete = stretchDone >= stretchTarget && coreDone >= coreTarget;

  const history = [
    ...logsFor(state, 'stretch').map((log) => ({ ...log, track: 'stretch' })),
    ...logsFor(state, 'core').map((log) => ({ ...log, track: 'core' })),
  ].sort(
    (a, b) =>
      String(b.date).localeCompare(String(a.date)) ||
      String(a.track).localeCompare(String(b.track))
  );

  const sub = preStart
    ? `Your weekly targets begin ${
        startsIn === 1 ? 'tomorrow' : `in ${startsIn} days`
      }. You can still log a session today.`
    : bothComplete
    ? 'You’ve met both targets this week.'
    : 'Log stretching and core separately, each with its own weekly target.';

  root.innerHTML = `
    <section class="poster poster-stretch poster-duo">
      <div class="poster-body">
        <div class="poster-kicker">
          <span>04 / Mobility &amp; stability</span>
        </div>
        <div class="poster-chips">
          <span class="glass-chip">Week ${weekNum}</span>
          ${
            preStart
              ? `<span class="glass-chip">${
                  startsIn === 1 ? 'Starts tomorrow' : `Starts in ${startsIn} days`
                }</span>`
              : ''
          }
        </div>
        <h1 class="poster-title">Stretch <em>&amp; core</em></h1>
        <p class="poster-sub">${sub}</p>
        <div class="poster-actions">
          <button class="btn poster-btn ${stretchToday ? 'poster-btn-done' : ''}" data-track-today="stretch" aria-pressed="${stretchToday}">
            ${icon(stretchToday ? 'check' : 'stretch')}
            ${stretchToday ? 'Stretch logged' : 'Log stretch'}
          </button>
          <button class="btn poster-btn-ghost poster-btn-core ${coreToday ? 'is-done' : ''}" data-track-today="core" aria-pressed="${coreToday}">
            ${icon(coreToday ? 'check' : 'target')}
            ${coreToday ? 'Core logged' : 'Log core'}
          </button>
        </div>
      </div>
      <div class="poster-art duo-art">
        ${duoRing({
          weekNum,
          stretchPct,
          corePct,
          size: window.innerWidth < 640 ? 146 : 198,
        })}
        <div class="duo-legend">
          <span><i class="stretch"></i>Stretch</span>
          <span><i class="core"></i>Core</span>
        </div>
      </div>
      <div class="poster-stats">
        <div class="poster-stat"><b>${stretchStreak}<em> wk</em></b><span>Stretch streak</span></div>
        <div class="poster-stat"><b>${coreStreak}<em> wk</em></b><span>Core streak</span></div>
        <div class="poster-stat"><b>${stretchTotal}</b><span>Stretch sessions</span></div>
        <div class="poster-stat"><b>${coreTotal}</b><span>Core sessions</span></div>
      </div>
    </section>

    <div class="section-heading">
      <h2>This week’s check-ins</h2>
    </div>

    <div class="track-grid">
      ${trackCard(state, 'stretch', days, today, preStart)}
      ${trackCard(state, 'core', days, today, preStart)}
    </div>

    <div class="card tint-stretch ${totalAll ? '' : 'chart-card is-empty'}">
      <div class="card-head">
        <div class="card-title stretch">${icon('chart')} Sessions by week</div>
        <span class="card-hint">Last 8 weeks</span>
      </div>
      ${
        totalAll
          ? `<div class="chart-wrap short"><canvas id="mobility-chart"></canvas></div>`
          : emptyState({
              iconName: 'chart',
              title: 'No sessions to chart yet',
              text: 'Log a session to see how often you stretch or train core each week.',
            })
      }
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title data">${icon('target')} Weekly targets</div>
        <span class="card-hint">Saved automatically</span>
      </div>
      <div class="form-grid">
        <div class="field">
          <label for="stretch-target">Stretch sessions per week</label>
          <input class="input" id="stretch-target" type="number" min="1" max="21" step="1" value="${stretchTarget}" />
        </div>
        <div class="field">
          <label for="core-target">Core sessions per week</label>
          <input class="input" id="core-target" type="number" min="1" max="21" step="1" value="${coreTarget}" />
        </div>
      </div>
      <p class="tiny faint mt-3" style="line-height:1.6">
        Changing a target also recalculates past streaks.
      </p>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title data">${icon('calendar')} History</div>
        <span class="card-hint">${totalAll} session${totalAll === 1 ? '' : 's'}</span>
      </div>
      ${
        history.length
          ? `<div class="list">${history
              .map((log) => {
                const meta = TRACKS[log.track];
                return `<div class="list-item">
                  <div class="list-main">
                    <div class="list-title">${escapeHtml(relativeDay(log.date))} <span class="track-pill ${
                  log.track
                }">${meta.label}</span></div>
                    ${log.note ? `<div class="list-sub">${escapeHtml(log.note)}</div>` : ''}
                  </div>
                  <div class="list-side">
                    <button class="icon-btn" data-note-track="${log.track}" data-note-date="${
                  log.date
                }" title="Edit note" aria-label="Edit ${meta.label} note">${icon('note')}</button>
                    <button class="icon-btn danger" data-del-track="${
                      log.track
                    }" data-del-date="${log.date}" title="Delete session" aria-label="Delete ${
                  meta.label
                } session">${icon('trash')}</button>
                  </div>
                </div>`;
              })
              .join('')}</div>`
          : emptyState({
              iconName: 'stretch',
              title: 'No sessions yet',
              text: 'Tap Stretch or Core above to start your record — each track keeps its own history.',
            })
      }
    </div>
  `;

  async function toggleTrack(track, date) {
    const meta = TRACKS[track];
    const exists = hasLog(getState(), date, track);
    if (exists) {
      const ok = await confirmDialog({
        title: date === today ? `Undo today’s ${meta.label.toLowerCase()}?` : `Remove this ${meta.label.toLowerCase()} session?`,
        message: `The ${meta.label.toLowerCase()} session on ${fmtDate(date, 'medium')} will be removed from your history.`,
        confirmText: 'Remove session',
      });
      if (!ok) return;
      update((s) => {
        const list = Array.isArray(s[meta.logs]) ? s[meta.logs] : [];
        s[meta.logs] = list.filter((log) => log.date !== date);
      });
      toast(`${meta.label} session removed`);
      return;
    }
    update((s) => {
      if (!Array.isArray(s[meta.logs])) s[meta.logs] = [];
      if (!s[meta.logs].some((log) => log.date === date)) {
        s[meta.logs].push({ date, note: '' });
      }
    });
    toast(
      date === today
        ? `${meta.label} logged — nice work`
        : `${meta.label} logged for ${fmtDate(date, 'short')}`
    );
  }

  $$('[data-track-today]', root).forEach((btn) => {
    btn.addEventListener('click', () => toggleTrack(btn.dataset.trackToday, today));
  });
  $$('[data-track-day]', root).forEach((btn) => {
    btn.addEventListener('click', () => toggleTrack(btn.dataset.trackDay, btn.dataset.date));
  });

  $('#stretch-target').addEventListener('change', (e) => {
    const value = Math.max(1, Math.min(21, Math.round(Number(e.target.value) || 5)));
    update((s) => {
      s.settings.stretchPerWeek = value;
    });
    toast('Stretch target updated');
  });
  $('#core-target').addEventListener('change', (e) => {
    const value = Math.max(1, Math.min(21, Math.round(Number(e.target.value) || 3)));
    update((s) => {
      s.settings.corePerWeek = value;
    });
    toast('Core target updated');
  });

  $$('[data-note-track]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const track = btn.dataset.noteTrack;
      const date = btn.dataset.noteDate;
      const meta = TRACKS[track];
      const log = logsFor(getState(), track).find((item) => item.date === date);
      if (!log) return;
      formModal({
        title: `${meta.label} note · ${fmtDate(log.date, 'medium')}`,
        body: `<div class="field">
          <label>Optional note</label>
          <textarea class="input" name="note" rows="3" placeholder="What did you work on?">${escapeHtml(
            log.note || ''
          )}</textarea>
        </div>`,
        submitText: 'Save note',
        onSubmit: (data) => {
          update((s) => {
            const list = Array.isArray(s[meta.logs]) ? s[meta.logs] : [];
            const target = list.find((item) => item.date === date);
            if (target) target.note = (data.note || '').trim();
          });
          toast('Note saved');
        },
      });
    });
  });

  $$('[data-del-track]', root).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const track = btn.dataset.delTrack;
      const date = btn.dataset.delDate;
      const meta = TRACKS[track];
      const ok = await confirmDialog({
        title: `Delete this ${meta.label.toLowerCase()} session?`,
        message: `The ${meta.label.toLowerCase()} session from ${fmtDate(date, 'medium')} will be removed.`,
        confirmText: 'Delete session',
      });
      if (!ok) return;
      update((s) => {
        const list = Array.isArray(s[meta.logs]) ? s[meta.logs] : [];
        s[meta.logs] = list.filter((log) => log.date !== date);
      });
      toast(`${meta.label} session deleted`);
    });
  });

  if ($('#mobility-chart')) mobilityChart($('#mobility-chart'), { weeks });
}
