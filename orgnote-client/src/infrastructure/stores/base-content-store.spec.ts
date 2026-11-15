import 'fake-indexeddb/auto';
import {
  createBaseContentStore,
  BASE_CONTENT_MIGRATIONS,
  BASE_CONTENT_STORE_NAME,
} from './base-content-store';
import type Dexie from 'dexie';
import { expect, test, beforeEach, afterEach } from 'vitest';
import { createDatabase } from '../repositories/create-database';

let db: Dexie;
let dropAll: () => Promise<void>;
let store: ReturnType<typeof createBaseContentStore>;

const sampleEntry = (overrides: Partial<{ path: string; version: number }> = {}) => ({
  path: overrides.path ?? '/notes/test.org',
  version: overrides.version ?? 1,
  contentHash: 'abc123',
  content: new Uint8Array([1, 2, 3]),
  updatedAt: '2025-01-01T00:00:00Z',
});

beforeEach(() => {
  const databaseSettings = createDatabase([
    { storeName: BASE_CONTENT_STORE_NAME, migrations: BASE_CONTENT_MIGRATIONS },
  ]);
  db = databaseSettings.db;
  dropAll = databaseSettings.dropAll;
  store = createBaseContentStore(db);
});

afterEach(async () => {
  await dropAll();
});

test('returns null for non-existent path', async () => {
  const result = await store.get('/nonexistent.org');
  expect(result).toBeNull();
});

test('stores and retrieves entry by path', async () => {
  const entry = sampleEntry();
  await store.set(entry.path, entry);

  const result = await store.get(entry.path);
  expect(result).toEqual(entry);
});

test('overwrites existing entry by path', async () => {
  const entry = sampleEntry();
  await store.set(entry.path, entry);

  const updated = sampleEntry({ version: 2 });
  updated.contentHash = 'def456';
  updated.content = new Uint8Array([4, 5, 6]);
  await store.set(entry.path, updated);

  const result = await store.get(entry.path);
  expect(result?.version).toBe(2);
  expect(result?.contentHash).toBe('def456');
});

test('removes entry by path', async () => {
  const entry = sampleEntry();
  await store.set(entry.path, entry);
  await store.remove(entry.path);

  const result = await store.get(entry.path);
  expect(result).toBeNull();
});

test('stores multiple entries independently', async () => {
  const entry1 = sampleEntry({ path: '/notes/a.org' });
  const entry2 = sampleEntry({ path: '/notes/b.org', version: 5 });

  await store.set(entry1.path, entry1);
  await store.set(entry2.path, entry2);

  expect(await store.get('/notes/a.org')).toEqual(entry1);
  expect(await store.get('/notes/b.org')).toEqual(entry2);
});
