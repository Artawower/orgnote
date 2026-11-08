import type Dexie from 'dexie';
import type { BaseContentEntry, BaseContentStore } from 'orgnote-api';
import { withDexieRecovery } from '../repositories/dexie-retry';
import { migrator } from '../repositories/migrator';
import { getDatabase } from '../repositories';

interface BaseContentRow {
  path: string;
  version: number;
  contentHash: string;
  content: Uint8Array;
  updatedAt: string;
}

export const BASE_CONTENT_STORE_NAME = 'baseContent';
export const BASE_CONTENT_MIGRATIONS = migrator<BaseContentRow>().v(1).indexes('&path').build();

export const createBaseContentStore = (db: Dexie): BaseContentStore => {
  const table = db.table<BaseContentRow, string>(BASE_CONTENT_STORE_NAME);

  const get = async (path: string): Promise<BaseContentEntry | null> => {
    const entry = await table.get(path);
    if (!entry) return null;

    return {
      path: entry.path,
      version: entry.version,
      contentHash: entry.contentHash,
      content: entry.content,
      updatedAt: entry.updatedAt,
    };
  };

  const set = async (path: string, entry: BaseContentEntry): Promise<void> => {
    await table.put({
      path,
      version: entry.version,
      contentHash: entry.contentHash,
      content: entry.content,
      updatedAt: entry.updatedAt,
    });
  };

  const remove = async (path: string): Promise<void> => {
    await table.delete(path);
  };

  return withDexieRecovery(db, { get, set, remove });
};

export const getBaseContentStore = (): BaseContentStore | null => {
  const db = getDatabase();
  if (!db) return null;
  return createBaseContentStore(db);
};
