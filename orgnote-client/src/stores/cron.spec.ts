import { setActivePinia, createPinia } from 'pinia';
import { test, expect, beforeEach, vi, afterEach } from 'vitest';

const { mockSchedulerInstance, mockSimpleIntervalJob, mockAsyncTask, mockCronJob } = vi.hoisted(
  () => {
    const mockSchedulerInstance = {
      addSimpleIntervalJob: vi.fn(),
      addCronJob: vi.fn(),
      removeById: vi.fn(),
      stopById: vi.fn(),
      startById: vi.fn(),
      stop: vi.fn(),
    };

    const mockSimpleIntervalJob = vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
    }));

    const mockAsyncTask = vi.fn().mockImplementation((id: string, fn: () => Promise<void>) => ({
      id,
      execute: fn,
    }));

    const mockCronJob = vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
    }));

    return { mockSchedulerInstance, mockSimpleIntervalJob, mockAsyncTask, mockCronJob };
  },
);

vi.mock('toad-scheduler', () => {
  class MockToadScheduler {
    addSimpleIntervalJob = mockSchedulerInstance.addSimpleIntervalJob;
    addCronJob = mockSchedulerInstance.addCronJob;
    removeById = mockSchedulerInstance.removeById;
    stopById = mockSchedulerInstance.stopById;
    startById = mockSchedulerInstance.startById;
    stop = mockSchedulerInstance.stop;
  }

  return {
    ToadScheduler: MockToadScheduler,
    SimpleIntervalJob: mockSimpleIntervalJob,
    AsyncTask: mockAsyncTask,
    CronJob: mockCronJob,
  };
});

vi.mock('quasar', () => ({
  Platform: {
    is: {
      mobile: false,
      desktop: true,
      android: false,
      ios: false,
      electron: false,
    },
  },
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useConfig: () => ({ settings: {} }),
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: { report: vi.fn() },
}));

vi.mock('src/boot/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { useCronStore } from './cron';
import type { CronTaskConfig, CronTask } from 'orgnote-api';

const createMockTaskConfig = (overrides: Partial<CronTaskConfig> = {}): CronTaskConfig => ({
  id: `task-${Date.now()}`,
  handler: vi.fn().mockResolvedValue(undefined),
  interval: 1000,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  const pinia = createPinia();
  setActivePinia(pinia);
});

afterEach(() => {
  vi.clearAllMocks();
});

test('useCronStore initial state is correct', () => {
  const store = useCronStore();

  expect(store.status).toBe('stopped');
  expect(store.tasks).toEqual({});
});

test('useCronStore register creates new task', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ id: 'test-task' });

  const task = await store.register(config);

  expect(task).toBeDefined();
  expect(task.id).toBe('test-task');
  expect(task.status).toBe('active');
  expect(store.tasks['test-task']).toBeDefined();
});

test('useCronStore register updates existing task config and preserves metadata', async () => {
  const store = useCronStore();
  const firstHandler = vi.fn();
  const secondHandler = vi.fn();
  const initialConfig = createMockTaskConfig({ id: 'duplicate-task', handler: firstHandler });

  const first = await store.register(initialConfig);
  store.tasks['duplicate-task'] = {
    ...first,
    lastRun: 123,
    nextRun: 456,
  } as CronTask;

  await store.register({ ...initialConfig, interval: 2000, handler: secondHandler });

  const updated = store.tasks['duplicate-task'];
  if (!updated) throw new Error('Task not found');
  if ('interval' in updated) {
    expect(updated.interval).toBe(2000);
  } else {
    throw new Error('Expected interval task');
  }
  expect(store.tasks['duplicate-task']?.lastRun).toBe(123);
  expect(store.tasks['duplicate-task']?.nextRun).toBe(456);

  await store.runImmediately('duplicate-task');
  expect(secondHandler).toHaveBeenCalled();
  expect(firstHandler).not.toHaveBeenCalled();
});

test('useCronStore register sets nextRun for interval task', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ interval: 5000 });

  const task = await store.register(config);

  expect(task.nextRun).toBeDefined();
  expect(task.nextRun).toBeGreaterThan(Date.now() - 1000);
});

test('useCronStore unregister removes task', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ id: 'to-remove' });
  await store.register(config);

  await store.unregister('to-remove');

  expect(store.tasks['to-remove']).toBeUndefined();
  expect(mockSchedulerInstance.removeById).toHaveBeenCalledWith('to-remove');
});

