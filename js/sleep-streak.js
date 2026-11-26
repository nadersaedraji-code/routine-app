import { addDays, deltaInfo, isoDate, parseISO, timeToMin } from './ui.js?v=20261126165006';

export function sleepStreak(logs, today, bedTarget, wakeTarget) {
  // Paired records are keyed by wake date, even though the night is named for bedtime.
  function nightStatus(log) {
    const bed = timeToMin(log?.bed);
    const wake = timeToMin(log?.wake);
    if (bed == null || wake == null) return bed == null && wake == null ? 'missing' : 'partial';
    return deltaInfo(bed, bedTarget).abs <= 15 && deltaInfo(wake, wakeTarget).abs <= 15
      ? 'hit' : 'miss';
  }

  const todayStatus = nightStatus(logs[today]);
  const waitingForToday = todayStatus === 'missing' || todayStatus === 'partial';
  const lastCountedDate = waitingForToday ? isoDate(addDays(parseISO(today), -1)) : today;
  let run = 0;
  let best = 0;
  let previousDate = '';
  for (const date of Object.keys(logs).filter((date) => date <= lastCountedDate).sort()) {
    if (nightStatus(logs[date]) === 'hit') {
      const yesterday = isoDate(addDays(parseISO(date), -1));
      run = previousDate === yesterday ? run + 1 : 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    previousDate = date;
  }

  const recent = Array.from({ length: 7 }, (_, i) => {
    const wakeDate = addDays(parseISO(today), i - 6);
    const status = nightStatus(logs[isoDate(wakeDate)]);
    return {
      date: isoDate(addDays(wakeDate, -1)),
      status: i === 6 && waitingForToday ? 'pending' : status,
    };
  });
  return { current: previousDate === lastCountedDate ? run : 0, best, recent };
}
