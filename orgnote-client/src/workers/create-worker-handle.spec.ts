import { expect, test, vi } from 'vitest';
import type {
  OrgNoteCoreApi,
  OrgNoteFileEncoding,
  OrgNoteWorkerContract,
  OrgNoteWorkerDefinition,
  WorkerProcedure,
} from 'orgnote-api';
import { createWorkerTestChannel } from '../../test/worker-test-channel';
import { createWorkerHandle } from './create-worker-handle';
import { attachWorkerRuntime } from './start-worker-runtime';

interface TestWorkerContract extends OrgNoteWorkerContract {
  methods: {
    sum: WorkerProcedure<{ left: number; right: number }, number>;
    readFile: WorkerProcedure<{ path: string }, string | undefined>;
    wait: WorkerProcedure<undefined, boolean>;
    fail: WorkerProcedure<undefined, never>;
    failUndefined: WorkerProcedure<undefined, never>;
    echoBinary: WorkerProcedure<Uint8Array, { payload: Uint8Array }>;
  };
  events: {
    progress: { completed: number };
  };
}

const waitStarted = vi.fn();
const observedAbort = vi.fn();

const definition: OrgNoteWorkerDefinition<TestWorkerContract> = {
  methods: {
    sum: ({ left, right }, context) => {
      context.emit('progress', { completed: 1 });
      return left + right;
    },
    readFile: async ({ path }, context) => {
      context.api.logger.info('Reading from worker', { path });
      return await context.api.files.readFile(path);
    },
    wait: async (_input, context) => {
      waitStarted();
      await new Promise<void>((resolve) => {
        context.signal.addEventListener('abort', () => {
          observedAbort();
          resolve();
        }, { once: true });
      });
      return true;
    },
    fail: () => {
      throw new TypeError('Worker method failed');
    },
    failUndefined: () => Promise.reject(undefined),
    echoBinary: (input) => ({ payload: input }),
  },
};

const coreReadFile = vi.fn(async (path: unknown) => {
  void path;
  return 'worker content';
});
const coreLogInfo = vi.fn();

const createCoreApi = (): OrgNoteCoreApi => ({
  files: {
    readFile: async <TEncoding extends OrgNoteFileEncoding = 'utf8'>(path: unknown) =>
      await coreReadFile(path) as
        (TEncoding extends 'utf8' ? string : Uint8Array) | undefined,
    writeFile: vi.fn(async () => undefined),
    readDir: vi.fn(async () => []),
    fileInfo: vi.fn(async () => undefined),
  },
  logger: {
    info: coreLogInfo,
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
});

const setupWorker = () => {
  const channel = createWorkerTestChannel();
  const detachRuntime = attachWorkerRuntime(definition, channel.worker);
  const handle = createWorkerHandle<TestWorkerContract>(channel.host, createCoreApi());
  return { channel, detachRuntime, handle };
};

test('worker handle calls typed methods and receives events', async () => {
  const { handle, detachRuntime } = setupWorker();
  const listener = vi.fn();
  handle.on('progress', listener);

  await expect(handle.call('sum', { left: 2, right: 3 })).resolves.toBe(5);
  expect(listener).toHaveBeenCalledWith({ completed: 1 });

  handle.dispose();
  detachRuntime();
});

test('worker runtime proxies Core API calls to the host', async () => {
  const { handle, detachRuntime } = setupWorker();

  await expect(handle.call('readFile', { path: '/notes/a.org' })).resolves.toBe(
    'worker content',
  );
  expect(coreReadFile).toHaveBeenCalledWith('/notes/a.org');
  expect(coreLogInfo).toHaveBeenCalledWith('Reading from worker', {
    path: '/notes/a.org',
  });

  handle.dispose();
  detachRuntime();
});

test('worker runtime preserves remote error details', async () => {
  const { handle, detachRuntime } = setupWorker();

  await expect(handle.call('fail', undefined)).rejects.toMatchObject({
    name: 'TypeError',
    message: 'Worker method failed',
  });

  handle.dispose();
  detachRuntime();
});

test('worker runtime preserves undefined rejection as a failure', async () => {
  const { handle, detachRuntime } = setupWorker();

  await expect(handle.call('failUndefined', undefined)).rejects.toMatchObject({
    name: 'Error',
    message: 'undefined',
  });

  handle.dispose();
  detachRuntime();
});

test('worker calls can be cancelled with AbortSignal', async () => {
  const { handle, detachRuntime } = setupWorker();
  const controller = new AbortController();
  const result = handle.call('wait', undefined, { signal: controller.signal });

  await vi.waitFor(() => expect(waitStarted).toHaveBeenCalledOnce());
  controller.abort();

  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(observedAbort).toHaveBeenCalledOnce());

  handle.dispose();
  detachRuntime();
});

test('disposing a handle rejects pending calls and terminates its worker', async () => {
  const { channel, handle, detachRuntime } = setupWorker();
  const result = handle.call('wait', undefined);

  handle.dispose();

  await expect(result).rejects.toMatchObject({ name: 'WorkerDisposedError' });
  expect(channel.isTerminated()).toBe(true);
  detachRuntime();
});

test('worker calls forward transferable binary buffers', async () => {
  const { channel, handle, detachRuntime } = setupWorker();
  const input = new Uint8Array([1, 2, 3]);

  await expect(
    handle.call('echoBinary', input, { transfer: [input.buffer] }),
  ).resolves.toEqual({ payload: input });
  expect(channel.hostTransfers.flat()).toContain(input.buffer);
  expect(channel.workerTransfers.flat()).toContain(input.buffer);

  handle.dispose();
  detachRuntime();
});
