import { expect, test, vi } from 'vitest';
import { AxiosError } from 'axios';
import type { FileSystem } from '../../../models/file-system';
import { ErrorFileNotFound } from '../../../models/file-system';
import type { SyncExecutor } from '../../types';
import { handleConflict } from '../conflict';
import { createContext, SHA256_OF_ABC } from './fixtures';

test('handleConflict stores computed contentHash after server download', async () => {
  const fs = {
    copyFile: vi.fn(async () => undefined),
    fileInfo: vi.fn(async () => ({ mtime: 100, size: 3 })),
    readFile: vi.fn(async () => new TextEncoder().encode('abc')),
  } as unknown as FileSystem;
  const executor = {
    download: vi.fn(async () => undefined),
  } as unknown as SyncExecutor;
  const ctx = createContext({ fs, executor, deviceName: 'dev' });

  await handleConflict('/c.org', { status: 'conflict', serverVersion: 7 }, ctx);

  const stored = await ctx.state.getFile('/c.org');

  expect(stored?.status).toBe('synced');
  expect(stored?.version).toBe(7);
  expect(stored?.contentHash).toBe(SHA256_OF_ABC);
  expect(stored?.conflictPath).toContain('.sync-conflict-');
});

test('handleConflict removes local file and state when server version is missing', async () => {
  const fs = {
    copyFile: vi.fn(async () => undefined),
    deleteFile: vi.fn(async () => undefined),
  } as unknown as FileSystem;
  const notFoundResponse = {
    status: 404,
    statusText: 'Not Found',
    headers: {},
    config: {} as never,
    data: {},
  };
  const executor = {
    download: vi.fn(async () => {
      throw new AxiosError(
        'Not Found',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        notFoundResponse
      );
    }),
  } as unknown as SyncExecutor;
  const ctx = createContext({ fs, executor, deviceName: 'dev' });

  await handleConflict(
    '/missing.org',
    { status: 'conflict', serverVersion: 7 },
    ctx
  );

  const stored = await ctx.state.getFile('/missing.org');

  expect(fs.deleteFile).toHaveBeenCalledWith('/missing.org');
  expect(stored).toBeNull();
});

test('handleConflict stores undefined contentHash when read fails with ErrorFileNotFound', async () => {
  const fs = {
    copyFile: vi.fn(async () => undefined),
    fileInfo: vi.fn(async () => ({ mtime: 100, size: 3 })),
    readFile: vi.fn(async () => {
      throw new ErrorFileNotFound('/c.org');
    }),
  } as unknown as FileSystem;
  const executor = {
    download: vi.fn(async () => undefined),
  } as unknown as SyncExecutor;
  const ctx = createContext({ fs, executor, deviceName: 'dev' });

  await handleConflict('/c.org', { status: 'conflict', serverVersion: 7 }, ctx);

  const stored = await ctx.state.getFile('/c.org');

  expect(stored?.status).toBe('synced');
  expect(stored?.contentHash).toBeUndefined();
});

test('handleConflict rejects unsafe OrgNote config fallback', async () => {
  const localContent = new TextEncoder().encode('[synchronization]\ntype = "api"\n');
  const download = vi.fn(async () => undefined);
  const fs = {
    fileInfo: vi.fn(async () => ({ mtime: 100, size: localContent.length })),
    readFile: vi.fn(async () => localContent),
    writeFile: vi.fn(async () => undefined),
  } as unknown as FileSystem;
  const executor = { download } as unknown as SyncExecutor;
  const ctx = createContext({ fs, executor, deviceName: 'dev' });

  await expect(
    handleConflict(
      '/.orgnote/config.toml',
      { status: 'conflict', serverVersion: 7 },
      ctx
    )
  ).rejects.toThrow('non-mutating content fetch');

  expect(download).not.toHaveBeenCalled();
});

test('handleConflict keeps local OrgNote config active', async () => {
  const localContent = new TextEncoder().encode('[synchronization]\ntype = "api"\n');
  const remoteContent = new TextEncoder().encode('[synchronization]\ntype = "none"\n');
  const writeFile = vi.fn<(path: string, content: Uint8Array) => Promise<void>>(
    async () => undefined
  );
  const fs = {
    fileInfo: vi.fn(async () => ({ mtime: 100, size: localContent.length })),
    readFile: vi.fn(async () => localContent),
    writeFile,
  } as unknown as FileSystem;
  const executor = {
    download: vi.fn(async () => undefined),
    fetchContent: vi.fn(async () => remoteContent),
  } as unknown as SyncExecutor;
  const ctx = createContext({ fs, executor, deviceName: 'dev' });

  await handleConflict(
    '/.orgnote/config.toml',
    { status: 'conflict', serverVersion: 7 },
    ctx
  );

  const stored = await ctx.state.getFile('/.orgnote/config.toml');
  const conflictWrite = writeFile.mock.calls.find(([path]) =>
    String(path).includes('.sync-conflict-')
  );

  expect(stored?.status).toBe('pending');
  expect(stored?.version).toBe(7);
  expect(conflictWrite?.[1]).toEqual(remoteContent);
  expect(writeFile).not.toHaveBeenCalledWith('/.orgnote/config.toml', remoteContent);
});
