import { defineStorageBoundStore } from 'src/infrastructure/stores/storage-bound-store';
import type { FileMeta, FileMetaStore } from 'orgnote-api';
import { isPresent } from 'orgnote-api/utils';
import { repositories } from 'src/boot/repositories';

let countCache: number | null = null;

export const invalidateCountCache = (): void => {
  countCache = null;
};

export const useFileMetaStore = defineStorageBoundStore<'file-meta', FileMetaStore>('file-meta', () => {
  const getById = async (id: string): Promise<FileMeta | undefined> => {
    return repositories.fileRepository.getById(id);
  };

  const getByIds = async (ids: string[]): Promise<FileMeta[]> => {
    return repositories.fileRepository.getByIds(ids);
  };

  const getByPath = async (filePath: string[]): Promise<FileMeta | undefined> => {
    return repositories.fileRepository.getByPath(filePath);
  };

  const getAll = async (options?: {
    limit?: number;
    offset?: number;
    tags?: string[];
  }): Promise<FileMeta[]> => {
    return repositories.fileRepository.getAll(options);
  };

  const count = async (tags?: string[]): Promise<number> => {
    if (!tags && isPresent(countCache)) return countCache;
    const result = await repositories.fileRepository.count(tags);
    if (!tags) countCache = result;
    return result;
  };

  const getTagsStats = async (): Promise<{ tag: string; count: number }[]> => {
    return repositories.fileRepository.getTagsStats();
  };

  const save = async (meta: FileMeta): Promise<void> => {
    invalidateCountCache();
    await repositories.fileRepository.save(meta);
  };

  const saveBulk = async (metas: FileMeta[]): Promise<void> => {
    invalidateCountCache();
    await repositories.fileRepository.saveBulk(metas);
  };

  const resolveFileId = async (
    target: { id: string } | { path: string[] },
  ): Promise<string | undefined> => {
    if ('id' in target) return target.id;
    const file = await getByPath(target.path);
    return file?.id;
  };

  const deleteFile = async (target: { id: string } | { path: string[] }): Promise<void> => {
    invalidateCountCache();
    const id = await resolveFileId(target);
    if (!id) return;
    await repositories.fileRepository.delete(id);
  };

  const clear = async (): Promise<void> => {
    invalidateCountCache();
    await repositories?.fileRepository?.clear();
  };

  return {
    getById,
    getByIds,
    getByPath,
    getAll,
    count,
    getTagsStats,
    save,
    saveBulk,
    delete: deleteFile,
    clear,
    $resetStorage: clear,
  };
});
