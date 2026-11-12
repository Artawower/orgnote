import type { SyncContext } from '../types';

export const processDeleteLocal = async (path: string, ctx: SyncContext): Promise<void> => {
  try {
    await ctx.fs.deleteFile(path);
    await ctx.state.removeFile(path);
    await removeBaseStoreEntry(path, ctx);
  } catch (error) {
    const stored = await ctx.state.getFile(path);
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
