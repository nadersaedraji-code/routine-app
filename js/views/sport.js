import { getState, update } from '../store.js?v=20261125124145';
import {
  $,
  $$,
  icon,
  escapeHtml,
  toast,
  confirmDialog,
  formModal,
  emptyState,
  uid,
  todayISO,
  fmtDate,
  relativeDay,
  round1,
} from '../ui.js?v=20261125124145';
import {
  currentWeekKey,
  weekDaysForKey,
  weekLabelForKey,
  shiftWeekKey,
  weekNumberForKey,
  programStartsIn,
} from '../program.js?v=20261125124145';
import { exerciseChart } from '../charts.js?v=20261125124145';
import {
  render as renderWeight,
  weightSummary,
  weightSparkline,
  formatWeight,
} from './weight.js?v=20261125124145';

const KINDS = {
  strength: { label: 'Strength', icon: 'dumbbell', cls: '' },
  bodyweight: { label: 'Bodyweight', icon: 'walking', cls: 'green' },
  cardio: { label: 'Cardio', icon: 'heart', cls: 'amber' },
  hold: { label: 'Hold', icon: 'timer', cls: 'muted' },
};

function kindOf(exercise) {
  return KINDS[exercise.kind] || KINDS.strength;
}

/** Title-case a stored name for display only; the saved data stays untouched. */
function displayName(name) {
  return String(name || '').replace(/\p{L}[\p{L}'’-]*/gu, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  );
}

function splitPr(value) {
  const parts = String(value || '').trim().split(/\s+/);
  return { main: parts.shift() || '—', unit: parts.join(' ') };
}

function formatNum(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : String(round1(v));
}

function logsFor(state, exerciseId) {
  return state.exerciseLogs
    .filter((l) => l.exerciseId === exerciseId)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
}

function topWeight(log) {
  const weights = (log.sets || []).map((s) => Number(s.weight) || 0);
  return weights.length ? Math.max(...weights) : 0;
}

function totalReps(log) {
  return (log.sets || []).reduce((a, s) => a + (Number(s.reps) || 0), 0);
}

function logSummary(log, kind) {
  if (kind === 'strength') {
    const sets = log.sets || [];
    const top = topWeight(log);
    const bestSet = sets.find((s) => Number(s.weight) === top);
    if (top > 0) {
      return `${sets.length} set${sets.length === 1 ? '' : 's'} · ${formatNum(top)} kg top${
        bestSet ? ` × ${bestSet.reps}` : ''
      }`;
    }
    return `${sets.length} set${sets.length === 1 ? '' : 's'} · ${totalReps(log)} reps`;
  }
  if (kind === 'bodyweight') {
    return `${(log.sets || []).length} sets · ${totalReps(log)} reps`;
  }
  if (kind === 'cardio') {
    const parts = [];
    if (log.durationMin) parts.push(`${formatNum(log.durationMin)} min`);
    if (log.distanceKm) parts.push(`${formatNum(log.distanceKm)} km`);
    return parts.join(' · ') || 'Cardio entry';
  }
  return log.durationMin ? `${formatNum(log.durationMin)} min` : 'Hold entry';
}

function paceOf(log) {
  const d = Number(log.distanceKm) || 0;
  const m = Number(log.durationMin) || 0;
  if (!d || !m) return null;
  return m / d;
}

function paceLabel(value) {
  if (value == null) return '';
  const mins = Math.floor(value);
  const secs = Math.round((value - mins) * 60);
  const carry = secs === 60 ? 1 : 0;
  return `${mins + carry}:${String(secs === 60 ? 0 : secs).padStart(2, '0')} /km`;
}

function findExercise(id) {
  return getState().exercises.find((e) => e.id === id);
}

function sparklineValues(exercise, logs) {
  return logs.slice(-8).map((log) => {
    const metric = progressMetric(exercise, [log]);
    return metric ? Number(metric.value) || 0 : 0;
  });
}

function sparklineSvg(values, tone = '') {
  if (values.length < 2) return '';
  const w = 112;
  const h = 38;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const flat = max === min;
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = flat ? h / 2 : h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const line = pts
    .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ');
  const last = pts[pts.length - 1];
  const area = `${line} L${last[0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(
    1
  )},${h - pad} Z`;
  const gid = uid('spark');
  return `<svg class="sparkline ${tone}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="currentColor" stop-opacity="0.24"></stop>
        <stop offset="1" stop-color="currentColor" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#${gid})"></path>
    <path class="spark-line" d="${line}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
    <path class="spark-dot" d="M${last[0].toFixed(1)} ${(last[1] - 4).toFixed(1)}v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
  </svg>`;
}

function posterSpark(values) {
  const w = 320;
  const h = 118;
  const max = Math.max(...values, 1);
  const gid = uid('training-bars');
  return `<svg class="poster-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="100%" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#f8d89c"></stop>
        <stop offset="1" stop-color="#ba8e5a"></stop>
      </linearGradient>
    </defs>
    ${[16, 43, 70, 97].map((y) => `<path d="M0 ${y}h320" stroke="#f8dec0" stroke-opacity=".22" stroke-dasharray="2 5"/>`).join('')}
    ${values.map((value, i) => {
      const x = 10 + i * 40;
      const current = i === values.length - 1;
      const height = (value / max) * 81;
      return `<rect x="${x}" y="16" width="20" height="81" rx="5" fill="#f3dfc8" fill-opacity="${current ? '.17' : '.075'}"/>
        ${value > 0 ? `<rect x="${x}" y="${97 - height}" width="20" height="${height}" rx="5" fill="${current ? `url(#${gid})` : '#dcb58a'}" opacity="${current ? 1 : .68}"/>` : ''}
        <circle cx="${x + 10}" cy="109" r="${current ? 2.7 : 1.6}" fill="${current ? '#f8d89c' : '#e8caa2'}" opacity="${current ? 1 : .5}"/>`;
    }).join('')}
  </svg>`;
}

/* ---------------- entry ---------------- */
export function render(root, param) {
  if (param === 'weight') {
    renderWeight(root);
    return;
  }
  if (param) {
    renderDetail(root, param);
    return;
  }
  const state = getState();
  const exercises = state.exercises.slice().sort((a, b) => a.name.localeCompare(b.name));
  const week = currentWeekKey();
  const weekDays = weekDaysForKey(week);
  const weekLabel = weekLabelForKey(week);
  const weekNum = weekNumberForKey(week);
  const startsIn = programStartsIn();
  const preStart = startsIn > 0;
  const weekLogs = state.exerciseLogs.filter((l) => weekDays.includes(l.date));
  const totalLogs = state.exerciseLogs.length;
  const totalVolume = state.exerciseLogs.reduce(
    (sum, log) =>
      sum +
      (log.sets || []).reduce(
        (a, set) => a + (Number(set.reps) || 0) * (Number(set.weight) || 0),
        0
      ),
    0
  );
  const volumeLabel =
    totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : String(Math.round(totalVolume));
  const weeklyCounts = [];
  for (let i = 7; i >= 0; i -= 1) {
    const key = shiftWeekKey(week, -i);
    const set = new Set(weekDaysForKey(key));
    weeklyCounts.push(state.exerciseLogs.filter((l) => set.has(l.date)).length);
  }
  const weight = weightSummary(state);
  const weightTeaser = `
    <a class="card weight-teaser" href="#/sport/weight">
      <div class="weight-teaser-icon">${icon('scale')}</div>
      <div class="weight-teaser-copy">
        <div class="weight-teaser-eyebrow">Body metrics</div>
        <div class="weight-teaser-title">Body weight</div>
        <div class="weight-teaser-meta">${
          weight.current
            ? weight.goal
              ? weight.reached
                ? 'Goal reached'
                : `${formatWeight(weight.toGo)} kg to goal`
              : 'No target set'
            : 'Log your first weigh-in'
        }</div>
      </div>
      <div class="weight-teaser-value">${
        weight.current
          ? `${formatWeight(weight.current.weight)}<em>kg</em>`
          : `<span class="weight-teaser-empty">—</span>`
      }</div>
      <div class="weight-teaser-spark">${
        weight.current ? weightSparkline(weight.logs, weight.goal) : ''
      }</div>
      <span class="weight-teaser-cta">Open log ${icon('right')}</span>
    </a>`;

  root.innerHTML = `
    <section class="poster poster-sport">
      <div class="poster-body">
        <div class="poster-kicker">
          <span>03 / Exercise log</span>
        </div>
        <div class="poster-chips">
          <span class="glass-chip">${escapeHtml(weekLabel.range)}</span>
          <span class="glass-chip">${
            preStart
              ? startsIn === 1
                ? 'Starts tomorrow'
                : `Starts in ${startsIn} days`
               : `Week ${weekNum}`
          }</span>
        </div>
        <h1 class="poster-title">Training</h1>
        <p class="poster-sub">Each exercise you log counts once, even when you do several in the same workout.</p>
        <div class="poster-actions">
          <button class="btn poster-btn" id="new-exercise">${icon('plus')} New exercise</button>
        </div>
      </div>
      <div class="poster-art sport-art">
        ${posterSpark(weeklyCounts)}
        <div class="sport-art-caption">Exercises logged per week · last 8 weeks</div>
      </div>
      <div class="poster-stats">
        <div class="poster-stat"><b>${weekLogs.length}</b><span>${
          preStart ? `Exercises done · Week ${weekNum}` : 'Exercises done this week'
        }</span></div>
        <div class="poster-stat"><b>${totalLogs}</b><span>Exercises done overall</span></div>
        <div class="poster-stat"><b>${exercises.length}</b><span>Saved exercises</span></div>
        <div class="poster-stat"><b>${volumeLabel}<em> kg</em></b><span>Volume</span></div>
      </div>
    </section>

    ${weightTeaser}

    <div id="sport-content"></div>
  `;

  renderExercises($('#sport-content'), exercises);
  $('#new-exercise').addEventListener('click', () => openNewExercise(root));
}

/* ---------------- exercises list ---------------- */
function renderExercises(container, exercises) {
  const state = getState();
  if (!exercises.length) {
    container.innerHTML = `<div class="card">
      ${emptyState({
        iconName: 'dumbbell',
        title: 'Start your training log',
        text: 'Add an exercise to start logging your workouts.',
        action: `<button class="btn btn-primary" id="empty-new-exercise">${icon('plus')} Create your first exercise</button>`,
      })}
    </div>`;
    $('#empty-new-exercise').addEventListener('click', () => openNewExercise($('#view')));
    return;
  }

  container.innerHTML = `
    <div class="section-heading">
      <h2>Exercises</h2>
      <span>${exercises.length} saved</span>
    </div>
    <div class="exercise-grid">
      ${exercises
        .map((exercise) => {
          const meta = kindOf(exercise);
          const logs = logsFor(state, exercise.id);
          const last = logs.length ? logs[logs.length - 1] : null;
          const spark =
            logs.length >= 2
              ? `<div class="exercise-spark">${sparklineSvg(
                  sparklineValues(exercise, logs),
                  meta.cls
                )}</div>`
              : '';
          return `<button class="exercise-card kind-${exercise.kind}" data-ex="${exercise.id}">
            <div class="card-ghost">${icon(meta.icon)}</div>
            <div class="exercise-top">
              <div class="kind-icon ${meta.cls}">${icon(meta.icon)}</div>
              <span class="badge muted">${escapeHtml(meta.label)}</span>
            </div>
            <div>
              <div class="exercise-name">${escapeHtml(displayName(exercise.name))}</div>
              <div class="exercise-meta">${
                 last ? `Last logged: ${escapeHtml(relativeDay(last.date))}` : 'Not logged yet'
              }</div>
            </div>
            <div class="exercise-last">
               ${last ? `${icon('chart')}<span>${escapeHtml(logSummary(last, exercise.kind))}</span>` : `<span class="faint">Log this exercise →</span>`}
            </div>
            ${spark}
          </button>`;
        })
        .join('')}
      <button class="exercise-card add-tile" id="add-exercise-tile">
        <span class="add-tile-icon">${icon('plus')}</span>
        <span class="add-tile-title">Add an exercise</span>
         <span class="add-tile-sub">Track a new lift, hold, or cardio exercise.</span>
      </button>
    </div>`;
  $$('[data-ex]', container).forEach((card) => {
    card.addEventListener('click', () => {
      location.hash = `#/sport/${card.dataset.ex}`;
    });
  });
  const addTile = $('#add-exercise-tile', container);
  if (addTile) addTile.addEventListener('click', () => openNewExercise($('#view')));
}

function openNewExercise(root) {
  const { form } = formModal({
    title: 'New exercise',
    body: `
      <div class="field">
        <label>Exercise name</label>
        <input class="input" name="name" placeholder="e.g. Bench press" maxlength="60" required />
      </div>
      <div class="field">
        <label>Tracking type</label>
        <select class="select" name="kind">
          <option value="strength">Strength — reps × weight</option>
          <option value="bodyweight">Bodyweight — reps</option>
          <option value="cardio">Cardio — time &amp; distance</option>
          <option value="hold">Hold — duration</option>
        </select>
      </div>`,
    submitText: 'Create exercise',
    onSubmit: (data) => {
      const name = (data.name || '').trim();
      if (!name) {
        toast('Give the exercise a name', 'error');
        return false;
      }
      const exists = getState().exercises.some(
        (e) => e.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        toast('An exercise with that name already exists', 'error');
        return false;
      }
      const id = uid('e');
      update((s) => {
        s.exercises.push({
          id,
          name,
          kind: data.kind || 'strength',
          createdAt: new Date().toISOString(),
        });
      });
      toast('Exercise created');
      location.hash = `#/sport/${id}`;
    },
  });
  return form;
}

/* ---------------- exercise detail ---------------- */
function renderDetail(root, exerciseId) {
  const state = getState();
  const exercise = findExercise(exerciseId);

  if (!exercise) {
    root.innerHTML = `
      <div class="page-head">
        <div>
          <a class="btn btn-ghost btn-sm" href="#/sport">${icon('left')} All exercises</a>
          <h1 class="page-title mt-4">Exercise not found</h1>
        </div>
      </div>
      <div class="card">${emptyState({
        iconName: 'dumbbell',
        title: 'This exercise no longer exists',
        text: 'It may have been deleted. Go back to your exercise list.',
      })}</div>`;
    return;
  }

  const meta = kindOf(exercise);
  const logs = logsFor(state, exercise.id);
  const last = logs.length ? logs[logs.length - 1] : null;
  const pr = computePR(exercise, logs);
  const progress = computeProgress(exercise, logs);
  const prParts = splitPr(pr ? pr.value : '');

  root.innerHTML = `
    <section class="poster poster-sport detail-poster">
      <div class="poster-body">
        <div class="poster-kicker">
          <a class="poster-back" href="#/sport">${icon('left')} All exercises</a>
          <span class="poster-category">${escapeHtml(meta.label)}</span>
        </div>
        <h1 class="poster-title">${escapeHtml(displayName(exercise.name))}</h1>
        <p class="poster-sub">${
          pr
            ? `${escapeHtml(pr.label)} · ${escapeHtml(pr.value)}${
                pr.note ? ` · ${escapeHtml(pr.note)}` : ''
              }`
            : 'Log this exercise to start tracking your progress.'
        }</p>
        <div class="poster-actions">
          <button class="btn poster-btn" id="log-exercise">${icon('plus')} Log exercise</button>
          <button class="icon-btn poster-icon-btn danger" id="delete-exercise" title="Delete exercise" aria-label="Delete exercise">${icon('trash')}</button>
        </div>
      </div>
      <div class="poster-art detail-art">
        <div class="detail-big">${escapeHtml(prParts.main)}${
    prParts.unit ? `<em>${escapeHtml(prParts.unit)}</em>` : ''
  }</div>
        <div class="detail-big-label">${pr ? escapeHtml(pr.label) : 'No benchmark yet'}</div>
      </div>
      <div class="poster-stats">
        <div class="poster-stat"><b>${logs.length}</b><span>Times logged</span></div>
        <div class="poster-stat"><b class="stat-date">${
          last ? escapeHtml(fmtDate(last.date, 'short')) : '—'
         }</b><span>Last logged</span></div>
        <div class="poster-stat"><b class="tone-${
          progress && progress.delta > 0 ? 'green' : progress && progress.delta < 0 ? 'red' : ''
        }">${progress ? escapeHtml(progress.text) : '—'}</b><span>Progress</span></div>
        <div class="poster-stat"><b class="stat-date">${escapeHtml(meta.label)}</b><span>Tracking</span></div>
      </div>
    </section>

    <div class="card tint-train">
      <div class="card-head">
        <div class="card-title train">${icon('chart')} Exercise progress</div>
        <span class="card-hint">${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      ${
        logs.length
          ? `<div class="chart-wrap"><canvas id="exercise-chart"></canvas></div>`
          : emptyState({
              iconName: 'chart',
              title: 'No entries to chart yet',
              text: 'Log this exercise to start the chart.',
            })
      }
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title data">${icon('calendar')} Exercise history</div>
        <span class="card-hint">Newest first</span>
      </div>
      ${
        logs.length
          ? `<div class="list">${logs
              .slice()
              .reverse()
              .map((log) => exerciseHistoryItem(log, exercise.kind))
              .join('')}</div>`
          : emptyState({
              iconName: 'note',
              title: 'No entries yet',
              text: 'Use “Log exercise” to add your first entry.',
            })
      }
    </div>
  `;

  $('#log-exercise').addEventListener('click', () => openLogExercise(root, exercise));

  $('#delete-exercise').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete exercise?',
      message: `“${displayName(exercise.name)}” and its ${logs.length} ${logs.length === 1 ? 'entry' : 'entries'} will be permanently removed.`,
      confirmText: 'Delete exercise',
    });
    if (!ok) return;
    update((s) => {
      s.exercises = s.exercises.filter((e) => e.id !== exercise.id);
      s.exerciseLogs = s.exerciseLogs.filter((l) => l.exerciseId !== exercise.id);
    });
    toast('Exercise deleted');
    location.hash = '#/sport';
  });

  $$('[data-del-log]', root).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const log = getState().exerciseLogs.find((l) => l.id === btn.dataset.delLog);
      if (!log) return;
      const ok = await confirmDialog({
        title: 'Delete this exercise entry?',
        message: `The entry from ${fmtDate(log.date, 'medium')} will be removed from your history.`,
        confirmText: 'Delete entry',
      });
      if (!ok) return;
      update((s) => {
        s.exerciseLogs = s.exerciseLogs.filter((l) => l.id !== log.id);
      });
      toast('Entry deleted');
    });
  });

  if (logs.length) {
    exerciseChart($('#exercise-chart'), { exercise, logs });
  }
}

