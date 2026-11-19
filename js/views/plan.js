import { getState, update } from '../store.js?v=20261119082955';
import {
  $,
  $$,
  icon,
  escapeHtml,
  toast,
  confirmDialog,
  formModal,
  progressRing,
  uid,
  todayISO,
  fmtDate,
  parseISO,
} from '../ui.js?v=20261119082955';
import {
  currentWeekKey,
  weekDaysForKey,
  weekLabelForKey,
  shiftWeekKey,
  isFirstWeek,
  programStartKey,
  programStartsIn,
} from '../program.js?v=20261119082955';

let planWeek = null;

export function render(root) {
  if (planWeek && planWeek < programStartKey()) planWeek = currentWeekKey();
  const state = getState();
  const activeWeek = planWeek || currentWeekKey();
  const label = weekLabelForKey(activeWeek);
  const days = weekDaysForKey(activeWeek);
  const sessions = state.plans[activeWeek] || [];
  const done = sessions.filter((s) => s.done).length;
  const planned = sessions.length;
  const percent = planned ? Math.round((done / planned) * 100) : 0;
  const isCurrent = activeWeek === currentWeekKey();
  const first = isFirstWeek(activeWeek);
  const todayIndex = days.indexOf(todayISO());
  const startsIn = programStartsIn();
  const preStart = startsIn > 0;
  const pad = String(label.number).padStart(2, '0');

  root.innerHTML = `
    <div class="plan-shell">
      <section class="poster poster-plan">
        <div class="poster-body">
          <div class="poster-kicker">
            <span>Program</span>
            <span class="poster-index">03</span>
          </div>
          <div class="poster-chips">
            <span class="glass-chip">Week ${label.number}</span>
            <span class="glass-chip">${escapeHtml(label.range)}</span>
            ${
              preStart
                ? `<span class="glass-chip">${
                    startsIn === 1 ? 'Starts tomorrow' : `Starts in ${startsIn} days`
                  }</span>`
                : ''
            }
          </div>
          <h1 class="poster-title">Weekly plan</h1>
          <p class="poster-sub">${
            planned
              ? `${done} of ${planned} sessions done${
                  done === planned ? ' — week complete.' : `. ${planned - done} to go.`
                }`
              : 'No sessions planned yet. Build the week you want to live.'
          }</p>
          <div class="poster-actions">
            <button class="btn poster-btn" id="add-session">${icon('plus')} Add session</button>
            <div class="poster-controls">
              ${
                isCurrent
                  ? `<span class="badge">${
                      preStart
                        ? startsIn === 1
                          ? 'Starts tomorrow'
                          : `Starts in ${startsIn}d`
                        : 'This week'
                    }</span>`
                  : `<button class="btn btn-ghost btn-sm" data-week-now>This week</button>`
              }
              <button class="icon-btn" data-week="-1" aria-label="Previous week" ${
                first ? 'disabled' : ''
              }>${icon('left')}</button>
              <button class="icon-btn" data-week="1" aria-label="Next week">${icon(
                'right'
              )}</button>
            </div>
          </div>
        </div>
        <div class="poster-art plan-art">
          <div class="plan-big-week">${pad}</div>
          <div class="plan-big-label">week</div>
        </div>
        <div class="poster-stats">
          <div class="poster-stat"><b>${done}</b><span>Sessions done</span></div>
          <div class="poster-stat"><b>${planned}</b><span>Planned</span></div>
          <div class="poster-stat"><b>${Math.max(0, planned - done)}</b><span>To go</span></div>
          <div class="poster-stat"><b>${planned ? `${percent}%` : '—'}</b><span>Completion</span></div>
        </div>
        <div class="poster-progress">
          <div class="bar-track"><div class="bar-fill ${
            percent === 100 ? 'green' : ''
          }" style="width:${percent}%"></div></div>
          <div class="poster-progress-meta"><span>${done}/${planned} sessions</span><span>${percent}%</span></div>
        </div>
        <div class="poster-week">
          ${days
            .map((date, i) => {
              const daySessions = sessions.filter((s) => Number(s.day) === i);
              const dayDone = daySessions.length > 0 && daySessions.every((s) => s.done);
              const has = daySessions.length > 0;
              const title = `${fmtDate(date, 'full')} — ${
                daySessions.length ? daySessions.map((s) => s.title).join(', ') : 'no sessions'
              }`;
              return `<div class="pw-day ${i === todayIndex ? 'today' : ''} ${
                dayDone ? 'done' : ''
              } ${has ? 'has' : ''}" title="${escapeHtml(title)}"><span>${escapeHtml(
                fmtDate(date, 'day').slice(0, 1)
              )}</span><i></i></div>`;
            })
            .join('')}
        </div>
      </section>

      <div class="plan-body">
        <div class="week-grid">
          ${days
            .map((date, index) => {
              const daySessions = sessions.filter((s) => Number(s.day) === index);
              const isToday = date === todayISO();
              return `<div class="day-col ${isToday ? 'is-today' : ''}">
                <div class="day-head">
                  <span class="day-name">${escapeHtml(fmtDate(date, 'day'))}</span>
                  <span class="day-num">${parseISO(date).getDate()}</span>
                </div>
                ${daySessions
                  .map((session) => {
                    const overdue = !session.done && date < todayISO();
                    return `<div class="session ${session.done ? 'done' : ''}">
                      <div class="session-title">${escapeHtml(session.title)}</div>
                      ${
                        overdue
                          ? `<span class="badge red" style="font-size:8.5px;padding:1px 6px;align-self:flex-start">Missed</span>`
                          : ''
                      }
                      ${
                        session.comment
                          ? `<div class="session-note">${escapeHtml(session.comment)}</div>`
                          : ''
                      }
                      <div class="session-actions">
                        <button class="check ${session.done ? 'on' : ''}" data-session-done="${
                          session.id
                        }" aria-pressed="${session.done}" aria-label="Mark ${
                          session.done ? 'not done' : 'done'
                        }" title="${session.done ? 'Mark not done' : 'Mark done'}">
                          ${icon('check')}
                        </button>
                        <span style="flex:1"></span>
                        <button class="icon-btn" data-session-note="${
                          session.id
                        }" title="${
                          session.comment ? 'Edit note' : 'Add note'
                        }" aria-label="Session note">${icon('note')}</button>
                        <button class="icon-btn danger" data-session-del="${
                          session.id
                        }" title="Delete session" aria-label="Delete session">${icon(
                          'trash'
                        )}</button>
                      </div>
                    </div>`;
                  })
                  .join('')}
                <button class="add-session-btn" data-add-day="${index}" aria-label="Add session on ${fmtDate(
                  date,
                  'full'
                )}" title="Add session">${icon('plus')}<span>Add session</span></button>
              </div>`;
            })
            .join('')}
        </div>

        <div class="row wrap mt-4" style="justify-content:space-between">
          <span class="tiny faint">Comments are optional. Plan the week, then tick sessions off as you go.</span>
          ${
            isCurrent
              ? `<button class="btn btn-secondary btn-sm" data-week="1">Plan next week ${icon(
                  'right'
                )}</button>`
              : `<button class="btn btn-secondary btn-sm" data-week-now>Jump to this week</button>`
          }
        </div>
      </div>
    </div>
  `;

  $('#add-session').addEventListener('click', () => openAddSession(activeWeek));

  $$('[data-week]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      planWeek = shiftWeekKey(activeWeek, Number(btn.dataset.week));
      const y = window.scrollY;
      render(root);
      window.scrollTo(0, y);
    });
  });

  $$('[data-week-now]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      planWeek = currentWeekKey();
      const y = window.scrollY;
      render(root);
      window.scrollTo(0, y);
    });
  });

  $$('[data-add-day]', root).forEach((btn) => {
    btn.addEventListener('click', () =>
      openAddSession(activeWeek, Number(btn.dataset.addDay))
    );
  });

  $$('[data-session-done]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      update((s) => {
        const list = s.plans[activeWeek] || [];
        const session = list.find((x) => x.id === btn.dataset.sessionDone);
        if (session) session.done = !session.done;
      });
    });
  });

  $$('[data-session-note]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const session = (getState().plans[activeWeek] || []).find(
        (x) => x.id === btn.dataset.sessionNote
      );
      if (session) openEditSession(session, activeWeek);
    });
  });

  $$('[data-session-del]', root).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const session = (getState().plans[activeWeek] || []).find(
        (x) => x.id === btn.dataset.sessionDel
      );
      if (!session) return;
      const ok = await confirmDialog({
        title: 'Delete this session?',
        message: `“${session.title}” will be removed from ${weekLabelForKey(activeWeek).title}.`,
        confirmText: 'Delete session',
      });
      if (!ok) return;
      update((s) => {
        s.plans[activeWeek] = (s.plans[activeWeek] || []).filter((x) => x.id !== session.id);
        if (!s.plans[activeWeek].length) delete s.plans[activeWeek];
      });
      toast('Session deleted');
    });
  });
}

