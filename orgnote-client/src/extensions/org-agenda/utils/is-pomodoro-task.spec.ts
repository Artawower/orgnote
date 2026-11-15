import { expect, test } from 'vitest';
import { isPomodoroTaskData } from './is-pomodoro-task';
import type { FileTask } from 'orgnote-api';

const validTask: FileTask = {
  id: 'task-1',
  kind: 'headline-todo',
  state: 'todo',
  text: 'Write spec',
  start: 10,
};

const makePayload = (overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
  ...validTask,
  filePath: '/notes/inbox.org',
  ...overrides,
});

const makePayloadWithout = (key: string): Record<string, unknown> => {
  const payload = makePayload();
  delete payload[key];
  return payload;
};

test('isPomodoroTaskData_accepts_taskWithIdAndFilePath', () => {
  expect(isPomodoroTaskData(makePayload())).toBe(true);
});

test('isPomodoroTaskData_rejects_payloadMissingFilePath', () => {
  expect(isPomodoroTaskData(makePayloadWithout('filePath'))).toBe(false);
});

test('isPomodoroTaskData_rejects_payloadMissingId', () => {
  expect(isPomodoroTaskData(makePayloadWithout('id'))).toBe(false);
});

test('isPomodoroTaskData_rejects_nonStringId', () => {
  expect(isPomodoroTaskData(makePayload({ id: 42 }))).toBe(false);
});

test('isPomodoroTaskData_rejects_nonStringFilePath', () => {
  expect(isPomodoroTaskData(makePayload({ filePath: 42 }))).toBe(false);
});

test('isPomodoroTaskData_rejects_null', () => {
  expect(isPomodoroTaskData(null)).toBe(false);
});

test('isPomodoroTaskData_rejects_undefined', () => {
  expect(isPomodoroTaskData(undefined)).toBe(false);
});

test('isPomodoroTaskData_rejects_primitive', () => {
  expect(isPomodoroTaskData('task-1')).toBe(false);
});

test('isPomodoroTaskData_accepts_minimalTask_withOnlyRequiredMarkers', () => {
  expect(isPomodoroTaskData({ id: 'x', filePath: '/f.org' })).toBe(true);
});