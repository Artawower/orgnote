import { expect, test } from 'vitest';
import { changeTaskScheduled } from './task-scheduled';

const HEADLINE = '* TODO My task';
const WITH_SCHEDULED = '* TODO My task\nSCHEDULED: <2026-05-17 Sun>\nbody';

test('changeTaskScheduled_addsScheduled_whenNotPresent', () => {
  const result = changeTaskScheduled(HEADLINE, 0, { date: '2026-05-17' });
  expect(result).toContain('SCHEDULED: <2026-05-17 Sun>');
});

test('changeTaskScheduled_replacesScheduled_whenAlreadyPresent', () => {
  const result = changeTaskScheduled(WITH_SCHEDULED, 0, { date: '2026-06-01' });
  expect(result).toContain('SCHEDULED: <2026-06-01 Mon>');
  expect(result).not.toContain('2026-05-17');
});

test('changeTaskScheduled_removesScheduled_whenDateUndefined', () => {
  const result = changeTaskScheduled(WITH_SCHEDULED, 0, undefined);
  expect(result).not.toContain('SCHEDULED:');
  expect(result).toContain('body');
});

test('changeTaskScheduled_preservesDeadline_whenChangingScheduled', () => {
  const content = '* TODO My task\nSCHEDULED: <2026-05-17 Sun>\nDEADLINE: <2026-05-20 Wed>\nbody';
  const result = changeTaskScheduled(content, 0, { date: '2026-06-01' });
  expect(result).toContain('DEADLINE: <2026-05-20 Wed>');
  expect(result).toContain('SCHEDULED: <2026-06-01 Mon>');
});

test('changeTaskScheduled_noChange_whenNoScheduledAndUndefined', () => {
  expect(changeTaskScheduled(HEADLINE, 0, undefined)).toBe(HEADLINE);
});

test('changeTaskScheduled_preservesBody_whenAddingScheduled', () => {
  const content = '* TODO My task\nbody content';
  const result = changeTaskScheduled(content, 0, { date: '2026-05-17' });
  expect(result).toContain('body content');
  expect(result).toContain('SCHEDULED:');
});

test('changeTaskScheduled_onlyModifiesTargetHeadline_withOffset', () => {
  const content = '* TODO First\nSCHEDULED: <2026-05-10 Sun>\n* TODO Second\nbody';
  const secondStart = content.indexOf('* TODO Second');
  const result = changeTaskScheduled(content, secondStart, { date: '2026-06-01' });
  expect(result).toContain('SCHEDULED: <2026-05-10 Sun>');
  expect(result).toContain('SCHEDULED: <2026-06-01 Mon>');
});

test('changeTaskScheduled_preservesRepeater_whenProvided', () => {
  const result = changeTaskScheduled(WITH_SCHEDULED, 0, {
    date: '2026-06-01',
    repeater: { type: '+', value: 1, unit: 'w' },
  });
  expect(result).toContain('SCHEDULED: <2026-06-01 Mon +1w>');
});

test('changeTaskScheduled_clearsRepeater_whenOmitted', () => {
  const content = '* TODO My task\nSCHEDULED: <2026-05-17 Sun +1d>\nbody';
  const result = changeTaskScheduled(content, 0, { date: '2026-06-01' });
  expect(result).toContain('SCHEDULED: <2026-06-01 Mon>');
  expect(result).not.toContain('+1d');
});

test('changeTaskScheduled_setsDate_onNestedHeadline', () => {
  const prefix = '* Root\n\n';
  const content = `${prefix}** TODO My nested task`;
  const headlineStart = prefix.length;
  const result = changeTaskScheduled(content, headlineStart, { date: '2026-06-01' });
  expect(result).toContain('SCHEDULED: <2026-06-01 Mon>');
  expect(result.indexOf('** TODO')).toBe(prefix.length);
});
