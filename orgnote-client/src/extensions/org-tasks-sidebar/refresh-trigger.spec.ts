import { expect, test } from 'vitest';
import { isOrgTaskRelatedChange } from './refresh-trigger';

test('isOrgTaskRelatedChange returns true for org modify', () => {
  expect(isOrgTaskRelatedChange({ type: 'modify', path: '/notes/task.org' })).toBe(true);
});

test('isOrgTaskRelatedChange returns true for org rename from previous path', () => {
  expect(
    isOrgTaskRelatedChange({
      type: 'rename',
      path: '/notes/task.txt',
      previousPath: '/notes/task.org',
    }),
  ).toBe(true);
});

test('isOrgTaskRelatedChange returns false for non org file changes', () => {
  expect(isOrgTaskRelatedChange({ type: 'modify', path: '/notes/task.txt' })).toBe(false);
});
