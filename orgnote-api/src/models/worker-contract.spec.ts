import { expect, expectTypeOf, test } from 'vitest';
import type { OrgNoteCoreApi } from '../api';
import type {
  OrgNoteWorkerContract,
  OrgNoteWorkerDefinition,
  OrgNoteWorkerHandle,
  WorkerInput,
  WorkerOutput,
  WorkerProcedure,
} from './worker-contract';

interface IndexWorkerContract extends OrgNoteWorkerContract {
  methods: {
    indexDirectory: WorkerProcedure<
      { rootPath: string },
      { indexedFiles: number }
    >;
  };
  events: {
    progress: {
      completed: number;
      total: number;
    };
  };
}

const definition: OrgNoteWorkerDefinition<IndexWorkerContract> = {
  methods: {
    indexDirectory: async ({ rootPath }, context) => {
      expectTypeOf(context.api).toEqualTypeOf<OrgNoteCoreApi>();
      context.emit('progress', { completed: 0, total: 1 });
      return { indexedFiles: rootPath.length };
    },
  },
};

const callIndexWorker = (
  handle: OrgNoteWorkerHandle<IndexWorkerContract>,
) => handle.call('indexDirectory', { rootPath: '/' });

const subscribeToProgress = (
  handle: OrgNoteWorkerHandle<IndexWorkerContract>,
) => handle.on('progress', () => undefined);

test('worker contract preserves method input and output types', () => {
  expectTypeOf<
    WorkerInput<IndexWorkerContract, 'indexDirectory'>
  >().toEqualTypeOf<{ rootPath: string }>();
  expectTypeOf<
    WorkerOutput<IndexWorkerContract, 'indexDirectory'>
  >().toEqualTypeOf<{ indexedFiles: number }>();
});

test('worker handle exposes typed calls and events', () => {
  expectTypeOf(callIndexWorker).returns.toEqualTypeOf<
    Promise<{ indexedFiles: number }>
  >();
  expectTypeOf(subscribeToProgress).returns.toEqualTypeOf<() => void>();
});

test('worker definition exposes declared handlers', () => {
  expect(Object.keys(definition.methods)).toEqual(['indexDirectory']);
});
