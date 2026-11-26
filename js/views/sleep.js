import { getState, update } from '../store.js?v=20261126165006';
import {
  $,
  $$,
  icon,
  escapeHtml,
  toast,
  confirmDialog,
  formModal,
  emptyState,
  badge,
  progressRing,
  todayISO,
  isoDate,
  addDays,
  sleepTimesForDate,
  parseISO,
  timeToMin,
  minToTime,
  clockToAxis,
  axisToClock,
  deltaInfo,
  fmtDate,
  mean,
  fmtDuration,
} from '../ui.js?v=20261126165006';
import { sleepChart } from '../charts.js?v=20261126165006';
import { sleepStreak } from '../sleep-streak.js?v=20261126165006';

const streakStatus = {
  hit: ['check', 'Both targets met'],
  miss: ['x', 'Outside the target window'],
  partial: ['minus', 'Incomplete entry'],
  missing: ['minus', 'No entry'],
  pending: ['moon', 'Awaiting both times'],
};

function avgClock(entries, key) {
  const vals = entries
    .map((e) => e[key])
    .filter(Boolean)
    .map((v) => timeToMin(v))
    .filter((v) => v != null)
    .map((v) => clockToAxis(v));
  if (!vals.length) return null;
  return axisToClock(mean(vals));
}

function lastNDates(n) {
  return Array.from({ length: n }, (_, i) => isoDate(addDays(new Date(), -(n - 1 - i))));
}

function nightLabel(date, log) {
  return fmtDate(log.bed ? isoDate(addDays(parseISO(date), -1)) : date, 'medium');
}

function statDeltaHtml(actual, target) {
  if (actual == null) {
    return `<div class="stat-value">—</div><div class="stat-label">vs goal</div>`;
  }
  const info = deltaInfo(actual, target);
  const sign = info.diff > 0 ? '+' : '';
  const value = info.abs < 1 ? 'On time' : `${sign}${Math.round(info.diff)}m`;
  return `<div class="stat-value" style="color:var(--${info.tone});font-size:22px">${value}</div>
    <div class="stat-label">vs ${minToTime(target)} goal</div>`;
}

