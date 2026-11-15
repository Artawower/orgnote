import { test, expect } from 'vitest';
import { tasksToReport } from './tasks-to-report';
import type { QueueTask } from 'orgnote-api';

const createTask = (overrides: Partial<QueueTask> = {}): QueueTask => ({
  id: 'task-1',
  payload: { data: 'test' },
  queueId: 'default',
  added: 1700000000000,
  ...overrides,
});

test('tasksToReport returns empty array JSON for empty tasks', () => {
  const result = tasksToReport([]);
  expect(result).toBe('[]');
});

test('tasksToReport returns formatted JSON string', () => {
  const tasks = [createTask({ id: 'task-1' })];

  const result = tasksToReport(tasks);
  const parsed = JSON.parse(result);

  expect(parsed).toHaveLength(1);
  expect(parsed[0].id).toBe('task-1');
});

test('tasksToReport includes all task fields', () => {
  const task = createTask({
    id: 'test-id',
    status: 'pending',
    queueId: 'my-queue',
    started: 1700000001000,
    retries: 3,
  });

  const result = tasksToReport([task]);
  const parsed = JSON.parse(result);

  expect(parsed[0]).toMatchObject({
    id: 'test-id',
    status: 'pending',
    queueId: 'my-queue',
    started: 1700000001000,
    retries: 3,
  });
});

test('tasksToReport handles multiple tasks', () => {
  const tasks = [createTask({ id: 'task-1' }), createTask({ id: 'task-2' })];

  const result = tasksToReport(tasks);
  const parsed = JSON.parse(result);

  expect(parsed).toHaveLength(2);
  expect(parsed[0].id).toBe('task-1');
  expect(parsed[1].id).toBe('task-2');
});

test('tasksToReport returns empty array on serialization error', () => {
  const circular: Record<string, unknown> = { a: 1 };
  circular.self = circular;
  const task = createTask({ payload: circular });

  const result = tasksToReport([task]);

  expect(result).toBe('[]');
});
