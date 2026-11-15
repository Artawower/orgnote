import { expect, test } from 'vitest';
import { changeTaskBody } from './task-body';

test('changeTaskBody_addsBodyText_toEmptySection', () => {
  const result = changeTaskBody('* TODO Task\n', 0, 'New body text');
  expect(result).toContain('New body text');
  expect(result).toContain('* TODO Task');
});

test('changeTaskBody_replacesExistingBody', () => {
  const result = changeTaskBody('* TODO Task\nOld body\n', 0, 'New body');
  expect(result).toContain('New body');
  expect(result).not.toContain('Old body');
});

test('changeTaskBody_doesNotTouchPlanning', () => {
  const result = changeTaskBody(
    '* TODO Task\nSCHEDULED: <2026-05-12 Mon>\nBody text\n',
    0,
    'New body',
  );
  expect(result).toContain('SCHEDULED:');
});

test('changeTaskBody_doesNotTouchPropertiesDrawer', () => {
  const result = changeTaskBody(
    '* TODO Task\n:PROPERTIES:\n:ID: abc\n:END:\nBody\n',
    0,
    'New body',
  );
  expect(result).toContain(':PROPERTIES:');
  expect(result).toContain(':ID: abc');
});

test('changeTaskBody_returnsInput_whenHeadlineNotFound', () => {
  const content = '* TODO Task\n';
  expect(changeTaskBody(content, 99, 'Body')).toBe(content);
});
