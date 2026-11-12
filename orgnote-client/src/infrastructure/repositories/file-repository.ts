import type { FileMeta, FileRepository } from 'orgnote-api';
import { join } from 'orgnote-api';
import { withDexieRecovery } from './dexie-retry';
import { migrator } from './migrator';
import type Dexie from 'dexie';
import type { Collection } from 'dexie';

export const FILE_REPOSITORY_NAME = 'files';
export const FILE_MIGRATIONS = migrator<FileMeta>()
  .v(1)
  .indexes('&id, title, *tags, touchedAt, filePath')
  .build();

export const createFileRepository = (db: Dexie): FileRepository => {
  const store = db.table<FileMeta, string>(FILE_REPOSITORY_NAME);

  const getById = async (id: string): Promise<FileMeta | undefined> => {
    const file = await store.get(id);
    if (file?.deletedAt) return undefined;
    return file;
  };

  const getByIds = async (ids: string[]): Promise<FileMeta[]> => {
    const files = await store.bulkGet(ids);
    return files.filter((f): f is FileMeta => f !== undefined && !f.deletedAt);
  };

  const matchesPath = (f: FileMeta, filePath: string[]): boolean =>
    join(...(f.filePath || [])) === join(...filePath);

  const getByPath = async (filePath: string[]): Promise<FileMeta | undefined> => {
    const file = await store.filter((f) => !f.deletedAt && matchesPath(f, filePath)).first();
    return file;
  };

  const findByPathIncludingDeleted = async (filePath: string[]): Promise<FileMeta | undefined> => {
    return store.filter((f) => matchesPath(f, filePath)).first();
  };

  const isNotDeleted = (f: FileMeta): boolean => !f.deletedAt;

  const hasMatchingTag = (f: FileMeta, tags: string[]): boolean =>
    f.tags?.some((t) => tags.includes(t)) ?? false;

  const applyTagsFilter = (
    collection: Collection<FileMeta, string>,
    tags?: string[],
  ): Collection<FileMeta, string> => {
    if (!tags?.length) return collection;
    return collection.filter((f) => hasMatchingTag(f, tags));
  };

  const getAll = async (options?: {
    limit?: number;
    offset?: number;
    tags?: string[];
  }): Promise<FileMeta[]> => {
    const { limit, offset = 0, tags } = options ?? {};

    const baseCollection = store.orderBy('touchedAt').reverse().filter(isNotDeleted);
    const filtered = applyTagsFilter(baseCollection, tags);
    const withOffset = offset > 0 ? filtered.offset(offset) : filtered;
    const withLimit = limit ? withOffset.limit(limit) : withOffset;

    return withLimit.toArray();
  };

  const mergeWithExisting = (meta: FileMeta, existing: FileMeta): FileMeta => ({
    ...meta,
    id: existing.id,
    createdAt: existing.createdAt,
    backlinks: existing.backlinks,
    deletedAt: undefined,
    touchedAt: meta.touchedAt ?? existing.touchedAt ?? new Date().toISOString(),
  });

  const prepareForInsert = (meta: FileMeta): FileMeta => ({
    ...meta,
    createdAt: meta.createdAt ?? new Date().toISOString(),
    touchedAt: meta.touchedAt ?? new Date().toISOString(),
  });

  const shouldMigrateId = (meta: FileMeta, existing: FileMeta): boolean =>
    Boolean(existing.deletedAt && existing.id !== meta.id);

  const migrateId = async (meta: FileMeta, existing: FileMeta): Promise<void> => {
    const migrated = { ...mergeWithExisting(meta, existing), id: meta.id };
    await db.transaction('rw', store, async () => {
      await store.delete(existing.id);
      await store.put(migrated);
    });
  };

  const save = async (meta: FileMeta): Promise<void> => {
    const existing = await findByPathIncludingDeleted(meta.filePath);
    if (!existing) {
      await store.put(prepareForInsert(meta));
      return;
    }
    if (shouldMigrateId(meta, existing)) {
      await migrateId(meta, existing);
      return;
    }
    await store.put(mergeWithExisting(meta, existing));
  };

  const saveBulk = async (metas: FileMeta[]): Promise<void> => {
    await store.bulkPut(metas);
  };

  const del = async (id: string): Promise<void> => {
    await store.update(id, { deletedAt: new Date().toISOString() });
  };

  const count = async (tags?: string[]): Promise<number> => {
    const baseCollection = store.filter(isNotDeleted);
    const filtered = applyTagsFilter(baseCollection, tags);
    return filtered.count();
  };

  const getTagsStats = async (): Promise<{ tag: string; count: number }[]> => {
    const tagsMap = new Map<string, number>();

    await store
      .filter((f) => !f.deletedAt)
      .each((f) => {
        f.tags?.forEach((tag) => {
          tagsMap.set(tag, (tagsMap.get(tag) ?? 0) + 1);
        });
      });

    return Array.from(tagsMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  };

  const clear = async (): Promise<void> => {
    await store.clear();
  };

  return withDexieRecovery(db, {
    getById,
    getByIds,
    getByPath,
    getAll,
    save,
    saveBulk,
    delete: del,
    count,
    getTagsStats,
    clear,
  });
};
