import { expect, test } from 'vitest';
import { deleteTask } from './delete-task';

const SINGLE_TASK = '* TODO Buy milk\n';
const TWO_TASKS = '* TODO Buy milk\n* TODO Walk dog\n';

test('deleteTask_existingHeadline_removesIt', () => {
  const result = deleteTask(SINGLE_TASK, 0);
  expect(result).not.toContain('Buy milk');
});

test('deleteTask_missingHeadline_keepsContent', () => {
  const result = deleteTask(SINGLE_TASK, 999);
  expect(result).toContain('Buy milk');
});

test('deleteTask_multipleHeadlines_removesOnlyTarget', () => {
  const result = deleteTask(TWO_TASKS, 0);
  expect(result).not.toContain('Buy milk');
  expect(result).toContain('Walk dog');
});
