import 'fake-indexeddb/auto';
import { test, expect, afterEach, vi } from 'vitest';
import { useSimpleFs } from './simple-fs';
import type { FileSystem, FileSystemChange } from 'orgnote-api';
import Dexie from 'dexie';

const createFileSystem = (): FileSystem => useSimpleFs();

const ensureInitialized = async (fs: FileSystem): Promise<void> => {
  await fs.init?.({});
};

const safeWatch = async (fs: FileSystem, handler: (change: FileSystemChange) => void) => {
  const handle = await fs.watch?.(handler);
  if (!handle) {
    throw new Error('Expected watch handle');
  }
  return handle;
};

afterEach(async () => {
  vi.restoreAllMocks();
  await Dexie.delete('simple-fs');
});

test('simple-fs init creates root directory on first initialization', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  const result = await fs.init?.({});

  expect(result).toEqual({ root: '/' });
  expect(await fs.isDirExist('/')).toBe(true);
});

test('simple-fs init succeeds when called multiple times', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  const secondResult = await fs.init?.({});

  expect(secondResult).toEqual({ root: '/' });
  expect(await fs.isDirExist('/')).toBe(true);
});

test('simple-fs init does not throw on repeated calls', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);

  await expect(fs.init?.({})).resolves.toEqual({ root: '/' });
  await expect(fs.init?.({})).resolves.toEqual({ root: '/' });
  await expect(fs.init?.({})).resolves.toEqual({ root: '/' });
});

test('simple-fs init preserves existing files after re-initialization', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  await fs.writeFile('/test-file.txt', 'test content');

  await fs.init?.({});

  const content = await fs.readFile('/test-file.txt');
  expect(content).toBe('test content');
});

test('simple-fs init preserves nested directory structure after re-initialization', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  await fs.mkdir('/nested');
  await fs.writeFile('/nested/file.txt', 'nested content');

  await fs.init?.({});

  expect(await fs.isDirExist('/nested')).toBe(true);
  const content = await fs.readFile('/nested/file.txt');
  expect(content).toBe('nested content');
});

test('simple-fs mkdir throws when creating directory that already exists', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  await fs.mkdir('/existing-dir');

  await expect(fs.mkdir('/existing-dir')).rejects.toThrow('Directory already exists');
});

test('simple-fs mkdir creates new directory successfully', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  await fs.mkdir('/new-dir');

  expect(await fs.isDirExist('/new-dir')).toBe(true);
});

test('simple-fs concurrent writeFile calls share nested directory creation safely', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);

  await expect(
    Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        fs.writeFile(`/demo/generated/note-${index + 1}.org`, `content-${index + 1}`),
      ),
    ),
  ).resolves.toHaveLength(12);

  expect(await fs.isDirExist('/demo')).toBe(true);
  expect(await fs.isDirExist('/demo/generated')).toBe(true);
  expect(await fs.readFile('/demo/generated/note-1.org')).toBe('content-1');
});

test('simple-fs file operations work after repeated init', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  await fs.init?.({});
  await fs.init?.({});

  await fs.writeFile('/after-inits.txt', 'works');
  const content = await fs.readFile('/after-inits.txt');

  expect(content).toBe('works');
});

test('simple-fs file operations preserve consistency through init cycles', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  await fs.writeFile('/file1.txt', 'content1');

  await fs.init?.({});
  await fs.writeFile('/file2.txt', 'content2');

  await fs.init?.({});

  expect(await fs.readFile('/file1.txt')).toBe('content1');
  expect(await fs.readFile('/file2.txt')).toBe('content2');
});

test('simple-fs watch emits create and delete changes', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);

  const changes: FileSystemChange[] = [];
  const handle = await safeWatch(fs, (change) => changes.push(change));

  await fs.writeFile('/note.org', 'value');
  await fs.deleteFile('/note.org');

  await handle?.stop();

  expect(changes.map((change) => change.type)).toEqual(['create', 'delete']);
});

test('simple-fs watch emits modify with updated mtime when file is updated', async () => {
  let currentTime = 1000;
  vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

  const fs = createFileSystem();
  await ensureInitialized(fs);
  await fs.writeFile('/note.org', 'value');

  currentTime = 2000;
  const changes: FileSystemChange[] = [];
  const handle = await safeWatch(fs, (change) => changes.push(change));

  await fs.writeFile('/note.org', 'new value');
  const file = await fs.fileInfo('/note.org');

  await handle.stop();

  expect(file?.mtime).toBe(2000);
  expect(changes[0]).toEqual({
    path: '/note.org',
    type: 'modify',
    mtime: 2000,
  });
});

test('simple-fs watch emits create for directory', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);

  const changes: FileSystemChange[] = [];
  const handle = await safeWatch(fs, (change) => changes.push(change));

  await fs.mkdir('/notes');

  await handle?.stop();

  expect(changes[0]?.path).toBe('/notes');
  expect(changes[0]?.type).toBe('create');
});

test('simple-fs watch emits delete for directory', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  await fs.mkdir('/notes');

  const changes: FileSystemChange[] = [];
  const handle = await safeWatch(fs, (change) => changes.push(change));

  await fs.rmdir('/notes');

  await handle?.stop();

  expect(changes[0]?.path).toBe('/notes');
  expect(changes[0]?.type).toBe('delete');
});

test('simple-fs watch supports multiple listeners', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);

  const changes1: FileSystemChange[] = [];
  const changes2: FileSystemChange[] = [];
  const handle1 = await safeWatch(fs, (change) => changes1.push(change));
  const handle2 = await safeWatch(fs, (change) => changes2.push(change));

  await fs.writeFile('/note.org', 'value');
  await handle1?.stop();
  await fs.writeFile('/note-2.org', 'value');
  await handle2?.stop();

  expect(changes1.length).toBe(1);
  expect(changes2.length).toBe(2);
});

test('simple-fs watch stops emitting after stop', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);

  const changes: FileSystemChange[] = [];
  const handle = await safeWatch(fs, (change) => changes.push(change));

  await fs.writeFile('/note.org', 'value');
  await handle?.stop();
  await fs.writeFile('/note-2.org', 'value');

  expect(changes.map((change) => change.path)).toEqual(['/note.org']);
});

test('simple-fs watch emits rename with previous path', async () => {
  const fs = createFileSystem();
  await ensureInitialized(fs);
  await fs.writeFile('/note.org', 'value');

  const changes: FileSystemChange[] = [];
  const handle = await safeWatch(fs, (change) => changes.push(change));

  await fs.rename('/note.org', '/note-2.org');
  await handle?.stop();

  expect(changes[0]).toEqual({
    path: '/note-2.org',
    previousPath: '/note.org',
    type: 'rename',
  });
});
