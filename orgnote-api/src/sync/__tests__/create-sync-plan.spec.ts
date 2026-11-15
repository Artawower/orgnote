import { expect, test, vi } from 'vitest';
import type { DiskFile, FileSystem } from '../../models/file-system';
import { createMemorySyncState } from '../memory-state';
import { createSyncPlan } from '../create-sync-plan';
import type { RemoteFile, SyncApi } from '../types';

const createSyncApiMock = (changes: RemoteFile[] = []): SyncApi => {
  const syncChangesGet = vi.fn(async () => ({
    data: {
      data: {
        changes,
        hasMore: false,
        serverTime: '2024-01-01T00:00:00Z',
      },
    },
  }));

  return { syncChangesGet } as unknown as SyncApi;
};

const createFsMock = (
  entries: DiskFile[],
  readFileImpl: (
    path: string,
    encoding?: 'utf8' | 'binary'
  ) => Promise<Uint8Array>
): FileSystem => {
  const readFile = vi.fn(readFileImpl);

  return {
    readDir: vi.fn(async () => entries),
    readFile,
  } as unknown as FileSystem;
};

test('createSyncPlan falls back to original file when hash read fails', async () => {
  const fs = createFsMock(
    [{ name: 'a.org', path: '/a.org', type: 'file', size: 10, mtime: 10 }],
    async () => {
      throw new Error('file locked');
    }
  );
  const api = createSyncApiMock();
  const state = createMemorySyncState();

  const plan = await createSyncPlan({
    fs,
    api,
    state,
    rootPath: '/',
    enableContentHashCheck: true,
  });

  expect(plan.toUpload).toHaveLength(1);
  expect(plan.toUpload[0].path).toBe('/a.org');
  expect(plan.toUpload[0].contentHash).toBeUndefined();
});

test('createSyncPlan skips hashing when enableContentHashCheck is false', async () => {
  const fs = createFsMock(
    [{ name: 'a.org', path: '/a.org', type: 'file', size: 10, mtime: 10 }],
    async () => {
      throw new Error('must not be called');
    }
  );
  const api = createSyncApiMock();
  const state = createMemorySyncState();

  const plan = await createSyncPlan({
    fs,
    api,
    state,
    rootPath: '/',
    enableContentHashCheck: false,
  });

  expect(plan.toUpload).toHaveLength(1);
  expect(fs.readFile).toHaveBeenCalledTimes(0);
});

test('createSyncPlan advances only unchanged file syncedAt', async () => {
  const oldSyncedAt = '2023-12-01T00:00:00Z';
  const fs = createFsMock(
    [
      { name: 'a.org', path: '/a.org', type: 'file', size: 10, mtime: 10 },
      { name: 'b.org', path: '/b.org', type: 'file', size: 10, mtime: 20 },
    ],
    async () => new Uint8Array()
  );
  const state = createMemorySyncState({
    files: {
      '/a.org': {
        mtime: 10,
        size: 10,
        version: 1,
        status: 'synced',
        syncedAt: oldSyncedAt,
      },
      '/b.org': {
        mtime: 10,
        size: 10,
        version: 1,
        status: 'synced',
        syncedAt: oldSyncedAt,
      },
    },
  });

  const plan = await createSyncPlan({
    fs,
    api: createSyncApiMock(),
    state,
    rootPath: '/',
  });

  expect(plan.toUpload.map(({ path }) => path)).toEqual(['/b.org']);
  expect((await state.getFile('/a.org'))?.syncedAt).toBe(
    '2024-01-01T00:00:00Z'
  );
  expect((await state.getFile('/b.org'))?.syncedAt).toBe(oldSyncedAt);
});

test('createSyncPlan ignores local extension runtime files', async () => {
  const fs = createFsMock(
    [
      {
        name: 'extensions',
        path: '/.orgnote/extensions',
        type: 'directory',
        size: 0,
        mtime: 10,
      },
    ],
    async () => new Uint8Array(),
  );

  const plan = await createSyncPlan({
    fs,
    api: createSyncApiMock(),
    state: createMemorySyncState(),
    rootPath: '/',
  });

  expect(plan.toUpload).toHaveLength(0);
  expect(fs.readDir).toHaveBeenCalledTimes(1);
});

test('createSyncPlan ignores remote extension runtime files', async () => {
  const extensionPath = '/.orgnote/extensions/drawing-viewer/1.0.0/index.js';
  const remoteFile: RemoteFile = {
    path: extensionPath,
    version: 1,
    deleted: false,
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const plan = await createSyncPlan({
    fs: createFsMock([], async () => new Uint8Array()),
    api: createSyncApiMock([remoteFile]),
    state: createMemorySyncState(),
    rootPath: '/',
  });

  expect(plan.toDownload).toHaveLength(0);
});

test('createSyncPlan ignores local conflict artifacts', async () => {
  const conflictPath = '/note.sync-conflict-100-device.org';
  const fs = createFsMock(
    [{ name: 'note.sync-conflict-100-device.org', path: conflictPath, type: 'file', size: 10, mtime: 10 }],
    async () => new Uint8Array()
  );

  const plan = await createSyncPlan({
    fs,
    api: createSyncApiMock(),
    state: createMemorySyncState(),
    rootPath: '/',
  });

  expect(plan.toUpload).toHaveLength(0);
});

test('createSyncPlan ignores remote conflict artifacts', async () => {
  const conflictPath = '/note.sync-conflict-100-device.org';
  const fs = createFsMock([], async () => new Uint8Array());
  const remoteFile: RemoteFile = {
    path: conflictPath,
    version: 2,
    deleted: false,
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const plan = await createSyncPlan({
    fs,
    api: createSyncApiMock([remoteFile]),
    state: createMemorySyncState(),
    rootPath: '/',
  });

  expect(plan.toDownload).toHaveLength(0);
});

test('createSyncPlan does not delete tracked conflict artifacts remotely', async () => {
  const conflictPath = '/note.sync-conflict-100-device.org';
  const fs = createFsMock([], async () => new Uint8Array());
  const state = createMemorySyncState();
  await state.setFile(conflictPath, {
    mtime: 10,
    size: 10,
    version: 1,
    status: 'synced',
  });

  const plan = await createSyncPlan({
    fs,
    api: createSyncApiMock(),
    state,
    rootPath: '/',
  });

  expect(plan.toDeleteRemote).toHaveLength(0);
});
