import { expect, test, vi } from 'vitest';
import type { FileSystem } from '../../../models/file-system';
import type { SyncExecutor, BaseContentStore, BaseContentEntry } from '../../types';
import { processUpload } from '../upload';
import { createMemorySyncState } from '../../memory-state';

vi.mock('../content-hash', () => ({
  resolveContentHash: vi.fn(async () => 'mock-hash'),
}));

const createUploadContext = (overrides: {
  fs: Record<string, unknown>;
  executor?: Record<string, unknown>;
  isDirtyFile?: (path: string) => Promise<boolean> | boolean;
  baseStore?: BaseContentStore;
}) => ({
  fs: overrides.fs as unknown as FileSystem,
  executor: (overrides.executor ?? {}) as unknown as SyncExecutor,
  state: createMemorySyncState(),
  serverTime: '2024-01-01T00:00:00Z',
  deviceName: 'test-device',
  isDirtyFile: overrides.isDirtyFile,
  baseStore: overrides.baseStore,
});

const LOCAL_FILE = {
  path: '/note.org',
  mtime: 100,
  size: 50,
  contentHash: 'abc123',
};

const createBaseStore = (
  storedBase?: BaseContentEntry
): BaseContentStore => ({
  get: vi.fn(async () => storedBase ?? null),
  set: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
});

test('upload without baseStore uses fallback conflict on 409', async () => {
  const ctx = createUploadContext({
    fs: {
      copyFile: vi.fn(async () => undefined),
      fileInfo: vi.fn(async () => ({ mtime: 100, size: 50 })),
      readFile: vi.fn(async () => new TextEncoder().encode('server content')),
      deleteFile: vi.fn(async () => undefined),
    },
    executor: {
      upload: vi.fn(async () => ({
        status: 'conflict' as const,
        serverVersion: 3,
      })),
      download: vi.fn(async () => undefined),
    },
  });

  await processUpload(LOCAL_FILE, ctx);

  const stored = await ctx.state.getFile('/note.org');
  expect(stored?.status).toBe('synced');
  expect(stored?.version).toBe(3);
  expect(stored?.syncedAt).toBe(ctx.serverTime);
  expect(stored?.conflictPath).toContain('.sync-conflict-');
});

test('successful upload without baseStore persists synced state', async () => {
  const ctx = createUploadContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 100, size: 50 })),
      readFile: vi.fn(async () => new TextEncoder().encode('content')),
    },
    executor: {
      upload: vi.fn(async () => ({ status: 'ok' as const, version: 2 })),
    },
  });

  await processUpload(LOCAL_FILE, ctx);

  const stored = await ctx.state.getFile('/note.org');
  expect(stored?.status).toBe('synced');
  expect(stored?.version).toBe(2);
});

test('successful upload with baseStore updates base', async () => {
  const fileContent = new TextEncoder().encode('* Task\n');
  const baseStore = createBaseStore();

  const ctx = createUploadContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 100, size: 50 })),
      readFile: vi.fn(async () => fileContent),
    },
    executor: {
      upload: vi.fn(async () => ({ status: 'ok' as const, version: 4 })),
    },
    baseStore,
  });

  await processUpload(LOCAL_FILE, ctx);

  expect(baseStore.set).toHaveBeenCalledWith(
    '/note.org',
    expect.objectContaining({
      path: '/note.org',
      version: 4,
      content: fileContent,
    })
  );
});

test('merge-retry flow: conflict → merge → retry success → synced', async () => {
  const baseContent = new TextEncoder().encode('* TODO Base\n');
  const localContent = new TextEncoder().encode('* DONE Local\n');
  const remoteContent = new TextEncoder().encode('* TODO Base\n* New\n');

  const baseStore = createBaseStore({
    path: '/note.org',
    version: 2,
    contentHash: 'old-hash',
    content: baseContent,
    updatedAt: '2024-01-01T00:00:00Z',
  });

  let uploadCallCount = 0;

  const ctx = createUploadContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 100, size: 200 })),
      readFile: vi.fn()
        .mockResolvedValueOnce(localContent)
        .mockResolvedValueOnce(remoteContent)
        .mockResolvedValueOnce(localContent),
      writeFile: vi.fn(async () => undefined),
      deleteFile: vi.fn(async () => undefined),
    },
    executor: {
      upload: vi.fn(async () => {
        uploadCallCount++;
        if (uploadCallCount === 1) {
          return { status: 'conflict' as const, serverVersion: 3 };
        }
        return { status: 'ok' as const, version: 4 };
      }),
      download: vi.fn(async () => undefined),
    },
    baseStore,
  });

  await processUpload(LOCAL_FILE, ctx);

  expect(uploadCallCount).toBe(2);

  const stored = await ctx.state.getFile('/note.org');
  expect(stored?.status).toBe('synced');
  expect(stored?.version).toBe(4);
  expect(stored?.conflictPath).toBeUndefined();
});

