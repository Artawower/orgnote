import type { Ref } from 'vue';
import type { SyncState, SyncStateData, SyncedFile } from 'orgnote-api';

const setFilesSyncedAt = (
  files: SyncStateData['files'],
  paths: readonly string[],
  syncedAt: string
): SyncStateData['files'] => {
  const updatedFiles = { ...files };
  paths.forEach((path) => {
    const file = updatedFiles[path];
    if (file) updatedFiles[path] = { ...file, syncedAt };
  });
  return updatedFiles;
};

export const createSyncState = (stateData: Ref<SyncStateData | null>): SyncState => ({
  get: async () => stateData.value ?? { files: {} },

  getFile: async (path: string) => stateData.value?.files[path] ?? null,

  setFile: async (path: string, file: SyncedFile) => {
    stateData.value = {
      ...stateData.value,
      files: { ...stateData.value?.files, [path]: file },
    };
  },

  setSyncedAt: async (paths: readonly string[], syncedAt: string) => {
    if (!stateData.value) return;
    stateData.value = {
      ...stateData.value,
      files: setFilesSyncedAt(stateData.value.files, paths, syncedAt),
    };
  },

  removeFile: async (path: string) => {
    if (!stateData.value) return;
    const { [path]: removed, ...rest } = stateData.value.files;
    void removed;
    stateData.value = { ...stateData.value, files: rest };
  },

  clear: async () => {
    stateData.value = { files: {} };
  },
});
