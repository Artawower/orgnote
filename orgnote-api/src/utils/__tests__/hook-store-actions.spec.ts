import { createPinia, defineStore, setActivePinia } from 'pinia';
import { beforeEach, expect, expectTypeOf, test, vi } from 'vitest';
import { hookStoreActions } from '../hook-store-actions';

class HookTestError extends Error {}

const useHookTestStore = defineStore('hook-test', () => {
  const formatValue = async (value: number, label: string): Promise<string> =>
    `${label}:${value}`;

  const fail = (message: string): never => {
    throw new HookTestError(message);
  };

  const ignored = (): string => 'ignored';

  return { formatValue, fail, ignored };
});

beforeEach(() => {
  setActivePinia(createPinia());
});

test('hookStoreActions infers action names, arguments, and results', () => {
  hookStoreActions(useHookTestStore(), {
    formatValue: {
      before: (context) => {
        expectTypeOf(context.name).toEqualTypeOf<'formatValue'>();
        expectTypeOf(context.args).toEqualTypeOf<
          [value: number, label: string]
        >();
      },
      after: (context) => {
        expectTypeOf(context.result).toEqualTypeOf<string>();
      },
    },
  });
});

test('hookStoreActions invokes before and after hooks', async () => {
  const before = vi.fn();
  const after = vi.fn();
  const store = useHookTestStore();

  hookStoreActions(store, {
    formatValue: { before, after },
  });

  await expect(store.formatValue(2, 'value')).resolves.toBe('value:2');
  expect(before).toHaveBeenCalledWith({
    name: 'formatValue',
    args: [2, 'value'],
  });
  expect(after).toHaveBeenCalledWith({
    name: 'formatValue',
    args: [2, 'value'],
    result: 'value:2',
  });
});

test('hookStoreActions invokes error hooks without swallowing action errors', () => {
  const errorHook = vi.fn();
  const store = useHookTestStore();

  hookStoreActions(store, {
    fail: {
      error: (context) => {
        expectTypeOf(context.args).toEqualTypeOf<[message: string]>();
        errorHook(context);
      },
    },
  });

  expect(() => store.fail('failure')).toThrow(HookTestError);
  expect(errorHook).toHaveBeenCalledWith({
    name: 'fail',
    args: ['failure'],
    error: expect.any(HookTestError),
  });
});

test('hookStoreActions returns the Pinia unsubscribe handle', async () => {
  const after = vi.fn();
  const store = useHookTestStore();
  const unsubscribe = hookStoreActions(store, {
    formatValue: { after },
  });

  await store.formatValue(1, 'before');
  unsubscribe();
  await store.formatValue(2, 'after');

  expect(after).toHaveBeenCalledOnce();
});

test('hookStoreActions ignores actions without registered hooks', () => {
  const store = useHookTestStore();
  const after = vi.fn();

  hookStoreActions(store, {
    formatValue: { after },
  });

  expect(store.ignored()).toBe('ignored');
  expect(after).not.toHaveBeenCalled();
});