test('merge-retry flow: conflict → merge fails → fallback conflict', async () => {
  const baseContent = new TextEncoder().encode('* TODO Task\n');
  const localContent = new TextEncoder().encode('* DONE Task\n');
  const remoteContent = new TextEncoder().encode('* CANCELLED Task\n');

  const baseStore = createBaseStore({
    path: '/note.org',
    version: 2,
    contentHash: 'old-hash',
    content: baseContent,
    updatedAt: '2024-01-01T00:00:00Z',
  });

  const ctx = createUploadContext({
    fs: {
      copyFile: vi.fn(async () => undefined),
      fileInfo: vi.fn(async () => ({ mtime: 100, size: 200 })),
      readFile: vi.fn()
        .mockResolvedValueOnce(localContent)
        .mockResolvedValueOnce(remoteContent)
        .mockResolvedValueOnce(new TextEncoder().encode('server')),
      writeFile: vi.fn(async () => undefined),
      deleteFile: vi.fn(async () => undefined),
    },
    executor: {
      upload: vi.fn(async () => ({
        status: 'conflict' as const,
        serverVersion: 3,
      })),
      download: vi.fn(async () => undefined),
    },
    baseStore,
  });

  await processUpload(LOCAL_FILE, ctx);

  const stored = await ctx.state.getFile('/note.org');
  expect(stored?.status).toBe('synced');
  expect(stored?.conflictPath).toContain('.sync-conflict-');
});

test('merge-retry flow: merge succeeds but retry conflicts → fallback', async () => {
  const baseContent = new TextEncoder().encode('* TODO Base\n');
  const localContent = new TextEncoder().encode('* DONE Local\n');
  const remoteContent = new TextEncoder().encode('* TODO Base\n* New\n');

  const baseStore = createBaseStore({
    path: '/note.org',
    version: 2,
    contentHash: 'old-hash',
    content: baseContent,
    updatedAt: '2024-01-01T00:00:00Z',
  });

  const ctx = createUploadContext({
    fs: {
      copyFile: vi.fn(async () => undefined),
      fileInfo: vi.fn(async () => ({ mtime: 100, size: 200 })),
      readFile: vi.fn()
        .mockResolvedValueOnce(localContent)
        .mockResolvedValueOnce(remoteContent)
        .mockResolvedValueOnce(localContent)
        .mockResolvedValueOnce(new TextEncoder().encode('server')),
      writeFile: vi.fn(async () => undefined),
      deleteFile: vi.fn(async () => undefined),
    },
    executor: {
      upload: vi.fn(async () => ({
        status: 'conflict' as const,
        serverVersion: 3,
      })),
      download: vi.fn(async () => undefined),
    },
    baseStore,
  });

  await processUpload(LOCAL_FILE, ctx);

  const stored = await ctx.state.getFile('/note.org');
  expect(stored?.status).toBe('synced');
  expect(stored?.conflictPath).toContain('.sync-conflict-');
});

test.each([false, true])(
  'initial config conflict keeps remote authoritative with baseStore=%s',
  async (hasBaseStore) => {
    const path = '/.orgnote/config.toml';
    const localContent = new TextEncoder().encode('[network]\napiUrl = "local-default"\n');
    const remoteContent = new TextEncoder().encode('[network]\napiUrl = "remote"\n');
    const upload = vi.fn()
      .mockResolvedValueOnce({ status: 'conflict' as const, serverVersion: 48 })
      .mockResolvedValueOnce({ status: 'ok' as const, version: 49 });
    const copyFile = vi.fn(async () => undefined);
    const download = vi.fn(async () => remoteContent);
    const ctx = createUploadContext({
      fs: {
        copyFile,
        fileInfo: vi.fn(async () => ({ mtime: 100, size: remoteContent.length })),
        readFile: vi.fn(async () => remoteContent),
        writeFile: vi.fn(async () => undefined),
      },
      executor: { upload, download, fetchContent: vi.fn(async () => remoteContent) },
      baseStore: hasBaseStore ? createBaseStore() : undefined,
    });

    await processUpload({ ...LOCAL_FILE, path, size: localContent.length }, ctx);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(copyFile).toHaveBeenCalledWith(path, expect.stringContaining('.sync-conflict-'));
    expect(download).toHaveBeenCalledWith(expect.objectContaining({ path, version: 48 }));
    expect(await ctx.state.getFile(path)).toEqual(
      expect.objectContaining({ status: 'synced', version: 48 })
    );
  }
);

