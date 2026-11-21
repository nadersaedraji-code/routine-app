/**
 * Program weeks: the training program starts on a fixed date (default
 * 2026-11-22) and every week is a 7-day block from that day.
 */
import { getState } from './store.js?v=20261121231025';
import { isoDate, parseISO, addDays } from './ui.js?v=20261121231025';
import { DEFAULT_PROGRAM_START } from './data-defaults.js?v=20261121231025';
export { DEFAULT_PROGRAM_START };

export function programStartKey() {
  const state = getState();
  const value = state && state.settings ? state.settings.programStart : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : DEFAULT_PROGRAM_START;
}

export function programStartDate() {
  return parseISO(programStartKey());
}

export function daysBetweenKeys(from, to) {
  return Math.round((parseISO(to) - parseISO(from)) / 86400000);
}

/** Day 1 is the program start date. */
export function programDayNumber(date = new Date()) {
  return daysBetweenKeys(programStartKey(), isoDate(date)) + 1;
}

/** Days until Week 1 · Day 1. Zero on the start date (and afterwards). */
export function programStartsIn(date = new Date()) {
  return Math.max(0, daysBetweenKeys(isoDate(date), programStartKey()));
}

export function isBeforeProgram(date = new Date()) {
  return programStartsIn(date) > 0;
}

/** Key = start date (YYYY-MM-DD) of the 7-day block. */
export function currentWeekKey(date = new Date()) {
  if (isBeforeProgram(date)) return programStartKey();
  const index = Math.floor((programDayNumber(date) - 1) / 7);
  return isoDate(addDays(programStartDate(), index * 7));
}

export function weekIndexForKey(key) {
  return Math.floor(daysBetweenKeys(programStartKey(), key) / 7);
}

export function weekNumberForKey(key) {
  return weekIndexForKey(key) + 1;
}

export function weekNumberForDate(date = new Date()) {
  return weekNumberForKey(currentWeekKey(date));
}

export function weekDaysForKey(key) {
  const start = parseISO(key);
  return Array.from({ length: 7 }, (_, i) => isoDate(addDays(start, i)));
}

export function shiftWeekKey(key, delta) {
  return isoDate(addDays(parseISO(key), delta * 7));
}

export function weekLabelForKey(key) {
  const start = parseISO(key);
  const end = addDays(start, 6);
  const month = (d) => d.toLocaleDateString('en-US', { month: 'short' });
  const range =
    start.getMonth() === end.getMonth()
      ? `${month(start)} ${start.getDate()} – ${end.getDate()}`
      : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
  const number = weekNumberForKey(key);
  return { title: `Week ${number}`, range, number };
}

export function todayIndexInWeek(date = new Date()) {
  if (isBeforeProgram(date)) return -1;
  const diff = daysBetweenKeys(currentWeekKey(date), isoDate(date));
  return Math.max(0, Math.min(6, diff));
}

/** Never navigate before Week 1. */
export function clampWeekKey(key) {
  return weekIndexForKey(key) < 0 ? programStartKey() : key;
}

export function isFirstWeek(key) {
  return weekIndexForKey(key) <= 0;
}
