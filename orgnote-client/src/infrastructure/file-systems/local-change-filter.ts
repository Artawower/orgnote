import type { FileSystemChange } from 'orgnote-api';

const UNVERSIONED_CHANGE_TTL_MS = 500;
const VERSIONED_CHANGE_TTL_MS = 30_000;

const toWholeMilliseconds = (mtime?: number): string =>
  mtime === undefined ? '' : String(Math.trunc(mtime));

const createChangeSignature =(change: FileSystemChange): string =>
  [change.type, change.path, change.previousPath ?? '', toWholeMilliseconds(change.mtime)].join('\u0000');

const getTtl = (change: FileSystemChange): number =>
  change.mtime === undefined ? UNVERSIONED_CHANGE_TTL_MS : VERSIONED_CHANGE_TTL_MS;

export const createLocalChangeFilter = (now: () => number = Date.now) => {
  const expiresAt = new Map<string, number>();

  const prune = (time: number): void => {
    [...expiresAt]
      .filter(([, expiry]) => expiry < time)
      .forEach(([signature]) => expiresAt.delete(signature));
  };

  const remember = (change: FileSystemChange): void => {
    const time = now();
    prune(time);
    expiresAt.set(createChangeSignature(change), time + getTtl(change));
  };

  const isDuplicate = (change: FileSystemChange): boolean => {
    prune(now());
    return expiresAt.has(createChangeSignature(change));
  };

  const clear = (): void => expiresAt.clear();

  return { remember, isDuplicate, clear };
};
