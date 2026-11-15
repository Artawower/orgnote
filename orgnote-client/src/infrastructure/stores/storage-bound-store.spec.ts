import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref, type Ref } from 'vue';
import {
  clearStorageBoundRegistry,
  defineStorageBoundStore,
  resetStorageBoundStores,
  type StorageBoundParticipant,
} from './storage-bound-store';

beforeEach(() => {
  clearStorageBoundRegistry();
  setActivePinia(createPinia());
});

afterEach(() => {
  clearStorageBoundRegistry();
});

test('storageBoundStore enforces zero-argument void or Promise<void> $resetStorage contract at type level', () => {
  expectTypeOf<StorageBoundParticipant>().toHaveProperty('$resetStorage');
  expectTypeOf<StorageBoundParticipant['$resetStorage']>().toEqualTypeOf<
    () => void | Promise<void>
  >();
});

test('storageBoundStore keeps $resetStorage internal in public store definitions by default', () => {
  interface SampleStore {
    data: Ref<string>;
  }
  const useSampleStore = defineStorageBoundStore<'test-internal', SampleStore>(
    'test-internal',
    () => ({
      data: ref('value'),
      $resetStorage: () => {},
    }),
  );
  const store = useSampleStore();

  expectTypeOf(store).not.toHaveProperty('$resetStorage');
  expectTypeOf(store.data).toEqualTypeOf<string>();
  expect(store.data).toBe('value');
});

test('storageBoundStore registers store definition automatically upon declaration and invokes on reset', async () => {
  const resetSpy = vi.fn();
  interface RegStore {
    data: Ref<string>;
  }
  defineStorageBoundStore<'test-store-reg', RegStore>('test-store-reg', () => ({
    data: ref('initial'),
    $resetStorage: resetSpy,
  }));

  await resetStorageBoundStores();
  expect(resetSpy).toHaveBeenCalledTimes(1);
});

test('storageBoundStore deduplicates registration on duplicate module evaluation or HMR', async () => {
  const firstSpy = vi.fn();
  const secondSpy = vi.fn();
  interface DedupStore {
    version: Ref<number>;
  }

  defineStorageBoundStore<'test-dedup', DedupStore>('test-dedup', () => ({
    version: ref(1),
    $resetStorage: firstSpy,
  }));
  defineStorageBoundStore<'test-dedup', DedupStore>('test-dedup', () => ({
    version: ref(2),
    $resetStorage: secondSpy,
  }));

  await resetStorageBoundStores();

  expect(firstSpy).not.toHaveBeenCalled();
  expect(secondSpy).toHaveBeenCalledTimes(1);
});

test('storageBoundStore resets stores per-pinia instance without cross-instance leakage', async () => {
  const piniaA = createPinia();
  const piniaB = createPinia();
  interface IsolationStore {
    value: Ref<string>;
  }

  const useStore = defineStorageBoundStore<'test-isolation', IsolationStore>(
    'test-isolation',
    () => {
      const value = ref('initial');
      return {
        value,
        $resetStorage: () => {
          value.value = 'reset';
        },
      };
    },
  );

  const storeA = useStore(piniaA);
  const storeB = useStore(piniaB);
  storeA.value = 'modified-A';
  storeB.value = 'modified-B';

  await resetStorageBoundStores(piniaA);

  expect(storeA.value).toBe('reset');
  expect(storeB.value).toBe('modified-B');
});

test('storageBoundStore covers registered stores that have not yet been instantiated in current pinia', async () => {
  const pinia = createPinia();
  const resetSpy = vi.fn();
  interface UninstantiatedStore {
    initialized: Ref<boolean>;
  }

  defineStorageBoundStore<'test-uninstantiated', UninstantiatedStore>(
    'test-uninstantiated',
    () => {
      const initialized = ref(true);
      return {
        initialized,
        $resetStorage: resetSpy,
      };
    },
  );

  expect(pinia.state.value['test-uninstantiated']).toBeUndefined();

  await resetStorageBoundStores(pinia);

  expect(resetSpy).toHaveBeenCalledTimes(1);
  expect(pinia.state.value['test-uninstantiated']).toBeDefined();
});

test('storageBoundStore awaits async reset storage handlers before completion', async () => {
  let resolved = false;
  type AsyncStore = Record<string, unknown>;

  defineStorageBoundStore<'test-async', AsyncStore>('test-async', () => ({
    $resetStorage: async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      resolved = true;
    },
  }));

  await resetStorageBoundStores();

  expect(resolved).toBe(true);
});

test('storageBoundStore propagates reset rejection when a participant fails', async () => {
  type FailingStore = Record<string, unknown>;
  defineStorageBoundStore<'test-failing', FailingStore>('test-failing', () => ({
    $resetStorage: async () => {
      throw new Error('reset failed');
    },
  }));

  await expect(resetStorageBoundStores()).rejects.toThrow('reset failed');
});

test('storageBoundStore continues resetting after a synchronous participant failure', async () => {
  const remainingReset = vi.fn();
  type FailingStore = Record<string, unknown>;
  defineStorageBoundStore<'test-sync-failing', FailingStore>('test-sync-failing', () => ({
    $resetStorage: () => {
      throw new Error('synchronous reset failed');
    },
  }));
  defineStorageBoundStore<'test-after-failure', FailingStore>('test-after-failure', () => ({
    $resetStorage: remainingReset,
  }));

  await expect(resetStorageBoundStores()).rejects.toThrow('synchronous reset failed');
  expect(remainingReset).toHaveBeenCalledOnce();
});
