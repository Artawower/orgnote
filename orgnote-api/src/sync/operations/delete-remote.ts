import type { SyncContext, SyncedFile } from '../types';

const isNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return error.message.includes('404') || error.message.includes('not found');
};

const createPendingFile = (stored: SyncedFile | null): SyncedFile => {
  if (!stored) return { mtime: 0, size: 0, version: 0, status: 'pending' };
  const { syncedAt, errorMessage, ...file } = stored;
  void syncedAt;
  void errorMessage;
  return { ...file, status: 'pending' };
};

const invalidateStaleState = async (
  path: string,
  stored: SyncedFile | null,
  ctx: SyncContext
): Promise<void> => {
  await ctx.state.setFile(path, createPendingFile(stored));
};

export const processDeleteRemote = async (path: string, ctx: SyncContext): Promise<void> => {
  const stored = await ctx.state.getFile(path);

  try {
    const result = await ctx.executor.deleteRemote(path, stored?.version ?? 0);
    if (result.status === 'conflict') {
      await invalidateStaleState(path, stored, ctx);
      return;
    }

    await ctx.state.removeFile(path);
    await removeBaseStoreEntry(path, ctx);
  } catch (error) {
    if (isNotFoundError(error)) {
      await ctx.state.removeFile(path);
      await removeBaseStoreEntry(path, ctx);
      return;
    }

    if (stored) {
      await ctx.state.setFile(path, {
        ...stored,
        status: 'error',
        errorMessage: String(error),
      });
    }
    throw error;
  }
};

const removeBaseStoreEntry = async (
  path: string,
  ctx: SyncContext
): Promise<void> => {
  if (!ctx.baseStore) return;

  await ctx.baseStore.remove(path);
};
