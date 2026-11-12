import type Dexie from 'dexie';
import type { KeyValueRepository } from 'orgnote-api';
import { withDexieRecovery } from './dexie-retry';
import { migrator } from './migrator';

interface KeyValueEntry {
  key: string;
  value: string;
}

export const KEY_VALUE_REPOSITORY_NAME = 'keyValue';
export const KEY_VALUE_MIGRATIONS = migrator<KeyValueEntry>().v(1).indexes('&key').build();

export const createKeyValueRepository = (db: Dexie): KeyValueRepository => {
  const store = db.table<KeyValueEntry, string>(KEY_VALUE_REPOSITORY_NAME);

  const get = async (key: string): Promise<string | undefined> => {
    const entry = await store.get(key);
    return entry?.value;
  };

  const set = async (key: string, value: string): Promise<void> => {
    await store.put({ key, value });
  };

  const del = async (key: string): Promise<void> => {
    await store.delete(key);
  };

  const clear = async (): Promise<void> => {
    await store.clear();
  };

  return withDexieRecovery(db, {
    get,
    set,
    delete: del,
    clear,
  });
};
