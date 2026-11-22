import { getState, update } from '../store.js?v=20261122145605';
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
  fmtDuration,
  timeToMin,
  deltaInfo,
  progressRing,
  activityRings,
  animateDash,
  badge,
} from '../ui.js?v=20261122145605';
import {
  currentWeekKey,
  weekDaysForKey,
  weekNumberForKey,
  weekLabelForKey,
  todayIndexInWeek,
  programStartsIn,
  programStartKey,
} from '../program.js?v=20261122145605';

function launchDial(startDate, upcoming) {
  return `<div class="poster-art launch-art">
    <svg viewBox="0 0 250 250" class="launch-engraving" aria-hidden="true">
      <defs>
        <radialGradient id="launch-bloom">
          <stop stop-color="#568467" stop-opacity=".55"/>
          <stop offset="1" stop-color="#122e24" stop-opacity=".8"/>
        </radialGradient>
        <linearGradient id="launch-brass" x2="80%" y2="100%">
          <stop stop-color="#f0ce8b"/>
          <stop offset="1" stop-color="#a1814c"/>
        </linearGradient>
      </defs>
      <circle cx="125" cy="125" r="99" fill="url(#launch-bloom)" stroke="#d5c294" stroke-opacity=".24"/>
      <circle cx="125" cy="125" r="111" fill="none" stroke="#d5c294" stroke-opacity=".35" stroke-dasharray="1 5"/>
      <circle cx="125" cy="125" r="79" fill="none" stroke="#d5c294" stroke-opacity=".20"/>
      <path d="M125 26a99 99 0 0 1 86 50" fill="none" stroke="url(#launch-brass)" stroke-width="2"/>
      <path d="M39 174a99 99 0 0 0 86 50" fill="none" stroke="url(#launch-brass)" stroke-width="1" opacity=".6"/>
      <circle cx="211" cy="76" r="3.4" fill="#f0ce8b"/>
    </svg>
    <div class="launch-readout">
      <span class="launch-readout-kicker">Week 1</span>
      <strong>Day 01</strong>
      <span>${escapeHtml(upcoming ? fmtDate(startDate, 'short') : 'Today')}</span>
    </div>
  </div>`;
}

