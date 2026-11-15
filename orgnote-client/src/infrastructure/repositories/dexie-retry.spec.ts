import type Dexie from 'dexie';
import { expect, test, vi } from 'vitest';
import { runDexieOperation, withDexieRecovery } from './dexie-retry';

const createDatabaseClosedError = (message = 'Database has been closed'): Error => {
  const error = new Error(message);
  error.name = 'DatabaseClosedError';
  return error;
};

const createMockDb = (): Dexie =>
  ({
    close: vi.fn(),
    open: vi.fn(() => Promise.resolve()),
  }) as unknown as Dexie;

test('runDexieOperation retries operation after reopening closed database connection', async () => {
  const db = createMockDb();
  const operation = vi
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(createDatabaseClosedError())
    .mockResolvedValueOnce('recovered');

  const result = await runDexieOperation(db, operation);

  expect(result).toBe('recovered');
  expect(db.close).toHaveBeenCalledWith({ disableAutoOpen: false });
  expect(db.open).toHaveBeenCalledTimes(1);
  expect(operation).toHaveBeenCalledTimes(2);
});

test('runDexieOperation does not retry ordinary failures', async () => {
  const db = createMockDb();
  const error = new Error('ordinary failure');
  const operation = vi.fn<() => Promise<string>>().mockRejectedValue(error);

  await expect(runDexieOperation(db, operation)).rejects.toBe(error);

  expect(db.close).not.toHaveBeenCalled();
  expect(db.open).not.toHaveBeenCalled();
  expect(operation).toHaveBeenCalledTimes(1);
});

test('runDexieOperation rejects when reconnect fails', async () => {
  const db = createMockDb();
  const reconnectError = new Error('reconnect failed');
  vi.mocked(db.open).mockRejectedValue(reconnectError);

  const operation = vi.fn<() => Promise<string>>().mockRejectedValue(createDatabaseClosedError());

  await expect(runDexieOperation(db, operation)).rejects.toBe(reconnectError);

  expect(db.close).toHaveBeenCalledWith({ disableAutoOpen: false });
  expect(db.open).toHaveBeenCalledTimes(1);
  expect(operation).toHaveBeenCalledTimes(1);
});

test('runDexieOperation retries IndexedDB server lost unknown errors', async () => {
  const db = createMockDb();
  const operation = vi
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(
      new Error('UnknownError Connection to Indexed Database server lost. Refresh the page'),
    )
    .mockResolvedValueOnce('recovered');

  await expect(runDexieOperation(db, operation)).resolves.toBe('recovered');

  expect(operation).toHaveBeenCalledTimes(2);
});

test('withDexieRecovery retries wrapped methods after connection loss', async () => {
  const db = createMockDb();
  const operation = vi
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(createDatabaseClosedError())
    .mockResolvedValueOnce('ok');
  const safe = withDexieRecovery(db, { doSomething: () => operation() });

  await expect(safe.doSomething()).resolves.toBe('ok');

  expect(operation).toHaveBeenCalledTimes(2);
});

test('withDexieRecovery does not retry ordinary failures', async () => {
  const db = createMockDb();
  const operation = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('ordinary error'));
  const safe = withDexieRecovery(db, { doSomething: () => operation() });

  await expect(safe.doSomething()).rejects.toThrow('ordinary error');

  expect(operation).toHaveBeenCalledTimes(1);
});

test('withDexieRecovery retries IndexedDB server lost message', async () => {
  const db = createMockDb();
  const operation = vi
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(new Error('UnknownError Connection to Indexed Database server lost'))
    .mockResolvedValueOnce('recovered');
  const safe = withDexieRecovery(db, { doSomething: () => operation() });

  await expect(safe.doSomething()).resolves.toBe('recovered');

  expect(operation).toHaveBeenCalledTimes(2);
});

test('withDexieRecovery preserves non-function properties', () => {
  const safe = withDexieRecovery(createMockDb(), {
    value: 42,
    doSomething: vi.fn(),
  });

  expect(safe.value).toBe(42);
});

test('withDexieRecovery leaves excluded methods unwrapped', () => {
  const watch = vi.fn(() => vi.fn());
  const safe = withDexieRecovery(createMockDb(), { watch }, { exclude: ['watch'] });

  const unsubscribe = safe.watch();

  expect(typeof unsubscribe).toBe('function');
  expect(watch).toHaveBeenCalledTimes(1);
});

test('withDexieRecovery rethrows when retry also fails', async () => {
  const db = createMockDb();
  const operation = vi.fn<() => Promise<string>>().mockRejectedValue(createDatabaseClosedError());
  const safe = withDexieRecovery(db, { doSomething: () => operation() });

  await expect(safe.doSomething()).rejects.toMatchObject({ name: 'DatabaseClosedError' });

  expect(operation).toHaveBeenCalledTimes(2);
});

test('withDexieRecovery preserves original this binding', async () => {
  const target = {
    value: 'bound',
    getValue: vi.fn(function (this: { value: string }) {
      return Promise.resolve(this.value);
    }),
  };
  const safe = withDexieRecovery(createMockDb(), target);

  await expect(safe.getValue()).resolves.toBe('bound');
});
