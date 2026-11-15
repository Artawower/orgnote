import { expect, test, vi } from 'vitest';
import type { FileSystem } from '../../../models/file-system';
import type { RemoteFile, SyncExecutor } from '../../types';
import { processDownload } from '../download';
import { createContext, SHA256_OF_ABC } from './fixtures';

test('processDownload stores the downloaded hash when remote metadata is stale', async () => {
  const content = new TextEncoder().encode('abc');
  const fs = {
    fileInfo: vi.fn(async () => ({ mtime: 42, size: 3 })),
    readFile: vi.fn(async () => {
      throw new Error('must not be called');
    }),
  } as unknown as FileSystem;
  const executor = {
    download: vi.fn(async () => content),
  } as unknown as SyncExecutor;
  const ctx = createContext({ fs, executor });
  const file: RemoteFile = {
    path: '/a.org',
    version: 2,
    deleted: false,
    updatedAt: '2024-01-01T00:00:00Z',
    contentHash: 'stale-remote-hash',
  };

  await processDownload(file, ctx);

  const stored = await ctx.state.getFile('/a.org');

  expect(stored?.contentHash).toBe(SHA256_OF_ABC);
  expect(fs.readFile).toHaveBeenCalledTimes(0);
});

test('processDownload computes contentHash when remote hash is absent', async () => {
  const fs = {
    fileInfo: vi.fn(async () => ({ mtime: 42, size: 10 })),
    readFile: vi.fn(async () => new TextEncoder().encode('abc')),
  } as unknown as FileSystem;
  const executor = {
    download: vi.fn(async () => undefined),
  } as unknown as SyncExecutor;
  const ctx = createContext({ fs, executor });
  const file: RemoteFile = {
    path: '/b.org',
    version: 3,
    deleted: false,
    updatedAt: '2024-01-01T00:00:00Z',
  };

  await processDownload(file, ctx);

  const stored = await ctx.state.getFile('/b.org');

  expect(stored?.contentHash).toBe(SHA256_OF_ABC);
  expect(fs.readFile).toHaveBeenCalledTimes(1);
});

test('processDownload stores error status and rethrows when download fails', async () => {
  const fs = {
    fileInfo: vi.fn(async () => ({ mtime: 42, size: 10 })),
    readFile: vi.fn(async () => new TextEncoder().encode('abc')),
  } as unknown as FileSystem;
  const downloadError = new Error('network');
  const executor = {
    download: vi.fn(async () => {
      throw downloadError;
    }),
  } as unknown as SyncExecutor;
  const ctx = createContext({ fs, executor });
  const previousSyncedAt = '2023-12-01T00:00:00Z';
  await ctx.state.setFile('/d.org', {
    mtime: 10,
    size: 10,
    version: 2,
    status: 'synced',
    syncedAt: previousSyncedAt,
  });
  const file: RemoteFile = {
    path: '/d.org',
    version: 3,
    deleted: false,
    updatedAt: '2024-01-01T00:00:00Z',
  };

  await expect(processDownload(file, ctx)).rejects.toThrow('network');

  const stored = await ctx.state.getFile('/d.org');

  expect(stored?.status).toBe('error');
  expect(stored?.syncedAt).toBe(previousSyncedAt);
  expect(stored?.errorMessage).toContain('network');
});
