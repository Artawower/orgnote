import { afterEach, expect, test, vi } from 'vitest';
import os from 'os';
import path from 'path';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { createFileBaseContentStore } from './base-content-store.js';

const createTempHome = (): string => {
  const tempHome = path.join(os.tmpdir(), `orgnote-base-store-${Date.now()}`);
  mkdirSync(tempHome, { recursive: true });
  return tempHome;
};

const cleanupHome = (tempHome: string): void => {
  rmSync(tempHome, { recursive: true, force: true });
};

const createStoredPath = (
  tempHome: string,
  accountName: string,
  dirName: string,
  ext: string
): string =>
  path.join(
    tempHome,
    '.config',
    'orgnote',
    'base-content',
    accountName,
    dirName,
    `L2hvbWUub3Jn${ext}`
  );

afterEach(() => {
  vi.restoreAllMocks();
});

test('store roundtrips metadata and raw content in separate files', async () => {
  const tempHome = createTempHome();
  vi.spyOn(os, 'homedir').mockReturnValue(tempHome);

  const store = createFileBaseContentStore('test');
  const content = new Uint8Array([65, 66, 67]);

  await store.set('/home.org', {
    path: '/home.org',
    version: 1,
    contentHash: 'hash',
    content,
    updatedAt: 'now',
  });

  const metadataPath = createStoredPath(tempHome, 'test', 'metadata', '.json');
  const contentPath = createStoredPath(tempHome, 'test', 'content', '.bin');
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

  expect(metadata).toEqual({
    path: '/home.org',
    version: 1,
    contentHash: 'hash',
    updatedAt: 'now',
  });
  expect(Array.from(readFileSync(contentPath))).toEqual([65, 66, 67]);

  const restored = await store.get('/home.org');

  expect(Array.from(restored?.content ?? [])).toEqual([65, 66, 67]);
  cleanupHome(tempHome);
});

test('store reads legacy buffer json content', async () => {
  const tempHome = createTempHome();
  vi.spyOn(os, 'homedir').mockReturnValue(tempHome);

  const storedPath = path.join(
    tempHome,
    '.config',
    'orgnote',
    'base-content',
    'test',
    'L2hvbWUub3Jn.json'
  );
  mkdirSync(path.dirname(storedPath), { recursive: true });
  writeFileSync(
    storedPath,
    JSON.stringify({
      path: '/home.org',
      version: 57,
      contentHash: 'hash',
      content: { type: 'Buffer', data: [67, 108, 105] },
      updatedAt: 'now',
    }),
    'utf-8'
  );

  const store = createFileBaseContentStore('test');
  const restored = await store.get('/home.org');

  expect(Array.from(restored?.content ?? [])).toEqual([67, 108, 105]);
  cleanupHome(tempHome);
});

test('remove deletes metadata, content and legacy files', async () => {
  const tempHome = createTempHome();
  vi.spyOn(os, 'homedir').mockReturnValue(tempHome);

  const store = createFileBaseContentStore('test');
  await store.set('/home.org', {
    path: '/home.org',
    version: 1,
    contentHash: 'hash',
    content: new Uint8Array([65]),
    updatedAt: 'now',
  });

  const metadataPath = createStoredPath(tempHome, 'test', 'metadata', '.json');
  const contentPath = createStoredPath(tempHome, 'test', 'content', '.bin');
  const legacyPath = path.join(
    tempHome,
    '.config',
    'orgnote',
    'base-content',
    'test',
    'L2hvbWUub3Jn.json'
  );
  writeFileSync(legacyPath, '{}', 'utf-8');

  await store.remove('/home.org');

  expect(existsSync(metadataPath)).toBe(false);
  expect(existsSync(contentPath)).toBe(false);
  expect(existsSync(legacyPath)).toBe(false);
  cleanupHome(tempHome);
});
