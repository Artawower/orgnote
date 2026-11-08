import type { FileSystem } from '../models/file-system';
import type { CreateSyncPlanParams, LocalFile, SyncPlan } from './types';
import { createSyncPathIgnore, scanLocalFiles, findDeletedLocally } from './scan';
import { fetchRemoteChanges } from './fetch';
import { createPlan } from './plan';
import { getOldestSyncedAt } from './utils/oldest-synced-at';
import { hashContent } from './utils/content-hash';

const enrichLocalFilesWithHash = async (
  fs: FileSystem,
  localFiles: LocalFile[]
): Promise<LocalFile[]> => {
  const hashResults = await Promise.allSettled(
    localFiles.map(async (file) => {
      const content = await fs.readFile(file.path, 'binary');

      return {
        ...file,
        contentHash: await hashContent(content),
      };
    })
  );

  return hashResults.map((result, index) =>
    result.status === 'fulfilled' ? result.value : localFiles[index]
  );
};

export async function createSyncPlan(
  params: CreateSyncPlanParams
): Promise<SyncPlan> {
  const { fs, api, state, rootPath, ignorePatterns, enableContentHashCheck } =
    params;

  const stateData = await state.get();
  const shouldIgnorePath = createSyncPathIgnore(ignorePatterns);

  const localFiles = await scanLocalFiles(fs, rootPath, ignorePatterns);
  const localFilesWithHashes = enableContentHashCheck
    ? await enrichLocalFilesWithHash(fs, localFiles)
    : localFiles;
  const deletedLocally = findDeletedLocally(
    localFilesWithHashes,
    stateData,
    shouldIgnorePath
  );

  const since = getOldestSyncedAt(stateData, shouldIgnorePath);

  const { files: fetchedRemoteFiles, serverTime } = await fetchRemoteChanges(
    api,
    since
  );
  const remoteFiles = fetchedRemoteFiles.filter(
    (file) => !shouldIgnorePath(file.path)
  );

  const plan = createPlan({
    localFiles: localFilesWithHashes,
    deletedLocally,
    remoteFiles,
    stateData,
    serverTime,
  });

  await state.setSyncedAt(plan.unchangedPaths, serverTime);
  return plan;
}
