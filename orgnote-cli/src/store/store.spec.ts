import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const testPaths = vi.hoisted(() => ({ storeFile: '' }));

vi.mock('../tools/paths.js', () => ({
  getStorePath: () => testPaths.storeFile,
}));

let testDir: string;

beforeEach(() => {
  vi.resetModules();
  testDir = mkdtempSync(join(tmpdir(), 'orgnote-store-'));
  testPaths.storeFile = join(testDir, 'account.json');
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

const getCorruptedFiles = (): string[] =>
  readdirSync(testDir).filter((name) => name.includes('.corrupt-'));

test('empty state is quarantined and restored with an empty store', async () => {
  writeFileSync(testPaths.storeFile, '');
  const { initStore } = await import('./store.js');
  const onRecovery = vi.fn();

  const files = initStore('account', onRecovery).get('files');

  expect(files).toEqual({});
  expect(onRecovery).toHaveBeenCalledOnce();
  expect(onRecovery).toHaveBeenCalledWith(expect.stringContaining('.corrupt-'));
  expect(JSON.parse(readFileSync(testPaths.storeFile, 'utf8'))).toEqual({ files: {} });
  expect(getCorruptedFiles()).toHaveLength(1);
});

test('malformed state is preserved before restoring an empty store', async () => {
  const malformedState = '{"files":';
  writeFileSync(testPaths.storeFile, malformedState);
  const { initStore } = await import('./store.js');

  expect(initStore('account').get('files')).toEqual({});

  const [corruptedFile] = getCorruptedFiles();
  expect(corruptedFile).toBeDefined();
  expect(readFileSync(join(testDir, corruptedFile!), 'utf8')).toBe(malformedState);
});

test('invalid state shape is quarantined', async () => {
  writeFileSync(testPaths.storeFile, '{"files":null}');
  const { initStore } = await import('./store.js');

  expect(initStore('account').get('files')).toEqual({});
  expect(getCorruptedFiles()).toHaveLength(1);
});

test('valid state is read without creating a quarantine file', async () => {
  const files = {
    '/note.org': { mtime: 1, size: 2, status: 'synced' as const },
  };
  writeFileSync(testPaths.storeFile, JSON.stringify({ files }));
  const { initStore } = await import('./store.js');

  expect(initStore('account').get('files')).toEqual(files);
  expect(getCorruptedFiles()).toHaveLength(0);
});

test('state writes replace the store without leaving temporary files', async () => {
  const { initStore } = await import('./store.js');
  const state = initStore('account');

  state.set('files', {
    '/note.org': { mtime: 1, size: 2, status: 'synced' },
  });

  expect(JSON.parse(readFileSync(testPaths.storeFile, 'utf8'))).toEqual({
    files: {
      '/note.org': { mtime: 1, size: 2, status: 'synced' },
    },
  });
  expect(readdirSync(testDir).some((name) => name.includes('.tmp-'))).toBe(false);
});