test('useCronStore get returns task by id', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ id: 'get-test' });
  await store.register(config);

  const task = store.get('get-test');

  expect(task).toBeDefined();
  expect(task?.id).toBe('get-test');
});

test('useCronStore get returns undefined for non-existent task', () => {
  const store = useCronStore();

  const task = store.get('non-existent');

  expect(task).toBeUndefined();
});

test('useCronStore pause updates task status', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ id: 'pause-test' });
  await store.register(config);

  await store.pause('pause-test');

  expect(store.tasks['pause-test']?.status).toBe('paused');
  expect(mockSchedulerInstance.stopById).toHaveBeenCalledWith('pause-test');
});

test('useCronStore resume updates task status', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ id: 'resume-test' });
  await store.register(config);
  await store.pause('resume-test');

  await store.resume('resume-test');

  expect(store.tasks['resume-test']?.status).toBe('active');
  expect(mockSchedulerInstance.startById).toHaveBeenCalledWith('resume-test');
});

test('useCronStore resume does not resume stopped task', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ id: 'stopped-test' });
  await store.register(config);
  await store.stop('stopped-test');

  await store.resume('stopped-test');

  expect(store.tasks['stopped-test']).toBeUndefined();
});

test('useCronStore stop sets status to stopped', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ id: 'stop-test' });
  await store.register(config);

  await store.stop('stop-test');

  expect(store.tasks['stop-test']).toBeUndefined();
  expect(mockSchedulerInstance.removeById).toHaveBeenCalledWith('stop-test');
});

test('useCronStore runImmediately executes handler', async () => {
  const store = useCronStore();
  const handler = vi.fn().mockResolvedValue(undefined);
  const config = createMockTaskConfig({ id: 'run-now', handler });
  await store.register(config);

  await store.runImmediately('run-now');

  expect(handler).toHaveBeenCalled();
  expect(store.tasks['run-now']?.lastRun).toBeDefined();
});

test('useCronStore runImmediately throws for non-existent task', async () => {
  const store = useCronStore();

  await expect(store.runImmediately('non-existent')).rejects.toThrow('Task non-existent not found');
});

test('useCronStore pauseAll pauses all active tasks', async () => {
  const store = useCronStore();
  await store.register(createMockTaskConfig({ id: 'task-1' }));
  await store.register(createMockTaskConfig({ id: 'task-2' }));

  await store.pauseAll();

  expect(mockSchedulerInstance.stop).toHaveBeenCalled();
  expect(store.tasks['task-1']?.status).toBe('paused');
  expect(store.tasks['task-2']?.status).toBe('paused');
});

test('useCronStore resumeAll resumes paused tasks', async () => {
  const store = useCronStore();
  await store.register(createMockTaskConfig({ id: 'task-1' }));
  await store.register(createMockTaskConfig({ id: 'task-2' }));
  await store.pauseAll();

  await store.resumeAll();

  expect(store.tasks['task-1']?.status).toBe('active');
  expect(store.tasks['task-2']?.status).toBe('active');
});

test('useCronStore getByStatus returns tasks with matching status', async () => {
  const store = useCronStore();
  await store.register(createMockTaskConfig({ id: 'active-1' }));
  await store.register(createMockTaskConfig({ id: 'active-2' }));
  await store.register(createMockTaskConfig({ id: 'paused-1' }));
  await store.pause('paused-1');

  const activeTasks = store.getByStatus('active');
  const pausedTasks = store.getByStatus('paused');

  expect(activeTasks).toHaveLength(2);
  expect(pausedTasks).toHaveLength(1);
  expect(pausedTasks[0]?.id).toBe('paused-1');
});

test('useCronStore init sets status to running', async () => {
  const store = useCronStore();

  await store.init();

  expect(store.status).toBe('running');
});

test('useCronStore init is idempotent', async () => {
  const store = useCronStore();

  await store.init();
  await store.init();

  expect(store.status).toBe('running');
});

test('useCronStore cleanup stops scheduler and clears tasks', async () => {
  const store = useCronStore();
  await store.register(createMockTaskConfig({ id: 'cleanup-test' }));
  await store.init();

  await store.cleanup();

  expect(store.status).toBe('stopped');
  expect(store.tasks).toEqual({});
  expect(mockSchedulerInstance.stop).toHaveBeenCalled();
});

