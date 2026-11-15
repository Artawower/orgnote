import { expect, test } from 'vitest';
import { isTaskLineAt } from '../shared/is-task-line-at';

const CONTENT = '* TODO First\nbody\n* TODO Second task\n';

test('isTaskLineAt_returnsTrue_whenTitleIsOnLineAtOffset', () => {
  expect(isTaskLineAt(CONTENT, CONTENT.indexOf('* TODO Second'), 'Second task')).toBe(true);
});

test('isTaskLineAt_returnsTrue_forFirstLineWithoutTrailingNewline', () => {
  expect(isTaskLineAt('* TODO Only', 0, 'Only')).toBe(true);
});

test('isTaskLineAt_returnsFalse_whenOffsetIsUndefined', () => {
  expect(isTaskLineAt(CONTENT, undefined, 'First')).toBe(false);
});

test('isTaskLineAt_returnsFalse_whenOffsetIsInsideLine', () => {
  expect(isTaskLineAt(CONTENT, CONTENT.indexOf('TODO First'), 'First')).toBe(false);
});

test('isTaskLineAt_returnsFalse_whenTaskMovedToAnotherLine', () => {
  expect(isTaskLineAt(CONTENT, 0, 'Second task')).toBe(false);
});

test('isTaskLineAt_ignoresTitleOnFollowingLines', () => {
  expect(isTaskLineAt(CONTENT, CONTENT.indexOf('body'), 'Second task')).toBe(false);
});
