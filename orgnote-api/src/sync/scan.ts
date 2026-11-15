import type { FileSystem, DiskFile } from '../models/file-system';
import type { LocalFile, SyncStateData } from './types';
import { toAbsolutePath, toRelativePath } from '../utils/to-absolute-path';
import picomatch from 'picomatch';
import { isSyncConflictPath } from './conflict-path';

const DEFAULT_IGNORE_PATTERNS = [
  '.git',
  '.jj',
  '.hg',
  '.svn',
  '.DS_Store',
  'node_modules',
  '.sync-state',
  '.Trash',
  '.orgnote/extensions/**',
];

type IgnoreMatcher = (input: string) => boolean;
type ShouldIgnorePath = (path: string) => boolean;

const compileMatchers = (patterns: string[]): IgnoreMatcher[] =>
  patterns.map((pattern) => picomatch(pattern, { dot: true }));

export const createSyncPathIgnore = (
  ignorePatterns: string[] = []
): ShouldIgnorePath => {
  const matchers = compileMatchers([...DEFAULT_IGNORE_PATTERNS, ...ignorePatterns]);

  return (path: string): boolean => {
    const relativePath = toRelativePath(path);
    const name = relativePath.split('/').pop() ?? relativePath;
    return isSyncConflictPath(path) || shouldIgnore(name, relativePath, matchers);
  };
};

export async function scanLocalFiles(
  fs: FileSystem,
  rootPath: string,
  ignorePatterns: string[] = []
): Promise<LocalFile[]> {
  return scanDir(fs, rootPath, createSyncPathIgnore(ignorePatterns));
}

async function scanDir(
  fs: FileSystem,
  dirPath: string,
  shouldIgnorePath: ShouldIgnorePath
): Promise<LocalFile[]> {
  const entries = await fs.readDir(dirPath);
  const filteredEntries = entries.filter((entry) => !shouldIgnorePath(entry.path));

  const nestedResults = await Promise.all(
    filteredEntries.map((entry) => processEntry(fs, entry, shouldIgnorePath))
  );

  return nestedResults.flat();
}

async function processEntry(
  fs: FileSystem,
  entry: DiskFile,
  shouldIgnorePath: ShouldIgnorePath
): Promise<LocalFile[]> {
  if (entry.type === 'directory') {
    return scanDir(fs, entry.path, shouldIgnorePath);
  }

  return [toLocalFile(entry)];
}

const toLocalFile = (entry: DiskFile): LocalFile => ({
  path: toAbsolutePath(entry.path),
  mtime: entry.mtime,
  size: entry.size,
});

const shouldIgnore = (
  name: string,
  relativePath: string,
  matchers: IgnoreMatcher[]
): boolean =>
  matchers.some((match) => match(name) || match(relativePath));

export const findDeletedLocally = (
  localFiles: LocalFile[],
  stateData: SyncStateData,
  shouldIgnorePath: ShouldIgnorePath = () => false
): string[] => {
  const localPaths = new Set(localFiles.map((file) => file.path));
  return Object.keys(stateData.files).filter(
    (path) => !localPaths.has(path) && !shouldIgnorePath(path)
  );
};