function exerciseHistoryItem(log, kind) {
  let detail = '';
  if (kind === 'strength' || kind === 'bodyweight') {
    detail = (log.sets || [])
      .map((s) => (kind === 'strength' ? `${s.reps}×${formatNum(s.weight)}kg` : `${s.reps}`))
      .join(' · ');
    if (kind === 'bodyweight') detail = `${detail} reps`;
  } else if (kind === 'cardio') {
    const parts = [];
    if (log.durationMin) parts.push(`${formatNum(log.durationMin)} min`);
    if (log.distanceKm) parts.push(`${formatNum(log.distanceKm)} km`);
    const pace = paceOf(log);
    if (pace) parts.push(paceLabel(pace));
    detail = parts.join(' · ');
  } else {
    detail = log.durationMin ? `${formatNum(log.durationMin)} min` : '';
  }

  return `<div class="list-item">
    <div class="list-main">
      <div class="list-title">${escapeHtml(fmtDate(log.date, 'medium'))}</div>
      <div class="list-sub">${escapeHtml(detail)}</div>
      ${log.note ? `<div class="list-sub" style="color:var(--text);opacity:.8">“${escapeHtml(log.note)}”</div>` : ''}
    </div>
    <div class="list-side">
      <button class="icon-btn danger" data-del-log="${log.id}" aria-label="Delete entry">${icon('trash')}</button>
    </div>
  </div>`;
}

