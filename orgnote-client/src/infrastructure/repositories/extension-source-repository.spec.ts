import 'fake-indexeddb/auto';
import {
  createExtensionSourceRepository,
  EXTENSION_SOURCE_MIGRATIONS,
  EXTENSION_SOURCE_REPOSITORY_NAME,
} from './extension-source-repository';
import type Dexie from 'dexie';
import { expect, test, beforeEach, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import type { ExtensionSource } from 'orgnote-api';
import { createDatabase } from './create-database';

const createMockExtensionSource = (overrides: Partial<ExtensionSource> = {}): ExtensionSource => ({
  name: faker.internet.domainName(),
  version: faker.system.semver(),
  source: 'local',
  module: faker.lorem.paragraph(),
  docFiles: [],
  ...overrides,
});

let db: Dexie;
let dropAll: () => Promise<void>;
let repository: ReturnType<typeof createExtensionSourceRepository>;

beforeEach(() => {
  const databaseSettings = createDatabase([
    { storeName: EXTENSION_SOURCE_REPOSITORY_NAME, migrations: EXTENSION_SOURCE_MIGRATIONS },
  ]);
  db = databaseSettings.db;
  dropAll = databaseSettings.dropAll;
  repository = createExtensionSourceRepository(db);
});

afterEach(async () => {
  await dropAll();
});

test('createExtensionSourceRepository upsert saves extension source', async () => {
  const extension = createMockExtensionSource();
  await repository.upsert(extension);

  const result = await repository.get(extension.name);

  expect(result).toBeDefined();
  expect(result?.name).toBe(extension.name);
  expect(result?.version).toBe(extension.version);
  expect(result?.module).toBe(extension.module);
});

test('createExtensionSourceRepository get returns undefined for non-existent extension', async () => {
  const result = await repository.get('non-existent-extension');
  expect(result).toBeUndefined();
});

test('createExtensionSourceRepository getBySource returns extension with specific source', async () => {
  const source = 'github';
  const extension = createMockExtensionSource({ source });
  await repository.upsert(extension);

  const result = await repository.getBySource(source);

  expect(result).toBeDefined();
  expect(result?.source).toBe(source);
  expect(result?.name).toBe(extension.name);
});

test('createExtensionSourceRepository getAll returns all extensions', async () => {
  const ext1 = createMockExtensionSource();
  const ext2 = createMockExtensionSource();

  await repository.upsert(ext1);
  await repository.upsert(ext2);

  const result = await repository.getAll();

  expect(result).toHaveLength(2);
  expect(result.some((e) => e.name === ext1.name)).toBe(true);
  expect(result.some((e) => e.name === ext2.name)).toBe(true);
});

test('createExtensionSourceRepository upsertMany saves multiple extensions', async () => {
  const extensions = [createMockExtensionSource(), createMockExtensionSource()];
  await repository.upsertMany(extensions);

  const result = await repository.getAll();

  expect(result).toHaveLength(2);
});

test('createExtensionSourceRepository delete removes extension by name', async () => {
  const extension = createMockExtensionSource();
  await repository.upsert(extension);

  await repository.delete(extension.name);

  const result = await repository.get(extension.name);
  expect(result).toBeUndefined();
});

test('createExtensionSourceRepository deleteBySource removes extensions by source', async () => {
  const sourceToDelete = 'temp-source';
  const ext1 = createMockExtensionSource({ source: sourceToDelete });
  const ext2 = createMockExtensionSource({ source: 'keep-source' });

  await repository.upsert(ext1);
  await repository.upsert(ext2);

  await repository.deleteBySource(sourceToDelete);

  const result1 = await repository.get(ext1.name);
  const result2 = await repository.get(ext2.name);

  expect(result1).toBeUndefined();
  expect(result2).toBeDefined();
});

test('createExtensionSourceRepository clear removes all extensions', async () => {
  await repository.upsert(createMockExtensionSource());
  await repository.upsert(createMockExtensionSource());

  await repository.clear();

  const result = await repository.getAll();
  expect(result).toHaveLength(0);
});