export function render(root) {
  const state = getState();
  const dates30 = lastNDates(30);
  const entries7 = lastNDates(7)
    .map((d) => sleepTimesForDate(state.sleepLogs, d))
    .filter((e) => e.wake || e.bed);
  const entries30 = dates30
    .map((d) => sleepTimesForDate(state.sleepLogs, d))
    .filter((e) => e.wake || e.bed);
  const wakeAvg = avgClock(entries7, 'wake');
  const bedAvg = avgClock(entries7, 'bed');
  const wakeTarget = timeToMin(state.settings.wakeTarget) ?? 7 * 60;
  const bedTarget = timeToMin(state.settings.bedTarget) ?? 23 * 60;
  const today = todayISO();
  const streak = sleepStreak(state.sleepLogs, today, bedTarget, wakeTarget);
  const todayLog = state.sleepLogs[today] || {};
  const tomorrow = isoDate(addDays(parseISO(today), 1));
  const tonightLog = state.sleepLogs[tomorrow] || {};
  const todayWake = todayLog.wake ? timeToMin(todayLog.wake) : null;
  const todayBed = todayLog.bed ? timeToMin(todayLog.bed) : null;
  const todaySleepMinutes =
    todayWake != null && todayBed != null ? (todayWake - todayBed + 1440) % 1440 : null;
  const wakeGoal = wakeAvg != null ? deltaInfo(wakeAvg, wakeTarget) : null;
  const bedGoal = bedAvg != null ? deltaInfo(bedAvg, bedTarget) : null;
  const deltaText = (info) => {
    if (!info) return '—';
    if (info.abs < 1) return 'On time';
    return `${info.diff > 0 ? '+' : ''}${Math.round(info.diff)} min`;
  };
  const moonId = `moon${Math.random().toString(36).slice(2, 7)}`;
  const moonSvg = `<svg class="moon-art" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="${moonId}g">
         <stop stop-color="#9bafc9" stop-opacity=".26"/>
         <stop offset="1" stop-color="#7e9dbe" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${moonId}m" x1="50" y1="55" x2="145" y2="155" gradientUnits="userSpaceOnUse">
         <stop stop-color="#d5e8ed"/>
         <stop offset=".53" stop-color="#7996ad"/>
         <stop offset="1" stop-color="#d5ba87"/>
      </linearGradient>
      <mask id="${moonId}k">
        <rect width="200" height="200" fill="#fff"/>
        <circle cx="120" cy="76" r="42" fill="#000"/>
      </mask>
    </defs>
     <circle cx="100" cy="100" r="94" fill="url(#${moonId}g)"/>
     <ellipse cx="100" cy="100" rx="83" ry="59" transform="rotate(-34 100 100)" fill="none" stroke="#cadfe4" stroke-opacity=".27"/>
     <ellipse cx="100" cy="100" rx="92" ry="65" transform="rotate(-34 100 100)" fill="none" stroke="#cadfe4" stroke-opacity=".2" stroke-dasharray="1 4"/>
    <circle cx="94" cy="104" r="48" fill="url(#${moonId}m)" mask="url(#${moonId}k)" opacity=".92"/>
    <circle cx="154" cy="54" r="2.4" fill="#fff" opacity=".7"/>
    <circle cx="168" cy="86" r="1.5" fill="#64D2FF" opacity=".6"/>
    <circle cx="44" cy="48" r="1.4" fill="#fff" opacity=".45"/>
    <path d="M34 168c30-14 58-14 86 0s54 14 70 0" fill="none" stroke="#64D2FF" stroke-opacity=".28" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;

  const sortedLogs = Object.keys(state.sleepLogs)
    .filter((d) => state.sleepLogs[d] && (state.sleepLogs[d].wake || state.sleepLogs[d].bed))
    .sort((a, b) => (a < b ? 1 : -1));

  root.innerHTML = `
    <section class="poster poster-sleep">
      <div class="poster-body">
        <div class="poster-kicker">
          <span>05 / Recovery</span>
        </div>
        <div class="poster-chips">
          <span class="glass-chip">Target ${escapeHtml(state.settings.bedTarget)}–${escapeHtml(state.settings.wakeTarget)}</span>
        </div>
        <h1 class="poster-title">Sleep</h1>
        <p class="poster-sub">${
          todaySleepMinutes != null
            ? `Last night: ${escapeHtml(todayLog.bed)} to ${escapeHtml(todayLog.wake)}.`
            : 'Log your wake-up now and your bedtime tonight, separately.'
        }</p>
        <div class="poster-actions">
          <button class="btn poster-btn" id="sleep-jump">${icon('plus')} Log wake-up or bedtime</button>
        </div>
      </div>
      <div class="poster-art sleep-art">
        ${moonSvg}
        ${
          todaySleepMinutes != null
            ? `<div class="sleep-duration">${fmtDuration(todaySleepMinutes)}</div>
               <div class="sleep-duration-label">last night</div>`
             : `<div class="sleep-duration-label">${todayLog.wake ? 'Wake-up logged' : 'Log your wake-up'}</div>`
        }
      </div>
      <div class="poster-stats">
        <div class="poster-stat"><b>${wakeAvg != null ? minToTime(wakeAvg) : '—'}</b><span>Average wake time</span></div>
        <div class="poster-stat"><b>${bedAvg != null ? minToTime(bedAvg) : '—'}</b><span>Average bedtime</span></div>
        <div class="poster-stat"><b class="tone-${wakeGoal ? wakeGoal.tone : ''}">${deltaText(
    wakeGoal
  )}</b><span>From wake target</span></div>
        <div class="poster-stat"><b class="tone-${bedGoal ? bedGoal.tone : ''}">${deltaText(
    bedGoal
  )}</b><span>From bedtime target</span></div>
      </div>
    </section>

    <section class="card sleep-streak" aria-labelledby="sleep-streak-title">
      <div class="card-head">
        <h2 class="card-title sleep" id="sleep-streak-title">${icon('flame')} Sleep streak</h2>
        <span class="card-hint">Within 15 min, early or late</span>
      </div>
      <div class="sleep-streak-summary">
        <div class="sleep-streak-metric"><b>${streak.current}</b><span>Current streak</span></div>
        <div class="sleep-streak-metric"><b>${streak.best}</b><span>Best streak</span></div>
        <p>Both bedtime and the next wake-up must match your current targets. Each night is shown under its bedtime date.</p>
      </div>
      <ol class="sleep-streak-strip" aria-label="Last seven nights">
        ${streak.recent.map(({ date, status }) => {
          const [symbol, description] = streakStatus[status];
          const label = `${fmtDate(date, 'medium')}: ${description}`;
          return `<li class="sleep-streak-${status}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
            <span aria-hidden="true">${escapeHtml(fmtDate(date, 'day'))}</span>
            <i aria-hidden="true">${icon(symbol)}</i>
            <small aria-hidden="true">${Number(date.slice(-2))}</small>
          </li>`;
        }).join('')}
      </ol>
      <p class="sleep-streak-key">${icon('check')} Both targets met <span>·</span> ${icon('moon')} Awaiting both times</p>
    </section>

    <div class="card tint-sleep ${entries30.length ? '' : 'chart-card is-empty'}">
      <div class="card-head">
        <div class="card-title sleep">${icon('chart')} Sleep pattern</div>
        <span class="card-hint">Last 30 days</span>
      </div>
      ${
        entries30.length
          ? `<div class="chart-wrap"><canvas id="sleep-chart" role="img" aria-label="Bedtimes and wake times on their calendar dates over the last 30 days. Dashed lines show your targets."></canvas></div>`
          : emptyState({
              iconName: 'moon',
              title: 'No nights logged yet',
              text: 'Your bedtime and wake time will appear here after your first entry.',
            })
      }
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-head">
          <div class="card-title">${icon('sunrise')} Wake-up</div>
        </div>
        <form id="sleep-form">
          <div class="form-grid">
            <div class="field">
              <label for="sleep-date">Date you woke up</label>
              <input class="input" type="date" id="sleep-date" name="date" value="${today}" required />
            </div>
            <div class="field">
              <label for="sleep-wake">Wake time</label>
              <input class="input" type="time" id="sleep-wake" name="wake" value="${escapeHtml(todayLog.wake || '')}" required />
            </div>
          </div>
          <div class="field mt-3">
            <label for="sleep-note">Note (optional)</label>
            <textarea class="input" id="sleep-note" name="note" rows="2" placeholder="How did you sleep?">${escapeHtml(
              todayLog.note || ''
            )}</textarea>
          </div>
          <div class="row wrap mt-4">
            <button class="btn btn-primary" type="submit">${icon('check')} Save wake-up</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title sleep">${icon('moon')} Bedtime</div>
        </div>
        <form id="bed-form">
          <div class="form-grid">
            <div class="field">
              <label for="bed-date">Date you went to bed</label>
              <input class="input" type="date" id="bed-date" value="${today}" required />
            </div>
            <div class="field">
              <label for="sleep-bed">Bedtime</label>
              <input class="input" type="time" id="sleep-bed" value="${escapeHtml(tonightLog.bed || '')}" required />
            </div>
          </div>
           <p class="tiny faint mt-3">Bedtime is shown on the date you choose. You can log the next morning’s wake-up separately.</p>
          <div class="row wrap mt-4">
            <button class="btn btn-primary" type="submit">${icon('check')} Save bedtime</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
        <div class="card-head">
          <div class="card-title sleep">${icon('target')} Your targets</div>
          <span class="card-hint">Saved automatically</span>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="target-wake">Target wake-up</label>
            <input class="input" type="time" id="target-wake" value="${escapeHtml(state.settings.wakeTarget)}" />
          </div>
          <div class="field">
            <label for="target-bed">Target bedtime</label>
            <input class="input" type="time" id="target-bed" value="${escapeHtml(state.settings.bedTarget)}" />
          </div>
        </div>
        <p class="tiny faint mt-3" style="line-height:1.6">
          Your averages use the last 7 nights. History shows how far each time was from its target.
        </p>
        <div class="divider"></div>
        <div class="row wrap">
          ${badge('Within 15 min', 'green')}
          ${badge('16–45 min away', 'amber')}
          ${badge('Over 45 min away', 'red')}
        </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title data">${icon('calendar')} Sleep history</div>
        <span class="card-hint">${sortedLogs.length} night${sortedLogs.length === 1 ? '' : 's'} logged</span>
      </div>
      ${
        sortedLogs.length
          ? `<div class="list">${sortedLogs
              .map((date) => {
                 const log = state.sleepLogs[date];
                 const label = escapeHtml(nightLabel(date, log));
                const wake = timeToMin(log.wake);
                const bed = timeToMin(log.bed);
                const wd = wake != null ? deltaInfo(wake, wakeTarget) : null;
                const bd = bed != null ? deltaInfo(bed, bedTarget) : null;
                return `
                <div class="list-item">
                  <button class="grow" data-edit="${date}" style="background:none;border:0;padding:0;text-align:left;color:inherit;cursor:pointer">
                    <div class="spread" style="justify-content:flex-start;gap:10px;flex-wrap:wrap">
                       <div class="list-title">${log.bed ? 'Night of ' : 'Wake-up · '}${label}</div>
                      ${wd ? badge(wd.label, wd.tone) : ''}
                      ${bd ? badge(`bed ${bd.label}`, bd.tone) : ''}
                    </div>
                    <div class="list-sub">
                       ${log.bed ? `Bed ${escapeHtml(log.bed)} · ` : ''}
                       ${log.wake ? `Up ${escapeHtml(log.wake)}${log.bed ? ` on ${escapeHtml(fmtDate(date, 'short'))}` : ''}` : 'Wake-up not logged'}
                      ${log.note ? ` · ${escapeHtml(log.note)}` : ''}
                    </div>
                  </button>
                  <div class="list-side">
                     <button class="icon-btn" data-edit="${date}" aria-label="Edit ${label}">${icon('pencil')}</button>
                     <button class="icon-btn danger" data-delete="${date}" aria-label="Delete ${label}">${icon('trash')}</button>
                  </div>
                </div>`;
              })
              .join('')}</div>`
          : emptyState({
              iconName: 'calendar',
              title: 'Nothing logged yet',
              text: 'Your nights will be listed here, newest first.',
            })
      }
    </div>
  `;

  /* sleep jump */
  const sleepJump = $('#sleep-jump');
  if (sleepJump) {
    sleepJump.addEventListener('click', () => {
      const formEl = $('#sleep-form');
      if (!formEl) return;
      const top = formEl.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  /* targets */
  $('#target-wake').addEventListener('change', (e) => {
    if (!e.target.value) return;
    update((s) => {
      s.settings.wakeTarget = e.target.value;
    });
    toast('Wake target updated');
  });
  $('#target-bed').addEventListener('change', (e) => {
    if (!e.target.value) return;
    update((s) => {
      s.settings.bedTarget = e.target.value;
    });
    toast('Bedtime target updated');
  });

  /* log form */
  const form = $('#sleep-form');
  const dateInput = $('#sleep-date');
  const wakeInput = $('#sleep-wake');
  const bedForm = $('#bed-form');
  const bedDateInput = $('#bed-date');
  const bedInput = $('#sleep-bed');
  const noteInput = $('#sleep-note');

  dateInput.addEventListener('change', () => {
    const log = getState().sleepLogs[dateInput.value];
    wakeInput.value = (log && log.wake) || '';
    noteInput.value = (log && log.note) || '';
  });

  bedDateInput.addEventListener('change', () => {
    if (!bedDateInput.value) {
      bedInput.value = '';
      return;
    }
    const wakeDate = isoDate(addDays(parseISO(bedDateInput.value), 1));
    bedInput.value = getState().sleepLogs[wakeDate]?.bed || '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = dateInput.value;
    const wake = wakeInput.value;
    const note = noteInput.value.trim();
    if (!date || !wake) return;
    update((s) => {
      s.sleepLogs[date] = { ...(s.sleepLogs[date] || {}), wake, note };
    });
    toast('Wake-up saved');
  });

  bedForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const bedDate = bedDateInput.value;
    const bed = bedInput.value;
    if (!bedDate || !bed) return;
    const wakeDate = isoDate(addDays(parseISO(bedDate), 1));
    update((s) => {
      s.sleepLogs[wakeDate] = { ...(s.sleepLogs[wakeDate] || {}), bed };
    });
    toast(`Bedtime saved for ${fmtDate(bedDate, 'short')}`);
  });

  /* history actions */
  $$('[data-delete]', root).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const date = btn.dataset.delete;
      const ok = await confirmDialog({
        title: 'Delete this night?',
        message: `The sleep log labeled ${nightLabel(date, getState().sleepLogs[date] || {})} will be removed.`,
        confirmText: 'Delete night',
      });
      if (!ok) return;
      update((s) => {
        delete s.sleepLogs[date];
      });
      toast('Night deleted');
    });
  });

  $$('[data-edit]', root).forEach((btn) => {
    btn.addEventListener('click', () => openEditor(btn.dataset.edit));
  });

  if (entries30.length) {
    sleepChart($('#sleep-chart'), {
      dates: dates30,
      wake: dates30.map((d) => {
        const log = state.sleepLogs[d];
        const t = log && log.wake ? timeToMin(log.wake) : null;
        return t == null ? null : clockToAxis(t);
      }),
      bed: dates30.map((d) => {
        const t = timeToMin(sleepTimesForDate(state.sleepLogs, d).bed);
        return t == null ? null : clockToAxis(t);
      }),
      wakeTarget: state.settings.wakeTarget,
      bedTarget: state.settings.bedTarget,
    });
  }
}

function openEditor(date) {
  const log = getState().sleepLogs[date] || { wake: '', bed: '', note: '' };
  const label = nightLabel(date, log);
  const { root, close } = formModal({
    title: `Edit ${label}`,
    body: `
      <div class="form-grid">
        <div class="field">
          <label>Wake time · ${escapeHtml(fmtDate(date, 'short'))}</label>
          <input class="input" type="time" name="wake" value="${escapeHtml(log.wake || '')}" />
        </div>
        <div class="field">
          <label>Bedtime · ${escapeHtml(fmtDate(isoDate(addDays(parseISO(date), -1)), 'short'))}</label>
          <input class="input" type="time" name="bed" value="${escapeHtml(log.bed || '')}" />
        </div>
      </div>
      <div class="field">
        <label>Note (optional)</label>
        <textarea class="input" name="note" rows="2">${escapeHtml(log.note || '')}</textarea>
      </div>`,
    submitText: 'Save changes',
    extraHtml: `<button type="button" class="btn btn-danger" data-del>${icon('trash')} Delete</button>`,
    onSubmit: (data) => {
      if (!data.wake && !data.bed) {
        toast('Add a wake time or bedtime, or delete the night');
        return false;
      }
      update((s) => {
        s.sleepLogs[date] = {
          wake: data.wake,
          bed: data.bed,
          note: (data.note || '').trim(),
        };
      });
      toast('Night updated');
    },
  });

  $(`[data-del]`, root).addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete this night?',
      message: `The sleep log labeled ${label} will be removed.`,
      confirmText: 'Delete night',
    });
    if (!ok) return;
    close();
    update((s) => {
      delete s.sleepLogs[date];
    });
    toast('Night deleted');
  });
}
