import type { SyncState, SyncStateData, SyncedFile } from 'orgnote-api';
import { initStore } from '../store/store.js';
import { getLogger } from '../logger.js';

const logger = getLogger();

export const createSyncState = (accountName: string): SyncState => {
  const onRecovery = (corruptedFile: string): void => {
    logger.warn(
      'Corrupted sync state was moved to %s; rebuilding state with a full sync',
      corruptedFile
    );
  };
  const { get, set } = initStore(accountName, onRecovery);

  const getData = (): SyncStateData => {
    const files = get('files') ?? {};
    return { files };
  };

  const saveData = (data: SyncStateData): void => {
    set('files', data.files);
  };

  return {
    get: async () => getData(),

    getFile: async (path: string) => {
      const data = getData();
      return data.files[path] ?? null;
    },

    setFile: async (path: string, file: SyncedFile) => {
      const data = getData();
      data.files[path] = file;
      saveData(data);
    },

    setSyncedAt: async (paths: readonly string[], syncedAt: string) => {
      const data = getData();
      paths.forEach((path) => {
        const file = data.files[path];
        if (file) data.files[path] = { ...file, syncedAt };
      });
      saveData(data);
    },

    removeFile: async (path: string) => {
      const data = getData();
      delete data.files[path];
      saveData(data);
    },

    clear: async () => {
      set('files', {});
    },
  };
};