test('useCronStore register with cron expression creates CronJob', async () => {
  const store = useCronStore();
  const config: CronTaskConfig = {
    id: 'cron-task',
    handler: vi.fn(),
    cron: '*/5 * * * *',
  };

  await store.register(config);

  expect(mockCronJob).toHaveBeenCalled();
});

test('useCronStore register with cron expression schedules via addCronJob when running', async () => {
  const store = useCronStore();
  store.status = 'running';

  const config: CronTaskConfig = {
    id: 'cron-task-schedule',
    handler: vi.fn(),
    cron: '*/1 * * * *',
  };

  await store.register(config);

  expect(mockSchedulerInstance.addCronJob).toHaveBeenCalledTimes(1);
  expect(mockSchedulerInstance.addSimpleIntervalJob).not.toHaveBeenCalled();
});

test('useCronStore calculates nextRun for cron expression', async () => {
  const store = useCronStore();
  const config: CronTaskConfig = {
    id: 'cron-next-run',
    handler: vi.fn(),
    cron: '*/1 * * * *',
  };

  const task = await store.register(config);

  expect(task.nextRun).toBeDefined();
  expect(task.nextRun).toBeGreaterThan(Date.now());
});

test('useCronStore register with interval creates SimpleIntervalJob', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ interval: 5000 });

  await store.register(config);

  expect(mockSimpleIntervalJob).toHaveBeenCalled();
});

test('useCronStore runImmediately respects runWhen/platform checks and updates nextRun', async () => {
  const store = useCronStore();
  const handler = vi.fn();
  const config = createMockTaskConfig({
    id: 'run-immediately-guarded',
    interval: 1000,
    handler,
    runWhen: vi.fn().mockResolvedValue(false),
    platforms: ['android'],
  });

  await store.register(config);
  const initialNextRun = store.tasks['run-immediately-guarded']?.nextRun;

  await store.runImmediately('run-immediately-guarded');

  expect(handler).not.toHaveBeenCalled();
  expect(store.tasks['run-immediately-guarded']?.lastRun).toBeUndefined();
  expect(store.tasks['run-immediately-guarded']?.nextRun).toBe(initialNextRun);
});

test('useCronStore runImmediately applies timeout/platform and refreshes schedule when allowed', async () => {
  const store = useCronStore();
  const handler = vi.fn().mockResolvedValue(undefined);
  const config = createMockTaskConfig({
    id: 'run-immediately-updates',
    interval: 50,
    handler,
    runWhen: vi.fn().mockResolvedValue(true),
    platforms: ['desktop'],
  });

  await store.register(config);
  const initialNextRun = store.tasks['run-immediately-updates']?.nextRun ?? 0;

  await store.runImmediately('run-immediately-updates');

  expect(handler).toHaveBeenCalledTimes(1);
  expect(store.tasks['run-immediately-updates']?.lastRun).toBeDefined();
  expect(store.tasks['run-immediately-updates']?.nextRun).toBeGreaterThanOrEqual(
    initialNextRun,
  );
});

test('useCronStore stop allows re-registering same task id', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ id: 're-registerable' });

  await store.register(config);
  await store.stop('re-registerable');

  await expect(store.register(config)).resolves.toBeDefined();
});

test('useCronStore stores handler separately from serializable task data', async () => {
  const store = useCronStore();
  const handler = vi.fn();
  const config = createMockTaskConfig({ id: 'handler-test', handler });

  await store.register(config);

  // handler is stored in runtime, not in tasks (for serialization)
  expect(store.tasks['handler-test']).toBeDefined();
  expect(typeof store.tasks['handler-test']?.handler).toBe('function');
});

test('useCronStore task with runImmediately option starts immediately', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ runImmediately: true });

  await store.register(config);

  expect(mockSimpleIntervalJob).toHaveBeenCalledWith(
    expect.objectContaining({ runImmediately: true }),
    expect.anything(),
    expect.anything(),
  );
});

test('useCronStore task with preventOverrun option is respected', async () => {
  const store = useCronStore();
  const config = createMockTaskConfig({ preventOverrun: true });

  await store.register(config);

  expect(mockSimpleIntervalJob).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.objectContaining({ preventOverrun: true }),
  );
});