export function render(root) {
  const state = getState();
  const today = todayISO();
  const now = new Date();
  const week = currentWeekKey(now);
  const days = weekDaysForKey(week);
  const todayIndex = todayIndexInWeek(now);
  const weekNum = weekNumberForKey(week);
  const startsIn = programStartsIn(now);
  const preStart = startsIn > 0;
  const startCopy = startsIn === 1 ? 'starts tomorrow' : `starts in ${startsIn} days`;

  const plan = state.plans[week] || [];
  const todaySessions = plan.filter((s) => Number(s.day) === todayIndex);
  const doneToday = todaySessions.filter((s) => s.done).length;
  const doneSessions = plan.filter((s) => s.done).length;
  const plannedSessions = plan.length;
  const percent = plannedSessions ? Math.round((doneSessions / plannedSessions) * 100) : 0;
  const label = weekLabelForKey(week);
  const upcoming = plan
    .filter((s) => !s.done)
    .sort((a, b) => Number(a.day) - Number(b.day));
  const nextSession = upcoming[0] || null;
  const nextDay = nextSession ? days[Number(nextSession.day)] : null;

  const stretchTarget = Math.max(1, Number(state.settings.stretchPerWeek) || 3);
  const weekSet = new Set(days);
  const stretchCount = state.stretchLogs.filter((l) => weekSet.has(l.date)).length;
  const stretchedToday = state.stretchLogs.some((l) => l.date === today);
  const coreDoneToday = state.coreLogs?.some((l) => l.date === today);

  const sleep = state.sleepLogs[today];
  const hasSleep = !!(sleep && (sleep.wake || sleep.bed));
  const firstDay = weekNum === 1 && todayIndex === 0;
  const launch = preStart || (firstDay && !hasSleep && !doneToday && !stretchedToday && !coreDoneToday);
  const startDate = programStartKey();
  const wakeTarget = timeToMin(state.settings.wakeTarget) ?? 7 * 60;
  const bedTarget = timeToMin(state.settings.bedTarget) ?? 23 * 60;
  const wake = hasSleep && sleep.wake ? timeToMin(sleep.wake) : null;
  const bed = hasSleep && sleep.bed ? timeToMin(sleep.bed) : null;
  const wakeDelta = wake != null ? deltaInfo(wake, wakeTarget) : null;
  const bedDelta = bed != null ? deltaInfo(bed, bedTarget) : null;
  const sleepMinutes =
    wake != null && bed != null ? (wake - bed + 1440) % 1440 : null;

  const parts = [];
  if (plannedSessions) parts.push(doneSessions / plannedSessions);
  if (todaySessions.length) parts.push(doneToday / todaySessions.length);
  parts.push(Math.min(1, stretchCount / stretchTarget));
  const consistency = parts.length
    ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100)
    : 0;
  const trainingPct = plannedSessions ? (doneSessions / plannedSessions) * 100 : 0;
  const todayPct = todaySessions.length ? (doneToday / todaySessions.length) * 100 : 0;
  const stretchPct = Math.min(100, (stretchCount / stretchTarget) * 100);

  root.innerHTML = `
    <section class="poster poster-today${launch ? ' poster-launch' : ''}">
      <div class="poster-body">
        <div class="poster-kicker">
          <span>01 / Overview</span>
        </div>
        <div class="poster-chips">
          <span class="glass-chip"><i class="live-dot"></i> ${
            preStart ? `Week ${weekNum} ${startCopy}` : `Week ${weekNum} · Day ${todayIndex + 1}`
          }</span>
        </div>
        <h1 class="poster-title">${preStart ? 'A fresh <em>start.</em>' : firstDay && launch ? 'Day <em>one.</em>' : 'Your day<em>.</em>'}</h1>
        <p class="poster-sub">${
          preStart
             ? `Day 1 is ${escapeHtml(fmtDate(startDate, 'full'))}. You can plan your first week now.`
             : firstDay && launch && !todaySessions.length
             ? 'Your first week starts today. Log your sleep or plan your first workout.'
            : todaySessions.length
            ? `${todaySessions.length} ${todaySessions.length === 1 ? 'session' : 'sessions'} planned today · ${doneToday} complete.`
            : 'No sessions on your plan today.'
        }</p>
        <div class="poster-actions">
          ${preStart ? `
            <a class="btn poster-btn" href="#/plan">${icon('calendar')} Plan Week 1</a>
            <a class="btn poster-btn-ghost" href="#/sleep">${icon('moon')} Sleep log</a>
          ` : `
            <a class="btn poster-btn" href="#/sleep">${icon('moon')} ${hasSleep ? 'Sleep log' : 'Log sleep'}</a>
            <a class="btn poster-btn-ghost" href="#/plan">${icon('calendar')} Weekly plan</a>`}
        </div>
      </div>
      ${launch ? launchDial(startDate, preStart) : `<div class="poster-art daily-dial">
        ${activityRings({
          move: trainingPct,
          exercise: todayPct,
          stand: stretchPct,
          centerText: `${consistency}%`,
           label: 'Progress',
           size: window.innerWidth < 640 ? 140 : 220,
        })}
        <div class="dial-caption"><span>Training</span><span>Today</span><span>Stretch</span></div>
      </div>`}
      <div class="poster-stats">
        <div class="poster-stat"><b>${plannedSessions ? `${doneSessions}<em>/${plannedSessions}</em>` : '—'}</b><span>${
          preStart ? `Training · Week ${weekNum}` : 'Training this week'
        }</span></div>
        <div class="poster-stat"><b>${todaySessions.length ? `${doneToday}<em>/${todaySessions.length}</em>` : '—'}</b><span>Today’s sessions</span></div>
        <div class="poster-stat"><b>${stretchCount}<em>/${stretchTarget}</em></b><span>${
          preStart ? `Stretch · Week ${weekNum}` : 'Stretch this week'
        }</span></div>
        <div class="poster-stat"><b>${sleepMinutes != null ? fmtDuration(sleepMinutes) : '—'}</b><span>Last night’s sleep</span></div>
      </div>
      <div class="poster-week">
        ${days
          .map((date, i) => {
            const dayPlan = plan.filter((s) => Number(s.day) === i);
            const done = dayPlan.length > 0 && dayPlan.every((s) => s.done);
            const has = dayPlan.length > 0;
            const title = `${fmtDate(date, 'full')} — ${
              dayPlan.length ? dayPlan.map((s) => s.title).join(', ') : i === 0 && weekNum === 1 ? 'Program start' : 'No sessions'
            }`;
            return `<div class="pw-day ${i === todayIndex ? 'today' : ''} ${
              done ? 'done' : ''
            } ${has ? 'has' : ''} ${
              preStart && i === 0 ? 'upcoming' : ''
            }" title="${escapeHtml(title)}"><span>${escapeHtml(
               fmtDate(date, 'day')
             )}</span><b>${Number(date.slice(-2))}</b><i></i></div>`;
          })
          .join('')}
      </div>
    </section>

    <div class="section-heading"><h2>Daily check-in</h2></div>
    <div class="dash-grid">
      <div class="card sleep-card tint-sleep">
        <div class="card-ghost">${icon('moon')}</div>
        <div class="card-head">
          <div class="card-title sleep">${icon('moon')} Last night</div>
          ${hasSleep ? `<a class="btn btn-ghost btn-sm" href="#/sleep">Edit</a>` : ''}
        </div>
        ${
          hasSleep
            ? `<div class="sleep-metrics">
                <div class="sleep-metric">
                  <span>Woke up</span>
                  <b>${escapeHtml(sleep.wake || '—')}</b>
                  ${wakeDelta ? badge(wakeDelta.label, wakeDelta.tone) : ''}
                </div>
                <div class="sleep-metric">
                  <span>Bedtime</span>
                  <b>${escapeHtml(sleep.bed || '—')}</b>
                  ${bedDelta ? badge(bedDelta.label, bedDelta.tone) : ''}
                </div>
                <div class="sleep-metric">
                  <span>Sleep</span>
                  <b>${sleepMinutes != null ? fmtDuration(sleepMinutes) : '—'}</b>
                   <em>Target ${escapeHtml(state.settings.bedTarget)}–${escapeHtml(
                     state.settings.wakeTarget
                  )}</em>
                </div>
              </div>
              ${sleep.note ? `<div class="sleep-note">“${escapeHtml(sleep.note)}”</div>` : ''}`
            : emptyState({
                iconName: 'moon',
                title: 'No sleep logged yet',
                 text: 'Add your bedtime and wake time to see how long you slept.',
                action: `<a class="btn btn-primary btn-sm" href="#/sleep">${icon('plus')} Log last night</a>`,
              })
        }
      </div>

      <div class="card train-card tint-train">
        <div class="card-ghost">${icon('dumbbell')}</div>
        <div class="card-head">
          <div class="card-title train">${icon('dumbbell')} Today’s training</div>
          <a class="btn btn-ghost btn-sm" href="#/plan">Weekly plan</a>
        </div>
        ${
          todaySessions.length
            ? `<div class="list">${todaySessions
                .map(
                  (session) => `<div class="check-row ${session.done ? 'done' : ''}">
                    <button class="check ${session.done ? 'on' : ''}" data-session="${
                      session.id
                    }" aria-pressed="${session.done}" aria-label="Mark ${escapeHtml(
                      session.title
                    )} ${session.done ? 'not done' : 'done'}">${icon('check')}</button>
                    <div class="grow">
                      <div class="check-name">${escapeHtml(session.title)}</div>
                      <div class="check-meta">${
                        session.comment
                          ? escapeHtml(session.comment)
                          : session.done
                          ? 'Completed'
                          : 'Planned for today'
                      }</div>
                    </div>
                  </div>`
                )
                .join('')}</div>`
            : emptyState({
                iconName: 'dumbbell',
                title: 'No session planned today',
                 text: 'Add a workout from the weekly plan.',
                action: `<a class="btn btn-secondary btn-sm" href="#/plan">Open weekly plan</a>`,
              })
        }
      </div>

      <div class="card today-stretch-card stretch-card tint-stretch">
        <div class="card-ghost">${icon('stretch')}</div>
        <div class="card-head">
          <div class="card-title stretch">${icon('stretch')} Stretch &amp; core</div>
          <a class="btn btn-ghost btn-sm" href="#/stretch">View log</a>
        </div>
        <div class="ring-row">
          ${progressRing({
            value: stretchCount,
            max: stretchTarget,
            valueText: `${stretchCount}/${stretchTarget}`,
            label: 'week',
            size: 76,
          })}
          <div class="ring-copy grow">
            <div style="font-size:15px;font-weight:600">${
              stretchedToday ? 'Stretch logged' : 'Stretch not logged'
            }</div>
            <div class="small muted mt-2">${
              stretchCount >= stretchTarget
                ? 'Weekly target reached.'
                : `${stretchTarget - stretchCount} session${
                    stretchTarget - stretchCount === 1 ? '' : 's'
                  } left this week.`
            }</div>
             <div class="small muted mt-2">${coreDoneToday ? 'Core logged today.' : 'Core not logged today.'}</div>
           </div>
          <button class="btn ${stretchedToday ? 'btn-green' : 'btn-primary'} btn-sm" id="today-stretch">
            ${icon(stretchedToday ? 'check' : 'stretch')} ${
              stretchedToday ? 'Stretched' : 'I stretched'
            }
          </button>
        </div>
      </div>

      <div class="card week-mini tint-plan">
        <div class="card-ghost-number">${String(weekNum).padStart(2, '0')}</div>
        <div class="card-head">
          <div class="card-title plan">${icon('calendar')} ${
            preStart ? `Week ${weekNum}` : 'This week'
          }</div>
          <a class="btn btn-ghost btn-sm" href="#/plan">Open plan</a>
        </div>
        <div class="week-mini-hero">
          <div class="week-mini-number">${percent}%</div>
          <div>
            <div class="week-mini-range">${escapeHtml(label.range)}</div>
            <div class="week-mini-meta">${
              preStart
                ? `${startCopy[0].toUpperCase()}${startCopy.slice(1)} · ${plannedSessions} planned`
                : `${doneSessions} of ${plannedSessions} sessions done`
            }</div>
          </div>
        </div>
        <div class="week-mini-progress">
          <div class="bar-track"><div class="bar-fill ${
            percent === 100 ? 'green' : ''
          }" style="width:${percent}%"></div></div>
        </div>
        <div class="week-mini-next">
          <span>Next up</span>
          <b>${
            nextSession
              ? `${escapeHtml(fmtDate(nextDay, 'day'))} · ${escapeHtml(nextSession.title)}`
              : 'No sessions planned'
          }</b>
        </div>
      </div>
    </div>

    <div class="card data-card">
      <div class="card-ghost">${icon('download')}</div>
      <div class="card-head">
        <div class="card-title data">${icon('download')} Your data</div>
        <span class="card-hint">Cloud &amp; private</span>
      </div>
      <div class="spread" style="gap:14px;flex-wrap:wrap">
        <div class="small muted" style="max-width:560px;line-height:1.6">
          Your routine lives in one private cloud space, protected by your
          connection key. Export a full backup whenever you want.
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" data-copy-key>${icon('copy')} Copy cloud key</button>
          <button class="btn btn-secondary btn-sm" data-export>${icon('download')} Export backup</button>
        </div>
      </div>
    </div>
  `;

  /* sessions */
  $$('[data-session]', root).forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const rings = ['.ar-move', '.ar-exercise'];
      const previous = rings.map((selector) => {
        const ring = root.querySelector(selector);
        return ring ? Number.parseFloat(getComputedStyle(ring).strokeDashoffset) : NaN;
      });
      const id = btn.dataset.session;
      update((s) => {
        const list = s.plans[week] || [];
        const session = list.find((x) => x.id === id);
        if (session) session.done = !session.done;
      });
      rings.forEach((selector, i) => {
        const ring = root.querySelector(selector);
        const from = Number.isFinite(previous[i]) ? previous[i] : Number(ring?.getAttribute('stroke-dasharray'));
        animateDash(ring, from);
      });
      const next = root.querySelector(`[data-session="${CSS.escape(id)}"]`);
      if (next?.getAttribute('aria-pressed') === 'true') next.classList.add('check-celebrate');
      if (event.detail === 0) next?.focus({ preventScroll: true });
    });
  });

  /* stretch */
  $('#today-stretch').addEventListener('click', async () => {
    if (stretchedToday) {
      const ok = await confirmDialog({
        title: 'Undo today’s stretch?',
        message: 'Today’s stretching session will be removed from your history.',
        confirmText: 'Undo session',
      });
      if (!ok) return;
      update((s) => {
        s.stretchLogs = s.stretchLogs.filter((l) => l.date !== today);
      });
      toast('Session removed');
      return;
    }
    update((s) => {
      if (!s.stretchLogs.some((l) => l.date === today)) {
        s.stretchLogs.push({ date: today, note: '' });
      }
    });
    toast('Stretch logged — nice work');
  });
}
