export const DEFAULT_PROGRAM_START = '2026-11-22';

export function freshState(now = new Date()) {
  return {
    rev: 0,
    updatedAt: now.toISOString(),
    settings: {
      wakeTarget: '07:00',
      bedTarget: '23:00',
      stretchPerWeek: 5,
      corePerWeek: 3,
      weightGoal: 0,
      weightGoalDate: '',
      programStart: DEFAULT_PROGRAM_START,
    },
    habits: [],
    habitChecks: {},
    sleepLogs: {},
    exercises: [],
    exerciseLogs: [],
    plans: {},
    stretchLogs: [],
    coreLogs: [],
    weightLogs: {},
  };
}