/* ---------------- exercise log modal ---------------- */
function setRowHtml(kind, values = {}) {
  const reps = values.reps != null ? escapeHtml(values.reps) : '';
  if (kind === 'bodyweight') {
    return `<div class="set-row two" data-set>
      <div class="set-index">1</div>
      <input class="input" data-field="reps" type="number" inputmode="numeric" min="1" step="1" placeholder="Reps" value="${reps}" />
      <button type="button" class="icon-btn danger" data-remove-set aria-label="Remove set">${icon('trash')}</button>
    </div>`;
  }
  const weight = values.weight != null ? escapeHtml(values.weight) : '';
  return `<div class="set-row" data-set>
    <div class="set-index">1</div>
    <input class="input" data-field="reps" type="number" inputmode="numeric" min="1" step="1" placeholder="Reps" value="${reps}" />
    <input class="input" data-field="weight" type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg" value="${weight}" />
    <button type="button" class="icon-btn danger" data-remove-set aria-label="Remove set">${icon('trash')}</button>
  </div>`;
}

function openLogExercise(root, exercise) {
  const state = getState();
  const logs = logsFor(state, exercise.id);
  const previous = logs.length ? logs[logs.length - 1] : null;
  const kind = exercise.kind;

  let setsHtml = '';
  let setsField = '';
  if (kind === 'strength' || kind === 'bodyweight') {
    const defaults =
      previous && previous.sets && previous.sets.length
        ? previous.sets
        : [{ reps: '', weight: '' }, { reps: '', weight: '' }, { reps: '', weight: '' }];
    setsHtml = defaults.map((s) => setRowHtml(kind, s)).join('');
    setsField = `
      <div class="field">
        <label>Sets</label>
        <div class="sets-editor" id="sets">${setsHtml}</div>
        <button type="button" class="btn btn-ghost btn-sm mt-2" id="add-set">${icon('plus')} Add set</button>
      </div>`;
  }

  const cardioField =
    kind === 'cardio'
      ? `<div class="form-grid">
          <div class="field">
            <label>Duration (min)</label>
            <input class="input" name="durationMin" type="number" inputmode="decimal" min="1" step="1" placeholder="45" required />
          </div>
          <div class="field">
            <label>Distance (km) — optional</label>
            <input class="input" name="distanceKm" type="number" inputmode="decimal" min="0" step="0.1" placeholder="5.2" />
          </div>
        </div>`
      : '';

  const holdField =
    kind === 'hold'
      ? `<div class="field">
          <label>Duration (min)</label>
          <input class="input" name="durationMin" type="number" inputmode="decimal" min="1" step="1" placeholder="5" required />
        </div>`
      : '';

  const { root: modalRoot, form } = formModal({
    title: `Log ${displayName(exercise.name)}`,
    body: `
      <div class="form-grid">
        <div class="field">
          <label>Date</label>
          <input class="input" type="date" name="date" value="${todayISO()}" required />
        </div>
      </div>
      ${setsField}
      ${cardioField}
      ${holdField}
      <div class="field">
        <label>Note (optional)</label>
        <textarea class="input" name="note" rows="2" placeholder="How did it feel?">${
          previous ? '' : ''
        }</textarea>
      </div>`,
    submitText: 'Save entry',
    onMount: (backdrop) => {
      if (kind !== 'strength' && kind !== 'bodyweight') return;
      const editor = $('#sets', backdrop);
      const addBtn = $('#add-set', backdrop);

      const refresh = () => {
        $$('.set-row', editor).forEach((row, i) => {
          $('.set-index', row).textContent = String(i + 1);
        });
      };

      addBtn.addEventListener('click', () => {
        const holder = document.createElement('div');
        holder.innerHTML = setRowHtml(kind, {});
        const row = holder.firstElementChild;
        editor.appendChild(row);
        refresh();
        const input = row.querySelector('input');
        if (input) input.focus();
      });

      editor.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-remove-set]');
        if (!btn) return;
        if (editor.children.length <= 1) {
          const row = btn.closest('[data-set]');
          row.querySelectorAll('input').forEach((i) => {
            i.value = '';
          });
          return;
        }
        btn.closest('[data-set]').remove();
        refresh();
      });

      refresh();
    },
    onSubmit: (data) => {
      const date = data.date || todayISO();
      const note = (data.note || '').trim();
      const entry = {
        id: uid('l'),
        exerciseId: exercise.id,
        date,
        sets: [],
        durationMin: null,
        distanceKm: null,
        note,
      };

      if (kind === 'strength' || kind === 'bodyweight') {
        const sets = $$('[data-set]', form)
          .map((row) => {
            const reps = Number(($('[data-field="reps"]', row) || {}).value) || 0;
            const weight =
              kind === 'strength'
                ? Number(($('[data-field="weight"]', row) || {}).value) || 0
                : 0;
            return { reps, weight };
          })
          .filter((s) => s.reps > 0);
        if (!sets.length) {
          throw new Error('Add at least one set with reps');
        }
        entry.sets = sets;
      } else if (kind === 'cardio') {
        const duration = Number(data.durationMin) || 0;
        if (duration <= 0) throw new Error('Enter a duration');
        entry.durationMin = duration;
        entry.distanceKm = Number(data.distanceKm) || null;
      } else {
        const duration = Number(data.durationMin) || 0;
        if (duration <= 0) throw new Error('Enter a duration');
        entry.durationMin = duration;
      }

      update((s) => {
        s.exerciseLogs.push(entry);
      });
      toast('Exercise logged');
    },
  });

  return { modalRoot, form };
}

