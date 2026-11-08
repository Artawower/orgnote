import { setActivePinia, createPinia } from 'pinia';
import { test, expect, beforeEach, vi, type Mock } from 'vitest';
import { toRaw } from 'vue';
import type { ProcessCallback, QueueProcessTask } from 'orgnote-api';
import { QueueIdleTimeoutError } from 'src/infrastructure/queue/wait-for-queue-drain';

interface MockQueue {
  push: Mock;
  pause: Mock;
  resume: Mock;
  cancel: Mock;
  destroy: Mock;
  getStats: Mock;
  on: Mock;
  removeAllListeners: Mock;
  removeListener: Mock;
  length: number;
  _running: number;
}

const { createMockQueue, createQueuedTicket, mockQueueConstructor, mockQueueRepository, mockLogger } = vi.hoisted(
  () => {
    const createQueuedTicket = () => {
      const listeners = new Map<string, () => void>();
      const ticket = {
        once: vi.fn((event: string, listener: () => void) => {
          listeners.set(event, listener);
          return ticket;
        }),
        removeListener: vi.fn((event: string) => listeners.delete(event)),
      };
      queueMicrotask(() => listeners.get('queued')?.());
      return ticket;
    };
    const createMockQueue = (): MockQueue => ({
      push: vi.fn(() => createQueuedTicket()),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn((_id: string, cb: () => void) => cb()),
      destroy: vi.fn((cb: () => void) => cb()),
      getStats: vi.fn(() => ({
        total: 10,
        average: 100,
        successRate: 0.95,
        peak: 5,
      })),
      on: vi.fn(),
      removeAllListeners: vi.fn(),
      removeListener: vi.fn(),
      length: 0,
      _running: 0,
    });

    const mockQueueConstructor = vi.fn(() => createMockQueue());

    const mockQueueRepository = {
      add: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(),
      delete: vi.fn(),
      lock: vi.fn(),
      release: vi.fn(),
      takeFirstN: vi.fn(),
      getLock: vi.fn(),
      getRunningTasks: vi.fn(),
      clear: vi.fn(),
      update: vi.fn(),
    };

    const mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };

    return {
      createMockQueue,
      createQueuedTicket,
      mockQueueConstructor,
      mockQueueRepository,
      mockLogger,
    };
  },
);

vi.mock('better-queue', () => ({
  default: mockQueueConstructor,
}));

vi.mock('src/boot/repositories', () => ({
  repositories: {
    get queueRepository() {
      return mockQueueRepository;
    },
  },
}));

