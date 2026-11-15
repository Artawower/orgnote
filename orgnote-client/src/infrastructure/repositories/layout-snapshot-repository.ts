import type Dexie from 'dexie';
import { withDexieRecovery } from './dexie-retry';
import { migrator } from './migrator';
import type { LayoutSnapshot, LayoutSnapshotRepository, StoredLayoutSnapshot } from 'orgnote-api';

export const PANE_SNAPSHOT_REPOSITORY_NAME = 'paneSnapshots';
export const PANE_SNAPSHOT_MIGRATIONS = migrator<StoredLayoutSnapshot>()
  .v(1)
  .indexes('&id,createdAt')
  .build();

const AUTOSAVE_ID = '__autosave__';

const isUserSnapshot = (snapshot: StoredLayoutSnapshot): boolean => snapshot.id !== AUTOSAVE_ID;

export const createLayoutSnapshotRepository = (db: Dexie): LayoutSnapshotRepository => {
  const store = db.table<StoredLayoutSnapshot, string>(PANE_SNAPSHOT_REPOSITORY_NAME);

  const list = async (limit?: number): Promise<StoredLayoutSnapshot[]> => {
    const all = await store.orderBy('createdAt').reverse().toArray();
    const userSnapshots = all.filter(isUserSnapshot);
    if (!limit || limit <= 0) return userSnapshots;
    return userSnapshots.slice(0, limit);
  };

  const save = async (snapshot: LayoutSnapshot, id?: string): Promise<void> => {
    const record: StoredLayoutSnapshot = {
      id: id ?? AUTOSAVE_ID,
      createdAt: new Date().toISOString(),
      snapshot,
    };
    await store.put(record);
  };

  const get = async (id: string): Promise<StoredLayoutSnapshot | undefined> => store.get(id);

  const getLatest = async (): Promise<StoredLayoutSnapshot | undefined> => store.get(AUTOSAVE_ID);

  const remove = async (id: string): Promise<void> => {
    await store.delete(id);
  };

  const clear = async (): Promise<void> => {
    await store.clear();
  };

  return withDexieRecovery(db, {
    save,
    get,
    getLatest,
    list,
    delete: remove,
    clear,
  });
};
