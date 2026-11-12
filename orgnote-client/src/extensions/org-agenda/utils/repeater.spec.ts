import { expect, test } from 'vitest';
import { nextDateFromRepeater } from './repeater';
import type { OrgDate } from 'org-mode-ast';

const makeScheduled = (date: string, type: string, value: number, unit: string): OrgDate => ({
  date,
  active: true,
  hasTime: false,
  start: 0,
  end: 0,
  repeater: { type: type as '+', value, unit: unit as 'd' },
});

const completed = new Date('2026-05-12T22:00:00');

test('nextDateFromRepeater_returnsOriginalDate_whenNoRepeater', () => {
  const scheduled: OrgDate = { date: '2026-05-10', active: true, hasTime: false, start: 0, end: 0 };
  expect(nextDateFromRepeater(scheduled, completed)).toBe('2026-05-10');
});

test('nextDateFromRepeater_cumulate_addsIntervalToScheduledDate', () => {
  expect(nextDateFromRepeater(makeScheduled('2026-05-10', '+', 1, 'd'), completed)).toBe(
    '2026-05-11',
  );
});

test('nextDateFromRepeater_catchUp_advancesToNextFutureDate', () => {
  // 01 → 04 → 07 → 10 → 13 (first > 2026-05-12)
  expect(nextDateFromRepeater(makeScheduled('2026-05-01', '++', 3, 'd'), completed)).toBe(
    '2026-05-13',
  );
});

test('nextDateFromRepeater_restart_addsIntervalFromCompletionDate', () => {
  expect(nextDateFromRepeater(makeScheduled('2026-05-01', '.+', 7, 'd'), completed)).toBe(
    '2026-05-19',
  );
});

test('nextDateFromRepeater_cumulate_withWeeklyInterval', () => {
  expect(nextDateFromRepeater(makeScheduled('2026-05-05', '+', 1, 'w'), completed)).toBe(
    '2026-05-12',
  );
});

test('nextDateFromRepeater_returnsOriginalDate_forUnsupportedRepeaterType', () => {
  expect(nextDateFromRepeater(makeScheduled('2026-05-10', '-', 1, 'd'), completed)).toBe(
    '2026-05-10',
  );
});

test('nextDateFromRepeater_monthly_usesCalendarMonths_notThirtyDays', () => {
  expect(nextDateFromRepeater(makeScheduled('2026-01-31', '+', 1, 'm'), completed)).toBe(
    '2026-02-28',
  );
});

test('nextDateFromRepeater_yearly_respectsLeapYears', () => {
  expect(nextDateFromRepeater(makeScheduled('2024-02-29', '+', 1, 'y'), completed)).toBe(
    '2025-02-28',
  );
});
