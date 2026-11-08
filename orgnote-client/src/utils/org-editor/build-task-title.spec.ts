import { expect, test } from 'vitest';
import { buildTaskEditorTitle } from './build-task-title';

test('buildTaskEditorTitle_returnsCleanTitle_whenNoPriority', () => {
  expect(buildTaskEditorTitle('My task', undefined)).toBe('My task');
});

test('buildTaskEditorTitle_embedsPriority_whenPrioritySet', () => {
  expect(buildTaskEditorTitle('My task', 'A')).toBe('[#A] My task');
});

test('buildTaskEditorTitle_handlesDifferentPriorityLetters', () => {
  expect(buildTaskEditorTitle('Task', 'C')).toBe('[#C] Task');
});

test('buildTaskEditorTitle_returnsEmptyTitle_whenOnlyPriorityAndNoText', () => {
  expect(buildTaskEditorTitle('', 'B')).toBe('[#B] ');
});

test('buildTaskEditorTitle_returnsEmpty_whenBothEmpty', () => {
  expect(buildTaskEditorTitle('', undefined)).toBe('');
});
