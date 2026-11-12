import { expect, test } from 'vitest';
import { changeTaskStatus } from './task-status';

test('changeTaskStatus_changesKeyword_fromTodoToDone', () => {
  expect(changeTaskStatus('* TODO My task\nsome body', 0, 'DONE')).toBe(
    '* DONE My task\nsome body',
  );
});

test('changeTaskStatus_changesKeyword_fromDoneToTodo', () => {
  expect(changeTaskStatus('* DONE My task', 0, 'TODO')).toBe('* TODO My task');
});

test('changeTaskStatus_changesKeyword_toCustom', () => {
  expect(changeTaskStatus('* TODO My task', 0, 'WAIT')).toBe('* WAIT My task');
});

test('changeTaskStatus_returnsInput_whenHeadlineNotFound', () => {
  const content = '* TODO My task';
  expect(changeTaskStatus(content, 99, 'DONE')).toBe(content);
});

test('changeTaskStatus_returnsInput_whenNoTodoKeyword', () => {
  const content = '* My plain headline';
  expect(changeTaskStatus(content, 0, 'DONE')).toBe(content);
});