/* ---------------- PR & progress helpers ---------------- */
function computePR(exercise, logs) {
  if (!logs.length) return null;
  const kind = exercise.kind;

  if (kind === 'strength') {
    let top = 0;
    let topReps = 0;
    let bestSetReps = 0;
    for (const log of logs) {
      for (const set of log.sets || []) {
        const w = Number(set.weight) || 0;
        const r = Number(set.reps) || 0;
        if (w > top || (w === top && r > topReps)) {
          top = w;
          topReps = r;
        }
        if (r > bestSetReps) bestSetReps = r;
      }
    }
    if (top > 0) {
      return {
        value: `${formatNum(top)} kg`,
        label: 'Heaviest set',
        note: topReps ? `${topReps} reps` : '',
      };
    }
    return {
      value: `${bestSetReps} reps`,
      label: 'Best set',
      note: 'bodyweight strength',
    };
  }

  if (kind === 'bodyweight') {
    let bestReps = 0;
    let bestTotal = 0;
    for (const log of logs) {
      const reps = Math.max(0, ...(log.sets || []).map((s) => Number(s.reps) || 0));
      if (reps > bestReps) bestReps = reps;
      const total = totalReps(log);
      if (total > bestTotal) bestTotal = total;
    }
    return {
      value: `${bestReps} reps`,
      label: 'Best set',
      note: bestTotal ? `Most reps in one entry: ${bestTotal}` : '',
    };
  }

  if (kind === 'cardio') {
    let best = null;
    for (const log of logs) {
      const d = Number(log.distanceKm) || 0;
      const m = Number(log.durationMin) || 0;
      if (d > 0 && (!best || d > best.d)) best = { d, m };
    }
    if (best) {
      const pace = best.m ? paceLabel(best.m / best.d) : '';
      return {
        value: `${formatNum(best.d)} km`,
        label: 'Longest distance',
        note: pace,
      };
    }
    const maxMin = Math.max(...logs.map((l) => Number(l.durationMin) || 0));
    return { value: `${formatNum(maxMin)} min`, label: 'Longest duration', note: '' };
  }

  const best = Math.max(...logs.map((l) => Number(l.durationMin) || 0));
  return { value: `${formatNum(best)} min`, label: 'Longest hold', note: '' };
}