function openAddSession(activeWeek, dayIndex) {
  const days = weekDaysForKey(activeWeek);
  const defaultDay = Number.isInteger(dayIndex)
    ? dayIndex
    : days.indexOf(todayISO()) >= 0
    ? days.indexOf(todayISO())
    : 0;

  formModal({
    title: 'Add a session',
    body: `
      <div class="field">
        <label>Session</label>
        <input class="input" name="title" placeholder="e.g. Push day · 5 km run" maxlength="80" required />
      </div>
      <div class="field">
        <label>Day</label>
        <select class="select" name="day">
          ${days
            .map(
              (date, i) =>
                `<option value="${i}" ${i === defaultDay ? 'selected' : ''}>${fmtDate(
                  date,
                  'weekday'
                )} ${parseISO(date).getDate()}</option>`
            )
            .join('')}
        </select>
      </div>
      <div class="field">
        <label>Note (optional)</label>
        <textarea class="input" name="comment" rows="2" placeholder="Anything to remember"></textarea>
      </div>`,
    submitText: 'Add to plan',
    onSubmit: (data) => {
      const title = (data.title || '').trim();
      if (!title) {
        toast('Give the session a title', 'error');
        return false;
      }
      update((s) => {
        if (!s.plans[activeWeek]) s.plans[activeWeek] = [];
        s.plans[activeWeek].push({
          id: uid('p'),
          day: Number(data.day) || 0,
          title,
          done: false,
          comment: (data.comment || '').trim(),
        });
      });
      toast('Session added to the plan');
    },
  });
}

function openEditSession(session, activeWeek) {
  formModal({
    title: 'Session details',
    body: `
      <div class="field">
        <label>Session</label>
        <input class="input" name="title" value="${escapeHtml(session.title)}" maxlength="80" required />
      </div>
      <div class="field">
        <label>Comment (optional)</label>
        <textarea class="input" name="comment" rows="3" placeholder="How did it go?">${escapeHtml(
          session.comment || ''
        )}</textarea>
      </div>`,
    submitText: 'Save',
    onSubmit: (data) => {
      const title = (data.title || '').trim();
      if (!title) {
        toast('Give the session a title', 'error');
        return false;
      }
      update((s) => {
        const list = s.plans[activeWeek] || [];
        const target = list.find((x) => x.id === session.id);
        if (target) {
          target.title = title;
          target.comment = (data.comment || '').trim();
        }
      });
      toast('Session updated');
    },
  });
}
