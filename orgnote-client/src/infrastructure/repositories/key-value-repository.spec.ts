import 'fake-indexeddb/auto';
import { createKeyValueRepository, KEY_VALUE_MIGRATIONS } from './key-value-repository';
import type Dexie from 'dexie';
import { expect, test, beforeEach, afterEach, vi } from 'vitest';
import { createDatabase } from './create-database';

let db: Dexie;
let dropAll: () => Promise<void>;
let repository: ReturnType<typeof createKeyValueRepository>;

beforeEach(() => {
  const databaseSettings = createDatabase([
    { storeName: 'keyValue', migrations: KEY_VALUE_MIGRATIONS },
  ]);
  db = databaseSettings.db;
  dropAll = databaseSettings.dropAll;
  repository = createKeyValueRepository(db);
});

afterEach(async () => {
  await dropAll();
});

test('should set and get a value', async () => {
  await repository.set('test-key', 'test-value');
  const result = await repository.get('test-key');
  expect(result).toBe('test-value');
});

test('should return undefined for non-existent key', async () => {
  const result = await repository.get('non-existent');
  expect(result).toBeUndefined();
});

test('should overwrite existing value', async () => {
  await repository.set('key', 'value1');
  await repository.set('key', 'value2');
  const result = await repository.get('key');
  expect(result).toBe('value2');
});

test('should delete a value', async () => {
  await repository.set('key', 'value');
  await repository.delete('key');
  const result = await repository.get('key');
  expect(result).toBeUndefined();
});

test('should clear all values', async () => {
  await repository.set('key1', 'value1');
  await repository.set('key2', 'value2');
  await repository.clear();

  const result1 = await repository.get('key1');
  const result2 = await repository.get('key2');

  expect(result1).toBeUndefined();
  expect(result2).toBeUndefined();
});

test('should handle JSON values', async () => {
  const data = { foo: 'bar', num: 42 };
  await repository.set('json-key', JSON.stringify(data));

  const result = await repository.get('json-key');
  expect(result).toBeDefined();
  expect(JSON.parse(result!)).toEqual(data);
});

test('should retry after reopening database when IndexedDB connection is lost', async () => {
  await repository.set('retry-key', 'retry-value');

  const table = db.table('keyValue');
  const connectionError = new Error('Database has been closed');
  connectionError.name = 'DatabaseClosedError';
  const getSpy = vi
    .spyOn(table, 'get')
    .mockRejectedValueOnce(connectionError)
    .mockResolvedValueOnce({ key: 'retry-key', value: 'retry-value' });
  const closeSpy = vi.spyOn(db, 'close');
  const openSpy = vi.spyOn(db, 'open').mockResolvedValue(db);

  const result = await repository.get('retry-key');

  expect(result).toBe('retry-value');
  expect(closeSpy).toHaveBeenCalledWith({ disableAutoOpen: false });
  expect(openSpy).toHaveBeenCalledTimes(1);
  expect(getSpy).toHaveBeenCalledTimes(2);
});
