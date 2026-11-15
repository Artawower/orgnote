import { expect, test } from 'vitest';
import { changeTaskPriority } from './task-priority';

test('changeTaskPriority_addsPriority_toHeadlineWithoutPriority', () => {
  expect(changeTaskPriority('* TODO My task', 0, 'A')).toBe('* TODO [#A] My task');
});

test('changeTaskPriority_addsPriority_toPlainHeadline', () => {
  expect(changeTaskPriority('* My task', 0, 'B')).toBe('* [#B] My task');
});

test('changeTaskPriority_replacesPriority_whenAlreadySet', () => {
  expect(changeTaskPriority('* TODO [#A] My task', 0, 'C')).toBe('* TODO [#C] My task');
});

test('changeTaskPriority_removesPriority_whenUndefined', () => {
  expect(changeTaskPriority('* TODO [#A] My task', 0, undefined)).toBe('* TODO My task');
});

test('changeTaskPriority_removesPriority_whenEmpty', () => {
  expect(changeTaskPriority('* TODO [#B] My task', 0, '')).toBe('* TODO My task');
});

test('changeTaskPriority_preservesTags_whenChangingPriority', () => {
  const result = changeTaskPriority('* TODO [#A] My task :work:', 0, 'B');
  expect(result).toBe('* TODO [#B] My task :work:');
});

test('changeTaskPriority_replacesPriority_onNestedHeadline', () => {
  const prefix = '* Root headline\n\n';
  const content = `${prefix}** TODO [#C] Implement pagination for list view 6\n   SCHEDULED: <2026-05-28 Fri>`;
  const headlineStart = prefix.length;
  expect(changeTaskPriority(content, headlineStart, 'D'))
    .toBe(`${prefix}** TODO [#D] Implement pagination for list view 6\n   SCHEDULED: <2026-05-28 Fri>`);
});

test('changeTaskPriority_addsPriority_toNestedHeadlineWithoutPriority', () => {
  const prefix = '* Root\n\n';
  const content = `${prefix}** TODO My nested task`;
  const headlineStart = prefix.length;
  expect(changeTaskPriority(content, headlineStart, 'A'))
    .toBe(`${prefix}** TODO [#A] My nested task`);
});

test('changeTaskPriority_onlyModifiesTargetHeadline_withOffset', () => {
  const content = '* TODO First task\n* TODO [#A] Second task';
  const secondStart = content.indexOf('* TODO [#A]');
  const result = changeTaskPriority(content, secondStart, 'C');
  expect(result).toBe('* TODO First task\n* TODO [#C] Second task');
});