function progressMetric(exercise, logs) {
  if (!logs.length) return null;
  const kind = exercise.kind;
  const last = logs[logs.length - 1];
  if (kind === 'strength') {
    const estimate = (log) => {
      let best = 0;
      for (const set of log.sets || []) {
        const w = Number(set.weight) || 0;
        const r = Number(set.reps) || 0;
        if (w > 0 && r > 0) best = Math.max(best, w * (1 + r / 30));
      }
      return best;
    };
    if (estimate(last) > 0) return { value: estimate(last), unit: ' kg' };
    return { value: totalReps(last), unit: ' reps' };
  }
  if (kind === 'bodyweight') return { value: totalReps(last), unit: ' reps' };
  if (kind === 'cardio') {
    const d = Number(last.distanceKm) || 0;
    if (d > 0) return { value: d, unit: ' km' };
    return { value: Number(last.durationMin) || 0, unit: ' min' };
  }
  return { value: Number(last.durationMin) || 0, unit: ' min' };
}

function computeProgress(exercise, logs) {
  if (logs.length < 2) return null;
  const first = progressMetric(exercise, [logs[0]]);
  const last = progressMetric(exercise, [logs[logs.length - 1]]);
  if (!first || !last) return null;
  const delta = round1(last.value - first.value);
  if (!first.value && !last.value) return null;
  const sign = delta > 0 ? '+' : '';
  return {
    delta,
    text: `${sign}${formatNum(delta)}${last.unit}`,
    note: exercise.kind === 'strength' ? 'est. 1RM · vs first' : 'vs first entry',
  };
}
