import { expect, test } from 'vitest';
import type {
  OrgNoteWorkerContract,
  OrgNoteWorkerDefinition,
  WorkerProcedure,
} from 'orgnote-api';
import { createWorkerTestChannel } from '../../test/worker-test-channel';
import { attachWorkerRuntime } from 'src/workers/start-worker-runtime';
import { registerHostWorker } from 'src/workers/worker-registry';
import { useWorkerStore } from './worker';

interface EchoWorkerContract extends OrgNoteWorkerContract {
  methods: {
    echo: WorkerProcedure<string, string>;
  };
  events: Record<string, never>;
}

const definition: OrgNoteWorkerDefinition<EchoWorkerContract> = {
  methods: {
    echo: (input) => input,
  },
};

test('worker store spawns a registered host worker', async () => {
  const channel = createWorkerTestChannel();
  const detachRuntime = attachWorkerRuntime(definition, channel.worker);
  const unregister = registerHostWorker('echo', async () => channel.host);

  const handle = await useWorkerStore().spawn<EchoWorkerContract>('echo');

  await expect(handle.call('echo', 'hello')).resolves.toBe('hello');

  handle.dispose();
  unregister();
  detachRuntime();
});

test('unregistering a worker disposes its active handles', async () => {
  const channel = createWorkerTestChannel();
  const detachRuntime = attachWorkerRuntime(definition, channel.worker);
  const unregister = registerHostWorker('managed', () => channel.host);
  const handle = await useWorkerStore().spawn<EchoWorkerContract>('managed');

  unregister();

  expect(channel.isTerminated()).toBe(true);
  await expect(handle.call('echo', 'hello')).rejects.toMatchObject({
    name: 'WorkerDisposedError',
  });
  detachRuntime();
});

test('worker store rejects unknown worker ids', async () => {
  await expect(useWorkerStore().spawn('missing')).rejects.toMatchObject({
    name: 'WorkerNotRegisteredError',
  });
});

test('host worker ids cannot be registered twice', () => {
  const channel = createWorkerTestChannel();
  const unregister = registerHostWorker('duplicate', () => channel.host);

  expect(() => registerHostWorker('duplicate', () => channel.host)).toThrow(
    'Worker is already registered: duplicate',
  );

  unregister();
});
