import { expect, test } from 'vitest';
import {
  adjustTaskForInsertion,
  calculateSegmentElapsed,
  type ActiveSession,
} from './pomodoro-session';

const SESSION: ActiveSession = {
  taskId: 'task-1',
  taskText: 'Current task',
  filePath: '/tasks.org',
  taskStart: 10,
  segmentStartedAt: '2026-01-01T10:00:00.000Z',
  accumulatedSeconds: 0,
  duration: 25,
  type: 'pomo',
  paused: false,
};

const TASK = {
  id: 'task-2',
  text: 'Next task',
  filePath: '/tasks.org',
  start: 100,
  kind: 'headline-todo' as const,
  state: 'todo' as const,
};

test('calculates segment elapsed against the supplied transition time', () => {
  const endedAt = new Date('2026-01-01T10:00:30.000Z');

  expect(calculateSegmentElapsed(SESSION, endedAt)).toBe(30);
});

test('adjusts a later same-file task for inserted clock content', () => {
  expect(adjustTaskForInsertion(TASK, SESSION, { start: 3, length: 5 }).start).toBe(105);
});

test('keeps earlier task positions unchanged after clock insertion', () => {
  expect(adjustTaskForInsertion({ ...TASK, start: 2 }, SESSION, { start: 3, length: 5 }).start).toBe(
    2,
  );
});
