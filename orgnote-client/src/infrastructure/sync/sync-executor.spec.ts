import { expect, test, vi } from 'vitest';
import { hashContent, type FileSystem, type LocalFile, type RemoteFile } from 'orgnote-api';
import { createSyncExecutor } from './sync-executor';

const mocks = vi.hoisted(() => ({
  syncFilesPut: vi.fn(async () => ({
    data: {
      data: {
        version: 2,
      },
    },
  })),
  syncFilesGet: vi.fn(),
  syncFilesDelete: vi.fn(async () => undefined),
}));

vi.mock('src/boot/axios', () => ({
  sdk: {
    sync: {
      syncFilesPut: mocks.syncFilesPut,
      syncFilesGet: mocks.syncFilesGet,
      syncFilesDelete: mocks.syncFilesDelete,
    },
  },
}));

const createFileSystem = (content: Uint8Array): FileSystem =>
  ({
    readFile: vi.fn(async () => content),
  }) as unknown as FileSystem;

const createLocalFile = (): LocalFile => ({
  path: '/agenda/inbox.org',
  mtime: 1,
  size: 3,
  contentHash: 'stale-plan-hash',
});

const createRemoteFile = (): RemoteFile => ({
  path: '/.orgnote/config.toml',
  version: 2,
  deleted: false,
  updatedAt: '2024-01-01T00:00:00Z',
});

const createDownloadResponse = async (content: Uint8Array, hasContentHash = true) => ({
  data: content.buffer,
  status: 200,
  headers: {
    'content-type': 'application/octet-stream',
    ...(hasContentHash ? { 'x-content-hash': await hashContent(content) } : {}),
  },
});

test('createSyncExecutor upload sends hash for the uploaded bytes', async () => {
  const content = new TextEncoder().encode('abc');
  const fs = createFileSystem(content);
  const executor = createSyncExecutor(fs);

  await executor.upload(createLocalFile(), 1);

  expect(mocks.syncFilesPut).toHaveBeenCalledWith(
    '/agenda/inbox.org',
    expect.any(File),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    1,
  );
});

test('createSyncExecutor fetchContent returns bytes without writing the file', async () => {
  const content = new TextEncoder().encode('remote');
  const fs = {
    writeFile: vi.fn(async () => undefined),
  } as unknown as FileSystem;
  mocks.syncFilesGet.mockResolvedValue(await createDownloadResponse(content));
  const executor = createSyncExecutor(fs);

  const result = await executor.fetchContent?.(createRemoteFile());

  expect(result).toEqual(content);
  expect(fs.writeFile).not.toHaveBeenCalled();
});

test('createSyncExecutor rejects response without content hash before writing locally', async () => {
  const content = new TextEncoder().encode(
    '<!doctype html><html><head><title>orgnote</title></head></html>',
  );
  const fs = { writeFile: vi.fn(async () => undefined) } as unknown as FileSystem;
  mocks.syncFilesGet.mockResolvedValue(await createDownloadResponse(content, false));
  const executor = createSyncExecutor(fs);

  await expect(executor.download(createRemoteFile())).rejects.toMatchObject({
    name: 'InvalidSyncFileResponseError',
  });
  expect(fs.writeFile).not.toHaveBeenCalled();
});

test('createSyncExecutor returns successful remote deletion result', async () => {
  const executor = createSyncExecutor({} as FileSystem);

  const result = await executor.deleteRemote('/notes/deleted.org', 8);

  expect(result).toEqual({ status: 'ok' });
  expect(mocks.syncFilesDelete).toHaveBeenCalledWith('/notes/deleted.org', 8);
});

test('createSyncExecutor returns current server version after delete conflict', async () => {
  const conflict = Object.assign(new Error('Version mismatch'), {
    isAxiosError: true,
    response: { status: 409, data: { serverVersion: 9 } },
  });
  mocks.syncFilesDelete.mockRejectedValueOnce(conflict);
  const executor = createSyncExecutor({} as FileSystem);

  const result = await executor.deleteRemote('/notes/deleted.org', 8);

  expect(result).toEqual({ status: 'conflict', serverVersion: 9 });
});

test('createSyncExecutor writes validated remote content', async () => {
  const content = new TextEncoder().encode('remote');
  const remoteFile = createRemoteFile();
  const writeFile = vi.fn(async () => undefined);
  const fs = { writeFile } as unknown as FileSystem;
  mocks.syncFilesGet.mockResolvedValue(await createDownloadResponse(content));
  const executor = createSyncExecutor(fs);

  const result = await executor.download(remoteFile);

  expect(result).toEqual(content);
  expect(writeFile).toHaveBeenCalledWith(remoteFile.path, content);
});
