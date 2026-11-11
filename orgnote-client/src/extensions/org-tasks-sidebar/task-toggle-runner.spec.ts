import { expect, test, vi } from 'vitest';
import { createAtomicFileContent } from '../../../test/mocks/atomic-file-content';
import { createTaskToggleRunner, type ToggleableTaskNode } from './task-toggle-runner';

vi.mock('src/boot/report', () => ({
  reporter: { reportError: vi.fn(), reportWarning: vi.fn() },
}));

const TASK_FILE = '/work.org';

const createTaskNode = (): ToggleableTaskNode => ({
  id: 'task',
  label: 'task',
  kind: 'task',
  filePath: TASK_FILE,
  taskKind: 'headline-todo',
  start: 0,
});

test('createTaskToggleRunner toggles the task through an atomic file update', async () => {
  const fileContent = createAtomicFileContent({ [TASK_FILE]: '* TODO task\n' });
  const runner = createTaskToggleRunner({ fileContent, loadTasks: vi.fn(async () => undefined) });

  await runner.run(createTaskNode());

  expect(fileContent.update).toHaveBeenCalledWith(TASK_FILE, expect.any(Function));
  expect(fileContent.readText(TASK_FILE)).toBe('* DONE task\n');
});

test('createTaskToggleRunner reloads tasks once after the update', async () => {
  const fileContent = createAtomicFileContent({ [TASK_FILE]: '* TODO task\n' });
  const loadTasks = vi.fn(async () => undefined);
  const runner = createTaskToggleRunner({ fileContent, loadTasks });

  await runner.run(createTaskNode());

  expect(loadTasks).toHaveBeenCalledOnce();
});
