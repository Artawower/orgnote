import type { SyncStateData } from '../types';

type ShouldIgnorePath = (path: string) => boolean;

const isTimestamp = (value: string | undefined): value is string =>
  Boolean(value);

export const getOldestSyncedAt = (
  stateData: SyncStateData,
  shouldIgnorePath: ShouldIgnorePath = () => false
): string | undefined => {
  const trackedFiles = Object.entries(stateData.files).filter(
    ([path]) => !shouldIgnorePath(path)
  );
  if (trackedFiles.length === 0) return undefined;

  const syncedTimes = trackedFiles.map(([, file]) => file.syncedAt);
  if (!syncedTimes.every(isTimestamp)) return undefined;

  return syncedTimes.reduce((oldest, current) =>
    new Date(current) < new Date(oldest) ? current : oldest
  );
};
