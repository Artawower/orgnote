import { expect, test } from 'vitest';
import { parseOrgPlanningDate } from '../shared/parse-org-stamp';

test('parseOrgPlanningDate_parsesActiveDateOnly', () => {
  const result = parseOrgPlanningDate('<2026-05-13 Wed>');
  expect(result).toEqual({
    date: '2026-05-13',
    hasTime: false,
    active: true,
    repeater: undefined,
    warning: undefined,
  });
});

test('parseOrgPlanningDate_parsesInactiveTimestamp_withTime', () => {
  const result = parseOrgPlanningDate('[2026-05-13 Wed 10:30]');
  expect(result?.date).toBe('2026-05-13T10:30');
  expect(result?.hasTime).toBe(true);
  expect(result?.active).toBe(false);
});

test('parseOrgPlanningDate_parsesRepeaterPlus', () => {
  expect(parseOrgPlanningDate('<2026-05-13 Wed +1d>')?.repeater).toEqual({
    type: '+',
    value: 1,
    unit: 'd',
  });
});

test('parseOrgPlanningDate_parsesRepeaterPlusPlus', () => {
  expect(parseOrgPlanningDate('<2026-05-13 Wed ++2w>')?.repeater).toEqual({
    type: '++',
    value: 2,
    unit: 'w',
  });
});

test('parseOrgPlanningDate_parsesRepeaterDotPlus', () => {
  expect(parseOrgPlanningDate('<2026-05-13 Wed .+3m>')?.repeater).toEqual({
    type: '.+',
    value: 3,
    unit: 'm',
  });
});

test('parseOrgPlanningDate_parsesWarning', () => {
  const result = parseOrgPlanningDate('<2026-05-13 Wed -1d>');
  expect(result?.warning).toEqual({ type: '-', value: 1, unit: 'd' });
  expect(result?.repeater).toBeUndefined();
});

test('parseOrgPlanningDate_parsesRepeaterAndWarning_together', () => {
  const result = parseOrgPlanningDate('<2026-05-13 Wed +1d -2d>');
  expect(result?.repeater).toEqual({ type: '+', value: 1, unit: 'd' });
  expect(result?.warning).toEqual({ type: '-', value: 2, unit: 'd' });
});

test('parseOrgPlanningDate_parsesAllRepeaterUnits', () => {
  expect(parseOrgPlanningDate('<2026-05-13 Wed +1h>')?.repeater?.unit).toBe(
    'h'
  );
  expect(parseOrgPlanningDate('<2026-05-13 Wed +1d>')?.repeater?.unit).toBe(
    'd'
  );
  expect(parseOrgPlanningDate('<2026-05-13 Wed +1w>')?.repeater?.unit).toBe(
    'w'
  );
  expect(parseOrgPlanningDate('<2026-05-13 Wed +1m>')?.repeater?.unit).toBe(
    'm'
  );
  expect(parseOrgPlanningDate('<2026-05-13 Wed +1y>')?.repeater?.unit).toBe(
    'y'
  );
});

test('parseOrgPlanningDate_returnsUndefined_forMalformedInput', () => {
  expect(parseOrgPlanningDate(undefined)).toBeUndefined();
  expect(parseOrgPlanningDate('')).toBeUndefined();
  expect(parseOrgPlanningDate('not a date')).toBeUndefined();
  expect(parseOrgPlanningDate('<2026-05-13>')).toBeUndefined();
  expect(parseOrgPlanningDate('[2026-05-13 Wed>')).toBeUndefined();
  expect(parseOrgPlanningDate('2026-05-13')).toBeUndefined();
});

test('parseOrgPlanningDate_trimsSurroundingWhitespace', () => {
  expect(parseOrgPlanningDate('  <2026-05-13 Wed>  ')?.date).toBe('2026-05-13');
});