test('ambiguous config merge retries local content with current server version', async () => {
  const path = '/.orgnote/config.toml';
  const baseContent = new TextEncoder().encode('[network]\napiUrl = "base"\n');
  const localContent = new TextEncoder().encode('[network]\napiUrl = "local"\n');
  const remoteContent = new TextEncoder().encode('[network]\napiUrl = "remote"\n');
  const baseStore = createBaseStore({
    path,
    version: 2,
    contentHash: 'old-hash',
    content: baseContent,
    updatedAt: '2024-01-01T00:00:00Z',
  });
  const upload = vi.fn()
    .mockResolvedValueOnce({ status: 'conflict' as const, serverVersion: 3 })
    .mockResolvedValueOnce({ status: 'ok' as const, version: 4 });
  const writeFile = vi.fn(async () => undefined);
  const ctx = createUploadContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 100, size: localContent.length })),
      readFile: vi.fn(async () => localContent),
      writeFile,
    },
    executor: {
      upload,
      fetchContent: vi.fn(async () => remoteContent),
    },
    baseStore,
  });

  await processUpload({ ...LOCAL_FILE, path }, ctx);

  expect(upload).toHaveBeenNthCalledWith(2, expect.objectContaining({ path }), 3);
  expect(writeFile).toHaveBeenCalledWith(
    expect.stringContaining('.sync-conflict-'),
    remoteContent
  );
  expect(writeFile).not.toHaveBeenCalledWith(path, localContent);
  expect(await ctx.state.getFile(path)).toEqual(
    expect.objectContaining({ status: 'synced', version: 4 })
  );
});

test('ambiguous config merge stops after a second conflict', async () => {
  const path = '/.orgnote/config.toml';
  const baseContent = new TextEncoder().encode('[network]\napiUrl = "base"\n');
  const localContent = new TextEncoder().encode('[network]\napiUrl = "local"\n');
  const remoteContent = new TextEncoder().encode('[network]\napiUrl = "remote"\n');
  const baseStore = createBaseStore({
    path,
    version: 2,
    contentHash: 'old-hash',
    content: baseContent,
    updatedAt: '2024-01-01T00:00:00Z',
  });
  const upload = vi.fn()
    .mockResolvedValueOnce({ status: 'conflict' as const, serverVersion: 3 })
    .mockResolvedValueOnce({ status: 'conflict' as const, serverVersion: 4 });
  const ctx = createUploadContext({
    fs: {
      fileInfo: vi.fn(async () => ({ mtime: 100, size: localContent.length })),
      readFile: vi.fn(async () => localContent),
      writeFile: vi.fn(async () => undefined),
    },
    executor: {
      upload,
      fetchContent: vi.fn(async () => remoteContent),
    },
    baseStore,
  });

  await processUpload({ ...LOCAL_FILE, path }, ctx);

  expect(upload).toHaveBeenCalledTimes(2);
  expect(await ctx.state.getFile(path)).toEqual(
    expect.objectContaining({
      status: 'pending',
      version: 4,
      syncedAt: ctx.serverTime,
    })
  );
});

test('upload error stores error status and rethrows', async () => {
  const ctx = createUploadContext({
    fs: {},
    executor: {
      upload: vi.fn(async () => {
        throw new Error('network failure');
      }),
    },
  });

  const previousSyncedAt = '2023-12-01T00:00:00Z';
  await ctx.state.setFile('/note.org', {
    ...LOCAL_FILE,
    version: 1,
    status: 'synced',
    syncedAt: previousSyncedAt,
  });

  await expect(processUpload(LOCAL_FILE, ctx)).rejects.toThrow('network failure');

  const stored = await ctx.state.getFile('/note.org');
  expect(stored?.status).toBe('error');
  expect(stored?.syncedAt).toBe(previousSyncedAt);
  expect(stored?.errorMessage).toContain('network failure');
});
