import type { ClockEntry } from 'org-mode-ast';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

const calendarDayFromIso = (isoDate: string): string => format(parseISO(isoDate), 'yyyy-MM-dd');

const calendarDay = (date: Date): string => format(date, 'yyyy-MM-dd');

const diffDays = (later: string, earlier: string): number =>
  differenceInCalendarDays(parseISO(later), parseISO(earlier));

const uniqueClockDays = (clocks: ClockEntry[]): Set<string> =>
  clocks.reduce<Set<string>>((days, clock) => {
    if (clock.date) days.add(calendarDayFromIso(clock.date));
    return days;
  }, new Set());

export const calcTotalDays = (clocks: ClockEntry[]): number => uniqueClockDays(clocks).size;

export const calcCurrentStreak = (clocks: ClockEntry[], now = new Date()): number => {
  const today = calendarDay(now);
  const days = [...uniqueClockDays(clocks)].sort().reverse();
  if (!days.length) return 0;
  if (diffDays(today, days[0]!) > 1) return 0;
  const breakIndex = days.slice(1).findIndex((day, index) => diffDays(days[index]!, day) !== 1);
  return breakIndex === -1 ? days.length : breakIndex + 1;
};