vi.mock('src/infrastructure/queue/better-queue-persistence-store', () => ({
  BetterQueuePersistenceStore: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('src/boot/logger', () => ({
  logger: mockLogger,
}));

import { useQueueStore } from './queue';
import type { QueueTask } from 'orgnote-api';

const createMockTask = (overrides: Partial<QueueTask> = {}): QueueTask => ({
  id: 'task-1',
  payload: { data: 'test' },
  queueId: 'test-queue',
  added: Date.now(),
  ...overrides,
});

beforeEach(() => {
  mockQueueRepository.add.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.get.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.getAll.mockReset().mockResolvedValue([]);
  mockQueueRepository.delete.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.lock.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.release.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.takeFirstN.mockReset().mockResolvedValue('lock-123');
  mockQueueRepository.getLock.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.getRunningTasks.mockReset().mockResolvedValue({});
  mockQueueRepository.clear.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.update.mockReset().mockResolvedValue(undefined);
  mockLogger.debug.mockReset();
  mockLogger.error.mockReset();
  mockLogger.warn.mockReset();

  mockQueueConstructor.mockClear();
  mockQueueConstructor.mockImplementation(() => createMockQueue());

  const pinia = createPinia();
  setActivePinia(pinia);
});

test('useQueueStore queueIds starts empty', () => {
  const store = useQueueStore();
  expect(store.queueIds).toEqual([]);
});

test('useQueueStore register creates new queue and adds queueId', () => {
  const store = useQueueStore();
  const queue = store.register('test-queue');

  expect(queue).toBeDefined();
  expect(store.queueIds).toContain('test-queue');
});

test('useQueueStore register returns existing queue on duplicate registration', () => {
  const store = useQueueStore();
  const queue1 = store.register('test-queue');
  const queue2 = store.register('test-queue');

  expect(toRaw(queue1)).toBe(toRaw(queue2));
  expect(store.queueIds.filter((id) => id === 'test-queue').length).toBe(1);
});

test('useQueueStore task finish handler does not leak rejected status updates', async () => {
  const updateError = new Error('DatabaseClosedError');
  let taskFinishHandler: ((taskId: string) => unknown) | undefined;

  mockQueueRepository.update.mockRejectedValue(updateError);
  mockQueueConstructor.mockImplementation(() => {
    const queue = createMockQueue();
    queue.on = vi.fn((event: string, handler: (taskId: string) => unknown) => {
      if (event === 'task_finish') {
        taskFinishHandler = handler;
      }
    });
    return queue;
  });

  const store = useQueueStore();
  store.register('test-queue');

  const result = taskFinishHandler?.('task-1');
  if (result instanceof Promise) void result.catch(() => undefined);
  await Promise.resolve();

  expect(result).toBeUndefined();
  expect(mockLogger.error).toHaveBeenCalledWith('Failed to update queue task status', {
    error: updateError,
    status: 'completed',
    taskId: 'task-1',
  });
});

test('useQueueStore idle wait includes pending task status updates', async () => {
  const statusUpdate = Promise.withResolvers<void>();
  let taskFinishHandler: ((taskId: string) => void) | undefined;
  mockQueueRepository.update.mockImplementation(() => statusUpdate.promise);
  mockQueueConstructor.mockImplementation(() => {
    const queue = createMockQueue();
    queue.on = vi.fn((event: string, handler: (taskId: string) => void) => {
      if (event === 'task_finish') taskFinishHandler = handler;
    });
    return queue;
  });
  const store = useQueueStore();
  store.register('test-queue');
  taskFinishHandler?.('task-1');
  let isResolved = false;

  const waiting = store.runAndWaitForIdle('test-queue', async () => {});
  void waiting.then(() => {
    isResolved = true;
  });
  await Promise.resolve();
  await Promise.resolve();

  expect(isResolved).toBe(false);

  statusUpdate.resolve();

  await waiting;
});

test('useQueueStore getQueue returns undefined for unregistered queue', () => {
  const store = useQueueStore();
  const queue = store.getQueue('non-existent');

  expect(queue).toBeUndefined();
});

test('useQueueStore getQueue returns queue after registration', () => {
  const store = useQueueStore();
  store.register('test-queue');
  const queue = store.getQueue('test-queue');

  expect(queue).toBeDefined();
});

test('useQueueStore add returns task id', async () => {
  const store = useQueueStore();
  const taskId = await store.add('test-queue', { data: 'test' });

  expect(taskId).toBeDefined();
  expect(typeof taskId).toBe('string');
  expect(taskId.length).toBeGreaterThan(0);
});

test('useQueueStore add resolves only after task is queued', async () => {
  let emitQueued: (() => void) | undefined;
  const ticket = {
    once: vi.fn((event: string, listener: () => void) => {
      if (event === 'queued') emitQueued = listener;
      return ticket;
    }),
    removeListener: vi.fn(),
  };
  const push = vi.fn(() => ticket);
  mockQueueConstructor.mockImplementation(() => ({
    ...createMockQueue(),
    push,
  }));
  const store = useQueueStore();
  let isResolved = false;

  const taskId = store.add('test-queue', { data: 'test' });
  void taskId.then(() => {
    isResolved = true;
  });
  await vi.waitFor(() => expect(push).toHaveBeenCalledOnce());
  await Promise.resolve();

  expect(isResolved).toBe(false);
  expect(emitQueued).toBeTypeOf('function');

  emitQueued?.();

  await expect(taskId).resolves.toBeTypeOf('string');
});

test('useQueueStore add creates queue if not exists', async () => {
  const store = useQueueStore();
  expect(store.queueIds).not.toContain('test-queue');

  await store.add('test-queue', { data: 'test' });

  expect(store.queueIds).toContain('test-queue');
});

test('useQueueStore add uses specified queueId', async () => {
  const store = useQueueStore();

  await store.add('custom-queue', { data: 'test' });

  expect(store.queueIds).toContain('custom-queue');
});

test('useQueueStore skip deduplication keeps the existing task', async () => {
  mockQueueRepository.get.mockResolvedValue(createMockTask());
  const store = useQueueStore();
  store.register('test-queue', { deduplicationStrategy: 'skip' });
  const queue = store.getQueue('test-queue') as MockQueue | undefined;

  const taskId = await store.add('test-queue', { data: 'replacement' }, { id: 'task-1' });

  expect(taskId).toBe('task-1');
  expect(queue?.push).not.toHaveBeenCalled();
});

test('useQueueStore replace deduplication deletes and enqueues the task', async () => {
  mockQueueRepository.get.mockResolvedValue(createMockTask());
  const store = useQueueStore();
  store.register('test-queue', { deduplicationStrategy: 'replace' });
  const queue = store.getQueue('test-queue') as MockQueue | undefined;

  const taskId = await store.add('test-queue', { data: 'replacement' }, { id: 'task-1' });

  expect(taskId).toBe('task-1');
  expect(mockQueueRepository.delete).toHaveBeenCalledWith('task-1', true);
  expect(queue?.push).toHaveBeenCalledWith({ id: 'task-1', payload: { data: 'replacement' } });
});

test('useQueueStore moveToEnd deduplication reprioritizes the existing task', async () => {
  mockQueueRepository.get.mockResolvedValue(createMockTask());
  const store = useQueueStore();
  store.register('test-queue', { deduplicationStrategy: 'moveToEnd' });
  const queue = store.getQueue('test-queue') as MockQueue | undefined;

  const taskId = await store.add('test-queue', { data: 'replacement' }, { id: 'task-1' });

  expect(taskId).toBe('task-1');
  expect(mockQueueRepository.update).toHaveBeenCalledWith('task-1', {
    priority: expect.any(Number),
    added: expect.any(Number),
  });
  const update = mockQueueRepository.update.mock.calls[0]?.[1];
  expect(update?.priority).toBe(update?.added);
  expect(queue?.push).not.toHaveBeenCalled();
});

test('useQueueStore get delegates to repository', async () => {
  const store = useQueueStore();
  const mockTask = createMockTask();
  mockQueueRepository.get.mockResolvedValue(mockTask);

  const task = await store.get('task-1');

  expect(mockQueueRepository.get).toHaveBeenCalledWith('task-1');
  expect(task).toEqual(mockTask);
});

test('useQueueStore get returns undefined when task not found', async () => {
  const store = useQueueStore();
  mockQueueRepository.get.mockResolvedValue(undefined);

  const task = await store.get('non-existent');

  expect(task).toBeUndefined();
});

test('useQueueStore getAll delegates to repository with queueId', async () => {
  const store = useQueueStore();
  const mockTasks = [createMockTask({ id: 'task-1' }), createMockTask({ id: 'task-2' })];
  mockQueueRepository.getAll.mockResolvedValue(mockTasks);

  const tasks = await store.getAll('test-queue');

  expect(mockQueueRepository.getAll).toHaveBeenCalledWith('test-queue');
  expect(tasks).toEqual(mockTasks);
});

test('useQueueStore remove cancels task in queue', async () => {
  const store = useQueueStore();
  store.register('test-queue');

  await store.remove('test-queue', 'task-1');

  const queue = store.getQueue('test-queue') as MockQueue | undefined;
  expect(queue?.cancel).toHaveBeenCalled();
});

test('useQueueStore pause pauses the queue', () => {
  const store = useQueueStore();
  store.register('test-queue');

  store.pause('test-queue');

  const queue = store.getQueue('test-queue') as MockQueue | undefined;
  expect(queue?.pause).toHaveBeenCalled();
});

test('useQueueStore resume resumes the queue', () => {
  const store = useQueueStore();
  store.register('test-queue');

  store.resume('test-queue');

  const queue = store.getQueue('test-queue') as MockQueue | undefined;
  expect(queue?.resume).toHaveBeenCalled();
});

test('useQueueStore destroy removes queue from store', () => {
  const store = useQueueStore();
  store.register('test-queue');
  expect(store.queueIds).toContain('test-queue');

  store.destroy('test-queue');

  expect(store.queueIds).not.toContain('test-queue');
  expect(store.getQueue('test-queue')).toBeUndefined();
});

test('useQueueStore destroy does nothing for non-existent queue', () => {
  const store = useQueueStore();

  expect(() => store.destroy('non-existent')).not.toThrow();
});

test('useQueueStore unregister is alias for destroy', () => {
  const store = useQueueStore();
  store.register('test-queue');

  store.unregister('test-queue');

  expect(store.getQueue('test-queue')).toBeUndefined();
});

test('useQueueStore clear clears repository tasks for queueId', async () => {
  const store = useQueueStore();
  store.register('test-queue');

  await store.clear('test-queue');

  expect(mockQueueRepository.clear).toHaveBeenCalledWith('test-queue');
});

test('useQueueStore clear pauses and resumes queue during clearing', async () => {
  const store = useQueueStore();
  store.register('test-queue');
  const queue = store.getQueue('test-queue') as MockQueue | undefined;

  await store.clear('test-queue');

  expect(queue?.pause).toHaveBeenCalled();
  expect(queue?.resume).toHaveBeenCalled();
});

test('useQueueStore clear aborts active idle waiters', async () => {
  const store = useQueueStore();
  store.register('test-queue');
  const queue = store.getQueue('test-queue');
  if (!queue) throw new TypeError('Expected registered queue');
  Object.assign(queue, { length: 1 });
  mockQueueRepository.getAll.mockResolvedValue([
    createMockTask({ queueId: 'test-queue', status: 'processing' }),
  ]);

  const waiting = store.runAndWaitForIdle('test-queue', async () => {});
  await vi.waitFor(() => expect(mockQueueRepository.getAll).toHaveBeenCalled());
  const clearing = store.clear('test-queue');

  await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
  await clearing;

  Object.assign(queue, { length: 0 });
  mockQueueRepository.getAll.mockResolvedValue([]);
  await expect(store.runAndWaitForIdle('test-queue', async () => {})).resolves.toBeUndefined();
});

test('useQueueStore clears a queue after idle timeout', async () => {
  const store = useQueueStore();
  store.register('test-queue');
  const queue = store.getQueue('test-queue');
  if (!queue) throw new TypeError('Expected registered queue');
  Object.assign(queue, { length: 1 });
  mockQueueRepository.getAll.mockResolvedValue([
    createMockTask({ queueId: 'test-queue', status: 'processing' }),
  ]);

  const waiting = store.runAndWaitForIdle('test-queue', async () => {}, { timeoutMs: 5 });

  await expect(waiting).rejects.toBeInstanceOf(QueueIdleTimeoutError);
  expect(mockQueueRepository.clear).toHaveBeenCalledWith('test-queue');
});

test('useQueueStore getStats returns queue statistics', async () => {
  const store = useQueueStore();
  store.register('test-queue');

  const stats = await store.getStats('test-queue');

  expect(stats).toEqual({
    total: 10,
    average: 100,
    successRate: 0.95,
    peak: 5,
  });
});

test('useQueueStore getStats creates queue if not exists', async () => {
  const store = useQueueStore();
  expect(store.queueIds).not.toContain('new-queue');

  await store.getStats('new-queue');

  expect(store.queueIds).toContain('new-queue');
});

test('useQueueStore multiple queues are independent', () => {
  const store = useQueueStore();

  store.register('queue-1');
  store.register('queue-2');

  expect(store.queueIds).toContain('queue-1');
  expect(store.queueIds).toContain('queue-2');
  expect(store.getQueue('queue-1')).not.toBe(store.getQueue('queue-2'));

  store.destroy('queue-1');

  expect(store.queueIds).not.toContain('queue-1');
  expect(store.queueIds).toContain('queue-2');
});

test('useQueueStore destroy aborts active idle waiters', async () => {
  const store = useQueueStore();
  store.register('test-queue');
  const queue = store.getQueue('test-queue');
  if (!queue) throw new TypeError('Expected registered queue');
  Object.assign(queue, { length: 1 });
  mockQueueRepository.getAll.mockResolvedValue([
    createMockTask({ queueId: 'test-queue', status: 'processing' }),
  ]);

  const waiting = store.runAndWaitForIdle('test-queue', async () => {});
  await vi.waitFor(() => expect(mockQueueRepository.getAll).toHaveBeenCalled());
  store.destroy('test-queue');

  await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
  store.register('test-queue');
  await expect(store.runAndWaitForIdle('test-queue', async () => {})).resolves.toBeUndefined();
});

test('useQueueStore destroy removes event listeners to prevent memory leak', () => {
  const store = useQueueStore();
  store.register('test-queue');

  const queue = store.getQueue('test-queue') as MockQueue | undefined;

  store.destroy('test-queue');

  expect(queue?.removeAllListeners).toHaveBeenCalled();
});

test('useQueueStore executeBatchTasks returns empty array for empty data', async () => {
  const store = useQueueStore();

  const result = await store.executeBatchTasks({ process: vi.fn() }, []);

  expect(result).toEqual([]);
});

test('useQueueStore executeBatchTasks returns empty array for non-array data', async () => {
  const store = useQueueStore();

  const result = await store.executeBatchTasks({ process: vi.fn() }, null as unknown as unknown[]);

  expect(result).toEqual([]);
});

test('useQueueStore executeBatchTasks rejects when process function is missing', async () => {
  const store = useQueueStore();

  await expect(store.executeBatchTasks({}, ['item1'])).rejects.toThrow(
    'process function is required in options',
  );
});

test('useQueueStore executeBatchTasks processes all items and returns results', async () => {
  const store = useQueueStore();
  const processedItems: unknown[] = [];

  let taskFinishHandler: ((taskId: string, result: unknown) => void) | undefined;

  mockQueueConstructor.mockImplementation(() => {
    const queue = createMockQueue();
    queue.on = vi.fn((event: string, handler: (taskId: string, result: unknown) => void) => {
      if (event === 'task_finish') {
        taskFinishHandler = handler;
      }
    });
    queue.push = vi.fn((task: { id: string; payload: unknown }) => {
      processedItems.push(task.payload);
      setTimeout(() => {
        taskFinishHandler?.(task.id, `processed-${task.payload}`);
      }, 0);
      return createQueuedTicket();
    });
    return queue;
  });

  const result = await store.executeBatchTasks<string, string>(
    {
      process: (task: QueueProcessTask<string>, cb: ProcessCallback<string>) => {
        cb(undefined, `processed-${task.payload}`);
      },
    },
    ['item1', 'item2', 'item3'],
  );

  expect(processedItems).toEqual(['item1', 'item2', 'item3']);
  expect(mockQueueRepository.get).not.toHaveBeenCalled();
  expect(result).toHaveLength(3);
  expect(result).toContain('processed-item1');
  expect(result).toContain('processed-item2');
  expect(result).toContain('processed-item3');
});

test('useQueueStore executeBatchTasks rejects on task failure', async () => {
  const store = useQueueStore();
  const testError = new Error('Task failed');

  let taskFailedHandler: ((taskId: string, err: unknown) => void) | undefined;

  mockQueueConstructor.mockImplementation(() => {
    const queue = createMockQueue();
    queue.on = vi.fn((event: string, handler: (taskId: string, err: unknown) => void) => {
      if (event === 'task_failed') {
        taskFailedHandler = handler;
      }
    });
    queue.push = vi.fn((task: { id: string }) => {
      setTimeout(() => {
        taskFailedHandler?.(task.id, testError);
      }, 0);
      return createQueuedTicket();
    });
    return queue;
  });

  await expect(
    store.executeBatchTasks(
      {
        process: (_task: unknown, cb: (err?: unknown) => void) => {
          cb(testError);
        },
      },
      ['item1'],
    ),
  ).rejects.toThrow('Task failed');

  expect(mockQueueRepository.clear).toHaveBeenCalledTimes(1);
  const failedQueueId = mockQueueRepository.clear.mock.calls[0]?.[0];
  expect(failedQueueId).toMatch(/^batch-/);
});

test('useQueueStore executeBatchTasks cleans up queue after completion', async () => {
  const store = useQueueStore();

  let taskFinishHandler: ((taskId: string, result: unknown) => void) | undefined;
  const mockQueue = createMockQueue();

  mockQueueConstructor.mockImplementation(() => {
    mockQueue.on = vi.fn((event: string, handler: (taskId: string, result: unknown) => void) => {
      if (event === 'task_finish') {
        taskFinishHandler = handler;
      }
    });
    mockQueue.push = vi.fn((task: { id: string }) => {
      setTimeout(() => {
        taskFinishHandler?.(task.id, 'result');
      }, 0);
      return createQueuedTicket();
    });
    return mockQueue;
  });

  await store.executeBatchTasks(
    {
      process: (_task: unknown, cb: (err?: unknown, result?: unknown) => void) => {
        cb(undefined, 'result');
      },
    },
    ['item1'],
  );

  expect(mockQueue.pause).toHaveBeenCalled();
  expect(mockQueue.removeListener).toHaveBeenCalledWith('task_finish', taskFinishHandler);
  expect(mockQueue.removeListener).toHaveBeenCalledWith('task_failed', expect.any(Function));
  expect(mockQueue.removeAllListeners).toHaveBeenCalled();
  expect(mockQueueRepository.clear).toHaveBeenCalledTimes(1);
  const clearedQueueId = mockQueueRepository.clear.mock.calls[0]?.[0];
  expect(clearedQueueId).toMatch(/^batch-/);
});

test('useQueueStore executeBatchTasks passes concurrent option to queue', async () => {
  const store = useQueueStore();

  let taskFinishHandler: ((taskId: string, result: unknown) => void) | undefined;

  mockQueueConstructor.mockImplementation(() => {
    const queue = createMockQueue();
    queue.on = vi.fn((event: string, handler: (taskId: string, result: unknown) => void) => {
      if (event === 'task_finish') {
        taskFinishHandler = handler;
      }
    });
    queue.push = vi.fn((task: { id: string }) => {
      setTimeout(() => {
        taskFinishHandler?.(task.id, 'result');
      }, 0);
      return createQueuedTicket();
    });
    return queue;
  });

  await store.executeBatchTasks(
    {
      concurrent: 5,
      process: (_task: unknown, cb: (err?: unknown, result?: unknown) => void) => {
        cb(undefined, 'result');
      },
    },
    ['item1'],
  );

  expect(mockQueueConstructor).toHaveBeenCalledWith(
    expect.any(Function),
    expect.objectContaining({ concurrent: 5 }),
  );
});

test('useQueueStore executeBatchTasks wraps items with id and payload', async () => {
  const store = useQueueStore();
  const pushedTasks: unknown[] = [];

  let taskFinishHandler: ((taskId: string, result: unknown) => void) | undefined;

  mockQueueConstructor.mockImplementation(() => {
    const queue = createMockQueue();
    queue.on = vi.fn((event: string, handler: (taskId: string, result: unknown) => void) => {
      if (event === 'task_finish') {
        taskFinishHandler = handler;
      }
    });
    queue.push = vi.fn((task: unknown) => {
      pushedTasks.push(task);
      const typedTask = task as { id: string };
      setTimeout(() => {
        taskFinishHandler?.(typedTask.id, 'result');
      }, 0);
      return createQueuedTicket();
    });
    return queue;
  });

  await store.executeBatchTasks(
    {
      process: (_task: unknown, cb: (err?: unknown, result?: unknown) => void) => {
        cb(undefined, 'result');
      },
    },
    ['item1', 'item2'],
  );

  expect(pushedTasks).toHaveLength(2);
  expect(pushedTasks[0]).toMatchObject({ payload: 'item1' });
  expect(pushedTasks[1]).toMatchObject({ payload: 'item2' });
  expect((pushedTasks[0] as { id: string }).id).toBeDefined();
  expect((pushedTasks[1] as { id: string }).id).toBeDefined();
});
