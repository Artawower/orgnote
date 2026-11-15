import 'fake-indexeddb/auto';
import { createFileRepository, FILE_MIGRATIONS } from './file-repository';
import type Dexie from 'dexie';
import { expect, test, beforeEach, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import type { FileMeta } from 'orgnote-api';
import { createDatabase } from './create-database';

const createMockFile = (): FileMeta => ({
  id: faker.string.uuid(),
  filePath: [faker.system.fileName()],
  title: faker.lorem.words(3),
  description: faker.lorem.sentences(2),
  tags: Array.from({ length: 3 }, () => faker.lorem.word()),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  touchedAt: faker.date.recent().toISOString(),
});

let db: Dexie;
let dropAll: () => Promise<void>;
let repository: ReturnType<typeof createFileRepository>;

beforeEach(() => {
  const databaseSettings = createDatabase([{ storeName: 'files', migrations: FILE_MIGRATIONS }]);
  db = databaseSettings.db;
  dropAll = databaseSettings.dropAll;
  repository = createFileRepository(db);
});

afterEach(async () => {
  await dropAll();
});

test('should save and retrieve a file by ID', async () => {
  const file = createMockFile();
  await repository.save(file);

  const result = await repository.getById(file.id);
  expect(result).toEqual(file);
});

test('should retrieve file by path', async () => {
  const file = createMockFile();
  await repository.save(file);

  const result = await repository.getByPath(file.filePath);
  expect(result?.id).toBe(file.id);
});

test('should return undefined for non-existent ID', async () => {
  const result = await repository.getById(faker.string.uuid());
  expect(result).toBeUndefined();
});

test('should get multiple files by IDs', async () => {
  const files = Array.from({ length: 3 }, createMockFile);
  await repository.saveBulk(files);

  const ids = files.map((f) => f.id);
  const results = await repository.getByIds(ids);

  expect(results).toHaveLength(3);
});

test('should soft delete a file', async () => {
  const file = createMockFile();
  await repository.save(file);

  await repository.delete(file.id);

  const result = await repository.getById(file.id);
  expect(result).toBeUndefined();
});

test('should count files', async () => {
  const files = Array.from({ length: 5 }, createMockFile);
  await repository.saveBulk(files);

  const count = await repository.count();
  expect(count).toBe(5);
});

test('should count files with tag filter', async () => {
  const file1 = { ...createMockFile(), tags: ['tag1', 'shared'] };
  const file2 = { ...createMockFile(), tags: ['tag2', 'shared'] };
  const file3 = { ...createMockFile(), tags: ['tag1'] };

  await repository.saveBulk([file1, file2, file3]);

  const countShared = await repository.count(['shared']);
  const countTag1 = await repository.count(['tag1']);

  expect(countShared).toBe(2);
  expect(countTag1).toBe(2);
});

test('should get tags stats', async () => {
  const file1 = { ...createMockFile(), tags: ['common', 'a'] };
  const file2 = { ...createMockFile(), tags: ['common', 'b'] };
  const file3 = { ...createMockFile(), tags: ['common'] };

  await repository.saveBulk([file1, file2, file3]);

  const stats = await repository.getTagsStats();
  const commonStat = stats.find((s) => s.tag === 'common');

  expect(commonStat?.count).toBe(3);
});

test('should merge with existing on save', async () => {
  const original = createMockFile();
  original.createdAt = '2020-01-01T00:00:00.000Z';
  original.backlinks = ['link1', 'link2'];
  await repository.save(original);

  const updated: FileMeta = {
    id: 'new-id',
    filePath: original.filePath,
    title: 'Updated Title',
    updatedAt: new Date().toISOString(),
  };
  await repository.save(updated);

  const result = await repository.getByPath(original.filePath);

  expect(result?.id).toBe(original.id);
  expect(result?.createdAt).toBe(original.createdAt);
  expect(result?.backlinks).toEqual(original.backlinks);
  expect(result?.title).toBe('Updated Title');
});

test('should clear all files', async () => {
  const files = Array.from({ length: 5 }, createMockFile);
  await repository.saveBulk(files);

  await repository.clear();

  const count = await repository.count();
  expect(count).toBe(0);
});

test('should return undefined for deleted file by id', async () => {
  const file = createMockFile();
  await repository.save(file);
  await repository.delete(file.id);

  const result = await repository.getById(file.id);
  expect(result).toBeUndefined();
});

test('should return undefined for deleted file by path', async () => {
  const file = createMockFile();
  await repository.save(file);
  await repository.delete(file.id);

  const result = await repository.getByPath(file.filePath);
  expect(result).toBeUndefined();
});

test('save revives a soft-deleted file when written again (recreate/restore)', async () => {
  const file = createMockFile();
  await repository.save(file);
  await repository.delete(file.id);

  await repository.save(file);

  const all = await repository.getAll();
  expect(all).toHaveLength(1);
  expect((await repository.getById(file.id))?.deletedAt).toBeUndefined();
  expect(await repository.getByPath(file.filePath)).toBeDefined();
});

test('save migrates a soft-deleted path ID to a new Org ID', async () => {
  const original: FileMeta = {
    id: '/test.org',
    filePath: ['test.org'],
    title: 'test',
    createdAt: '2026-01-01T00:00:00.000Z',
    backlinks: ['linked-note'],
  };
  await repository.save(original);
  await repository.delete(original.id);

  const migrated: FileMeta = {
    id: 'qwfqwf',
    filePath: original.filePath,
    title: 'SOme EPE',
    tags: ['tag1', 'gad2'],
  };
  await repository.save(migrated);

  expect(await repository.getById(original.id)).toBeUndefined();
  expect(await repository.getById(migrated.id)).toEqual(
    expect.objectContaining({
      id: migrated.id,
      title: migrated.title,
      tags: migrated.tags,
      createdAt: original.createdAt,
      backlinks: original.backlinks,
    }),
  );
  expect((await repository.getByPath(original.filePath))?.id).toBe(migrated.id);
  expect(await repository.count()).toBe(1);
});

test('should filter out deleted files in getByIds', async () => {
  const files = Array.from({ length: 3 }, createMockFile);
  await repository.saveBulk(files);
  await repository.delete(files[1]!.id);

  const results = await repository.getByIds(files.map((f) => f.id));
  expect(results).toHaveLength(2);
  expect(results.find((f) => f.id === files[1]!.id)).toBeUndefined();
});

test('should return empty array for getByIds with empty input', async () => {
  const results = await repository.getByIds([]);
  expect(results).toEqual([]);
});

test('should return only valid files for mixed existing and missing ids', async () => {
  const file = createMockFile();
  await repository.save(file);

  const results = await repository.getByIds([file.id, 'non-existent-id']);
  expect(results).toHaveLength(1);
  expect(results[0]!.id).toBe(file.id);
});

test('should return undefined for empty path', async () => {
  const result = await repository.getByPath([]);
  expect(result).toBeUndefined();
});

test('should get all files ordered by touchedAt descending', async () => {
  const file1 = { ...createMockFile(), touchedAt: '2023-01-01T00:00:00.000Z' };
  const file2 = { ...createMockFile(), touchedAt: '2023-06-01T00:00:00.000Z' };
  const file3 = { ...createMockFile(), touchedAt: '2023-03-01T00:00:00.000Z' };

  await repository.saveBulk([file1, file2, file3]);

  const results = await repository.getAll();
  expect(results[0]!.id).toBe(file2.id);
  expect(results[1]!.id).toBe(file3.id);
  expect(results[2]!.id).toBe(file1.id);
});

test('should apply limit in getAll', async () => {
  const files = Array.from({ length: 10 }, createMockFile);
  await repository.saveBulk(files);

  const results = await repository.getAll({ limit: 5 });
  expect(results).toHaveLength(5);
});

test('should apply offset in getAll', async () => {
  const files = Array.from({ length: 10 }, () => ({
    ...createMockFile(),
    touchedAt: new Date().toISOString(),
  }));
  await repository.saveBulk(files);

  const allResults = await repository.getAll();
  const offsetResults = await repository.getAll({ offset: 3 });

  expect(offsetResults).toHaveLength(7);
  expect(offsetResults[0]!.id).toBe(allResults[3]!.id);
});

test('should filter by tags in getAll', async () => {
  const file1 = { ...createMockFile(), tags: ['work'] };
  const file2 = { ...createMockFile(), tags: ['personal'] };
  const file3 = { ...createMockFile(), tags: ['work', 'urgent'] };

  await repository.saveBulk([file1, file2, file3]);

  const results = await repository.getAll({ tags: ['work'] });
  expect(results).toHaveLength(2);
});

test('should return empty for non-matching tags', async () => {
  const file = { ...createMockFile(), tags: ['existing'] };
  await repository.save(file);

  const results = await repository.getAll({ tags: ['nonexistent'] });
  expect(results).toEqual([]);
});

test('should combine limit offset and tags in getAll', async () => {
  const files = Array.from({ length: 10 }, (_, i) => ({
    ...createMockFile(),
    tags: i < 7 ? ['target'] : ['other'],
    touchedAt: new Date(2023, 0, i + 1).toISOString(),
  }));
  await repository.saveBulk(files);

  const results = await repository.getAll({ limit: 3, offset: 2, tags: ['target'] });
  expect(results).toHaveLength(3);
});

test('should set createdAt on new file save', async () => {
  const file: FileMeta = {
    id: faker.string.uuid(),
    filePath: ['test.org'],
    title: 'Test',
  };
  await repository.save(file);

  const result = await repository.getById(file.id);
  expect(result?.createdAt).toBeDefined();
});

test('should set touchedAt on new file save', async () => {
  const file: FileMeta = {
    id: faker.string.uuid(),
    filePath: ['test.org'],
    title: 'Test',
  };
  await repository.save(file);

  const result = await repository.getById(file.id);
  expect(result?.touchedAt).toBeDefined();
});

test('should not error on delete of non-existent id', async () => {
  await expect(repository.delete('non-existent')).resolves.not.toThrow();
});

test('should exclude deleted files from count', async () => {
  const files = Array.from({ length: 5 }, createMockFile);
  await repository.saveBulk(files);
  await repository.delete(files[0]!.id);
  await repository.delete(files[1]!.id);

  const count = await repository.count();
  expect(count).toBe(3);
});

test('should exclude deleted files from tags stats', async () => {
  const file1 = { ...createMockFile(), tags: ['counted'] };
  const file2 = { ...createMockFile(), tags: ['counted'] };
  await repository.saveBulk([file1, file2]);
  await repository.delete(file1.id);

  const stats = await repository.getTagsStats();
  const countedStat = stats.find((s) => s.tag === 'counted');

  expect(countedStat?.count).toBe(1);
});

test('should return empty array for getTagsStats when no tags', async () => {
  const file = { ...createMockFile(), tags: undefined };
  await repository.save(file);

  const stats = await repository.getTagsStats();
  expect(stats).toEqual([]);
});

test('should sort tags stats by count descending', async () => {
  const file1 = { ...createMockFile(), tags: ['rare'] };
  const file2 = { ...createMockFile(), tags: ['common', 'rare'] };
  const file3 = { ...createMockFile(), tags: ['common'] };
  const file4 = { ...createMockFile(), tags: ['common'] };

  await repository.saveBulk([file1, file2, file3, file4]);

  const stats = await repository.getTagsStats();
  expect(stats[0]!.tag).toBe('common');
  expect(stats[0]!.count).toBe(3);
  expect(stats[1]!.tag).toBe('rare');
  expect(stats[1]!.count).toBe(2);
});
