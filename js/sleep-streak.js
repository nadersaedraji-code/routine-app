import { addDays, deltaInfo, isoDate, parseISO, sleepTimesForDate, timeToMin } from './ui.js?v=20261127054359';

export function sleepStreak(logs, today, bedTarget, wakeTarget) {
  function dayStatus(date) {
    const log = sleepTimesForDate(logs, date);
    const bed = timeToMin(log?.bed);
    const wake = timeToMin(log?.wake);
    if (bed == null || wake == null) return bed == null && wake == null ? 'missing' : 'partial';
    return deltaInfo(bed, bedTarget).abs <= 15 && deltaInfo(wake, wakeTarget).abs <= 15
      ? 'hit' : 'miss';
  }

  const todayStatus = dayStatus(today);
  const waitingForToday = todayStatus === 'missing' || todayStatus === 'partial';
  const lastCountedDate = waitingForToday ? isoDate(addDays(parseISO(today), -1)) : today;
  let run = 0;
  let best = 0;
  let previousDate = '';
  // Every qualifying day has a wake-up stored under that date.
  for (const date of Object.keys(logs).filter((date) => date <= lastCountedDate).sort()) {
    if (dayStatus(date) === 'hit') {
      const yesterday = isoDate(addDays(parseISO(date), -1));
      run = previousDate === yesterday ? run + 1 : 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    previousDate = date;
  }

  const recent = Array.from({ length: 7 }, (_, i) => {
    const date = isoDate(addDays(parseISO(today), i - 6));
    const status = dayStatus(date);
    return {
      date,
      status: i === 6 && waitingForToday ? 'pending' : status,
    };
  });
  return { current: previousDate === lastCountedDate ? run : 0, best, recent };
}
