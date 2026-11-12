import { expect, test, vi } from 'vitest';
import type { BaseContentStore, SyncExecutor, SyncedFile } from '../../types';
import { processDeleteRemote } from '../delete-remote';
import { createContext } from './fixtures';

const path = '/notes/deleted.org';

const syncedFile: SyncedFile = {
  mtime: 100,
  size: 10,
  contentHash: 'hash-8',
  version: 8,
  status: 'synced',
  syncedAt: '2026-07-25T10:00:00Z',
};

const createBaseStore = () =>
  ({
    remove: vi.fn(async () => undefined),
  }) as unknown as BaseContentStore;

test('processDeleteRemote removes sync state after successful deletion', async () => {
  const deleteRemote = vi.fn(async () => ({ status: 'ok' as const }));
  const baseStore = createBaseStore();
  const ctx = {
    ...createContext({ fs: {} as never, executor: { deleteRemote } as unknown as SyncExecutor }),
    baseStore,
  };
  await ctx.state.setFile(path, syncedFile);

  await processDeleteRemote(path, ctx);

  expect(deleteRemote).toHaveBeenCalledWith(path, 8);
  expect(await ctx.state.getFile(path)).toBeNull();
  expect(baseStore.remove).toHaveBeenCalledWith(path);
});

test('processDeleteRemote creates invalidated state when conflict has no local metadata', async () => {
  const deleteRemote = vi.fn(async () => ({
    status: 'conflict' as const,
    serverVersion: 9,
  }));
  const ctx = createContext({
    fs: {} as never,
    executor: { deleteRemote } as unknown as SyncExecutor,
  });

  await processDeleteRemote(path, ctx);

  expect(await ctx.state.getFile(path)).toEqual({
    mtime: 0,
    size: 0,
    version: 0,
    status: 'pending',
  });
});

test('processDeleteRemote invalidates stale state after version conflict', async () => {
  const deleteRemote = vi.fn(async () => ({
    status: 'conflict' as const,
    serverVersion: 9,
  }));
  const baseStore = createBaseStore();
  const ctx = {
    ...createContext({ fs: {} as never, executor: { deleteRemote } as unknown as SyncExecutor }),
    baseStore,
  };
  await ctx.state.setFile(path, syncedFile);

  await processDeleteRemote(path, ctx);

  expect(await ctx.state.getFile(path)).toEqual({
    mtime: 100,
    size: 10,
    contentHash: 'hash-8',
    version: 8,
    status: 'pending',
  });
  expect(baseStore.remove).not.toHaveBeenCalled();
});
