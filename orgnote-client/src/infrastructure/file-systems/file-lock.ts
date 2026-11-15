import { createKeyedLock } from 'orgnote-api/utils';

const fileLock = createKeyedLock();

const resolveSegment = (segments: readonly string[], segment: string): string[] => {
  if (!segment || segment === '.') return [...segments];
  if (segment === '..') return segments.slice(0, -1);
  return [...segments, segment];
};

export const toFileLockKey = (path: string): string =>
  `/${path.split('/').reduce<string[]>(resolveSegment, []).join('/')}`;

export const runExclusiveForFile = <T>(path: string, operation: () => Promise<T>): Promise<T> =>
  fileLock.runExclusive(toFileLockKey(path), operation);

export const runExclusiveForTrees = <T>(
  paths: readonly string[],
  operation: () => Promise<T>,
): Promise<T> => fileLock.runExclusiveTree(paths.map(toFileLockKey), operation);
