import { expect, test } from 'vitest';
import { changeTaskTitle } from './task-title';

test('changeTaskTitle_replacesTitle_inPlainHeadline', () => {
  const result = changeTaskTitle('* My old title', 0, 'My new title');
  expect(result).toContain('My new title');
  expect(result).not.toContain('My old title');
});

test('changeTaskTitle_preservesTodoKeyword', () => {
  const result = changeTaskTitle('* TODO My old title', 0, 'My new title');
  expect(result).toContain('* TODO');
  expect(result).toContain('My new title');
});

test('changeTaskTitle_preservesPriority', () => {
  const result = changeTaskTitle('* TODO [#A] My old title', 0, 'My new title');
  expect(result).toContain('[#A]');
  expect(result).toContain('My new title');
});

test('changeTaskTitle_preservesTags', () => {
  const result = changeTaskTitle('* TODO My old title :work:', 0, 'My new title');
  expect(result).toContain(':work:');
  expect(result).toContain('My new title');
});

test('changeTaskTitle_returnsInput_whenHeadlineNotFound', () => {
  const content = '* TODO Task';
  expect(changeTaskTitle(content, 99, 'New')).toBe(content);
});
