import { getState, update } from '../store.js?v=20261119082955';
import {
  $,
  $$,
  icon,
  escapeHtml,
  toast,
  confirmDialog,
  emptyState,
  todayISO,
  fmtDate,
  relativeDay,
  uid,
} from '../ui.js?v=20261119082955';
import { weightChart } from '../charts.js?v=20261119082955';

export function formatWeight(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const fixed = number.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

export function weightLogsOf(state) {
  const raw = state.weightLogs;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw)
    .map(([date, entry]) => ({
      date,
      weight: Number(entry && entry.weight),
      note: (entry && entry.note) || '',
    }))
    .filter((log) => /^\d{4}-\d{2}-\d{2}$/.test(log.date) && Number.isFinite(log.weight) && log.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function weightSummary(state) {
  const logs = weightLogsOf(state);
  const start = logs[0] || null;
  const current = logs.length ? logs[logs.length - 1] : null;
  const goal = Number(state.settings && state.settings.weightGoal) > 0
    ? Number(state.settings.weightGoal)
    : 0;
  const goalDate = (state.settings && state.settings.weightGoalDate) || '';
  const delta = start && current ? current.weight - start.weight : null;

  let pct = 0;
  let toGo = null;
  let reached = false;
  let direction = '';
  let moved = null;
  if (goal > 0 && start && current) {
    const total = Math.abs(goal - start.weight);
    const gaining = goal > start.weight;
    direction = gaining ? 'gain' : goal < start.weight ? 'loss' : 'maintain';
    moved = gaining ? current.weight - start.weight : start.weight - current.weight;
    if (total > 0) {
      pct = Math.max(0, Math.min(100, Math.round((moved / total) * 100)));
      reached = gaining ? current.weight >= goal : current.weight <= goal;
    } else {
      reached = Math.abs(current.weight - goal) < 0.05;
      pct = reached ? 100 : 0;
    }
    toGo = Math.abs(current.weight - goal);
  }

  return {
    logs,
    start,
    current,
    goal,
    goalDate,
    delta,
    pct,
    toGo,
    reached,
    direction,
    moved,
  };
}

export function weightSparkline(logs, goal = 0) {
  const points = logs.slice(-10);
  if (!points.length) return '';
  const w = 220;
  const h = 64;
  const pad = 6;
  const values = points.map((point) => point.weight);
  if (goal > 0) values.push(goal);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const span = max - min || 1;
  const x = (index) => pad + (index / Math.max(points.length - 1, 1)) * (w - pad * 2);
  const y = (value) => h - pad - ((value - min) / span) * (h - pad * 2);
  const line = points
    .map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.weight).toFixed(1)}`)
    .join(' ');
  const lastX = x(points.length - 1);
  const lastY = y(points[points.length - 1].weight);
  const area = `${line} L${lastX.toFixed(1)},${h - pad} L${pad},${h - pad} Z`;
  const gid = uid('weightspark');
  const goalY = goal > 0 ? y(goal) : null;
  return `<svg class="weight-spark-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="currentColor" stop-opacity=".22"></stop>
        <stop offset="1" stop-color="currentColor" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    ${
      goalY != null
        ? `<line x1="${pad}" y1="${goalY.toFixed(1)}" x2="${w - pad}" y2="${goalY.toFixed(
            1
          )}" stroke="#d7b574" stroke-width="1" stroke-dasharray="4 4" opacity=".7"></line>`
        : ''
    }
    <path d="${area}" fill="url(#${gid})"></path>
    <path d="${line}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.4" fill="currentColor"></circle>
  </svg>`;
}

export function render(root) {
  document.title = 'Body weight · Routine';
  const state = getState();
  const summary = weightSummary(state);
  const { logs, start, current, goal, goalDate, delta, pct, toGo, reached } = summary;
  const today = todayISO();
  const todayLog = state.weightLogs ? state.weightLogs[today] : null;
  const lastWeight = current ? current.weight : '';
  const initialWeight = todayLog && todayLog.weight ? todayLog.weight : lastWeight;
  const initialNote = (todayLog && todayLog.note) || '';
  const goalDateValid = /^\d{4}-\d{2}-\d{2}$/.test(goalDate);
  const history = logs.slice().reverse();
  const previous = new Map();
  logs.forEach((log, index) => {
    previous.set(log.date, index === 0 ? null : log.weight - logs[index - 1].weight);
  });
  const spark = weightSparkline(logs, goal);

  const goalLine = goal
    ? `${formatWeight(goal)} kg${goalDateValid ? ` by ${fmtDate(goalDate, 'short')}` : ''}`
    : 'No objective yet';

  const sub = !current
    ? 'Start with a baseline. Then the curve, the objective, the proof.'
    : reached
    ? 'Objective reached — set the next horizon.'
    : goal
    ? `${formatWeight(current.weight)} kg now, ${formatWeight(toGo)} kg from your ${formatWeight(
        goal
      )} kg objective.`
    : 'The curve is started. Give it a destination below.';

  root.innerHTML = `
    <section class="poster poster-weight">
      <div class="poster-body">
        <div class="poster-kicker">
          <a class="poster-back" href="#/sport">${icon('left')} Training</a>
          <span class="poster-index">Body</span>
        </div>
        <div class="poster-chips">
          <span class="glass-chip">${logs.length} weigh-in${logs.length === 1 ? '' : 's'}</span>
          <span class="glass-chip">${escapeHtml(goalLine)}</span>
          ${reached ? `<span class="glass-chip"><i class="live-dot"></i>Goal reached</span>` : ''}
        </div>
        <h1 class="poster-title">Body <em>weight</em></h1>
        <p class="poster-sub">${escapeHtml(sub)}</p>
        <div class="poster-actions">
          <button class="btn poster-btn" id="weight-jump">${icon('plus')} Log weight</button>
        </div>
      </div>
      <div class="poster-art weight-art">
        ${
          current
            ? `<div class="weight-current">${formatWeight(current.weight)}<em>kg</em></div>
               <div class="weight-art-label">current</div>
               <div class="weight-spark">${spark}</div>`
            : `<div class="weight-current weight-empty">—</div>
               <div class="weight-art-label">no weigh-ins yet</div>`
        }
      </div>
      <div class="poster-stats">
        <div class="poster-stat"><b>${start ? `${formatWeight(start.weight)}<em> kg</em>` : '—'}</b><span>Starting weight</span></div>
        <div class="poster-stat"><b>${delta != null ? `${delta > 0 ? '+' : ''}${formatWeight(delta)}<em> kg</em>` : '—'}</b><span>Since start</span></div>
        <div class="poster-stat"><b>${goal ? `${formatWeight(goal)}<em> kg</em>` : '—'}</b><span>Goal weight</span></div>
        <div class="poster-stat"><b class="${reached ? 'tone-green' : ''}">${
    goal && current ? `${formatWeight(toGo)}<em> kg</em>` : '—'
  }</b><span>To goal</span></div>
      </div>
    </section>

    <div class="card tint-body ${logs.length ? '' : 'chart-card is-empty'}">
      <div class="card-head">
        <div class="card-title data">${icon('chart')} Progression</div>
        <span class="card-hint">${logs.length} weigh-in${logs.length === 1 ? '' : 's'}${goal ? ' · gold line = goal' : ''}</span>
      </div>
      ${
        logs.length
          ? `<div class="chart-wrap"><canvas id="weight-chart"></canvas></div>`
          : emptyState({
              iconName: 'scale',
              title: 'Your curve starts with one weigh-in',
              text: 'Log your weight and set an objective — the line and the target will grow from there.',
            })
      }
    </div>

    <div class="grid-2">
      <div class="card" id="weight-form-card">
        <div class="card-head">
          <div class="card-title data">${icon('scale')} Log weight</div>
          <span class="card-hint">kg</span>
        </div>
        <form id="weight-form">
          <div class="form-grid">
            <div class="field">
              <label for="weight-date">Date</label>
              <input class="input" id="weight-date" name="date" type="date" value="${today}" max="${today}" required />
            </div>
            <div class="field">
              <label for="weight-value">Weight</label>
              <input class="input" id="weight-value" name="weight" type="number" min="20" max="500" step="0.1" inputmode="decimal" placeholder="e.g. 78.4" value="${escapeHtml(
                initialWeight
              )}" required />
            </div>
          </div>
          <div class="field mt-3">
            <label for="weight-note">Note (optional)</label>
            <textarea class="input" id="weight-note" name="note" rows="2" placeholder="Morning, after training, how you feel…">${escapeHtml(
              initialNote
            )}</textarea>
          </div>
          <div class="row mt-4">
            <button class="btn btn-primary" type="submit">${icon('check')} Save weigh-in</button>
            <span class="tiny faint">Editing an existing date overwrites it.</span>
          </div>
        </form>
      </div>

      <div class="card tint-body">
        <div class="card-head">
          <div class="card-title data">${icon('target')} Objective</div>
          ${reached ? `<span class="badge green">Reached</span>` : `<span class="card-hint">${goal ? `${pct}% there` : 'Set a target'}</span>`}
        </div>
        <form id="goal-form">
          <div class="form-grid">
            <div class="field">
              <label for="weight-goal">Target weight</label>
              <input class="input" id="weight-goal" name="goal" type="number" min="20" max="500" step="0.1" inputmode="decimal" placeholder="e.g. 75" value="${goal ? escapeHtml(goal) : ''}" />
            </div>
            <div class="field">
              <label for="weight-goal-date">Target date (optional)</label>
              <input class="input" id="weight-goal-date" name="goalDate" type="date" value="${goalDateValid ? escapeHtml(goalDate) : ''}" />
            </div>
          </div>
          <div class="row wrap mt-4">
            <button class="btn btn-primary" type="submit">${icon('target')} Save objective</button>
            ${goal ? `<button class="btn btn-ghost" type="button" id="clear-goal">Clear</button>` : ''}
          </div>
        </form>
        <div class="goal-progress">
          <div class="goal-progress-meta">
            <span>${goal ? (reached ? 'Objective reached' : `${pct}% of the way`) : 'No objective set'}</span>
            <span>${goal && current ? `${formatWeight(toGo)} kg to go` : goal ? 'Log a weigh-in to begin' : '—'}</span>
          </div>
          <div class="bar-track"><div class="bar-fill ${reached ? 'reached' : ''}" style="width:${goal ? pct : 0}%"></div></div>
        </div>
        <p class="tiny faint mt-3" style="line-height:1.6">
          ${
            start
              ? `Starting at ${formatWeight(start.weight)} kg.`
              : 'Your starting weight becomes the first weigh-in.'
          }
          ${
            goalDateValid
              ? ` Target date: ${fmtDate(goalDate, 'medium')}.`
              : ''
          }
        </p>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title data">${icon('calendar')} History</div>
        <span class="card-hint">${logs.length} weigh-in${logs.length === 1 ? '' : 's'}</span>
      </div>
      ${
        history.length
          ? `<div class="list">${history
              .map((log) => {
                const change = previous.get(log.date);
                return `<div class="list-item">
                  <div class="list-main">
                    <div class="row" style="gap:8px;flex-wrap:wrap">
                      <div class="list-title">${escapeHtml(relativeDay(log.date))}</div>
                      ${
                        change == null
                          ? `<span class="badge muted">Start</span>`
                          : `<span class="badge muted">${change > 0 ? '+' : change < 0 ? '−' : ''}${formatWeight(
                              Math.abs(change)
                            )} kg</span>`
                      }
                    </div>
                    <div class="list-sub">${log.note ? escapeHtml(log.note) : `<span class="faint">No note</span>`}</div>
                  </div>
                  <div class="list-side">
                    <div class="weight-history-value">${formatWeight(log.weight)}<small> kg</small></div>
                    <button class="icon-btn" data-edit-weight="${log.date}" title="Edit weigh-in" aria-label="Edit weigh-in">${icon('pencil')}</button>
                    <button class="icon-btn danger" data-del-weight="${log.date}" title="Delete weigh-in" aria-label="Delete weigh-in">${icon('trash')}</button>
                  </div>
                </div>`;
              })
              .join('')}</div>`
          : emptyState({
              iconName: 'scale',
              title: 'No weigh-ins yet',
              text: 'Your first weigh-in becomes the baseline. Add an objective above to give the curve a destination.',
            })
      }
    </div>
  `;

  $('#weight-jump').addEventListener('click', () => {
    const card = $('#weight-form-card');
    if (!card) return;
    window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' });
  });

  const dateInput = $('#weight-date');
  const weightInput = $('#weight-value');
  const noteInput = $('#weight-note');

  dateInput.addEventListener('change', () => {
    const log = getState().weightLogs ? getState().weightLogs[dateInput.value] : null;
    weightInput.value = log && log.weight ? log.weight : lastWeight || '';
    noteInput.value = (log && log.note) || '';
  });

  $('#weight-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const date = dateInput.value;
    const weight = Number(weightInput.value);
    if (!date || date > today) {
      toast('Choose today or an earlier date', 'error');
      return;
    }
    if (!Number.isFinite(weight) || weight < 20 || weight > 500) {
      toast('Enter a weight between 20 and 500 kg', 'error');
      return;
    }
    update((s) => {
      if (!s.weightLogs || typeof s.weightLogs !== 'object') s.weightLogs = {};
      s.weightLogs[date] = {
        weight: Number(weight.toFixed(1)),
        note: noteInput.value.trim(),
      };
    });
    toast('Weigh-in saved');
  });

  $('#goal-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const raw = $('#weight-goal').value.trim();
    if (!raw) {
      update((s) => {
        s.settings.weightGoal = 0;
        s.settings.weightGoalDate = '';
      });
      toast('Objective cleared');
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 20 || value > 500) {
      toast('Enter a goal between 20 and 500 kg', 'error');
      return;
    }
    const goalDate = $('#weight-goal-date').value;
    update((s) => {
      s.settings.weightGoal = Number(value.toFixed(1));
      s.settings.weightGoalDate = goalDate || '';
    });
    toast('Objective saved');
  });

  const clear = $('#clear-goal');
  if (clear) {
    clear.addEventListener('click', () => {
      update((s) => {
        s.settings.weightGoal = 0;
        s.settings.weightGoalDate = '';
      });
      toast('Objective cleared');
    });
  }

  $$('[data-edit-weight]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const log = getState().weightLogs ? getState().weightLogs[btn.dataset.editWeight] : null;
      if (!log) return;
      dateInput.value = btn.dataset.editWeight;
      weightInput.value = log.weight || '';
      noteInput.value = log.note || '';
      const card = $('#weight-form-card');
      if (card) {
        window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' });
      }
      toast('Editing this weigh-in');
    });
  });

  $$('[data-del-weight]', root).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const date = btn.dataset.delWeight;
      const ok = await confirmDialog({
        title: 'Delete this weigh-in?',
        message: `The weigh-in from ${fmtDate(date, 'medium')} will be removed from your curve.`,
        confirmText: 'Delete weigh-in',
      });
      if (!ok) return;
      update((s) => {
        if (s.weightLogs) delete s.weightLogs[date];
      });
      toast('Weigh-in deleted');
    });
  });

  if ($('#weight-chart')) {
    weightChart($('#weight-chart'), { points: logs, goal });
  }
}
