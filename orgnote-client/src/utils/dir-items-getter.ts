import Fuse from 'fuse.js';
import type { DiskFile, OrgNoteApi, CompletionSearchResult } from 'orgnote-api';
import { matchesAllowedExtension } from './matches-allowed-extension';
import {
  createFileSearchTraversalPolicy,
  FILE_VISIT_DECISIONS,
  includeAllFilesTraversalPolicy,
  type FileTraversalPolicy,
  type FileVisitDecision,
} from './file-traversal-policy';

export type ReadDirFn = (path: string) => Promise<DiskFile[]>;

export interface WalkDirOptions {
  includeFiles: boolean;
  allowedExtensions?: string[];
  recursive?: boolean;
  traversalPolicy?: FileTraversalPolicy;
}

export interface DirItemsGetterOptions {
  includeFiles?: boolean;
  rootPath?: string;
  allowedExtensions?: string[];
  recursive?: boolean;
  traversalPolicy?: FileTraversalPolicy;
}

interface EvaluatedEntry {
  readonly file: DiskFile;
  readonly decision: FileVisitDecision;
}

const evaluateEntries = (
  files: DiskFile[],
  policy: FileTraversalPolicy,
): EvaluatedEntry[] => files.map((file) => ({ file, decision: policy(file) }));

const shouldIncludeEntry = (
  entry: EvaluatedEntry,
  options: WalkDirOptions,
): boolean => {
  if (entry.decision !== FILE_VISIT_DECISIONS.INCLUDE) return false;
  if (entry.file.type === 'directory') return true;
  return options.includeFiles && matchesAllowedExtension(entry.file.path, options.allowedExtensions);
};

const shouldTraverseEntry = (entry: EvaluatedEntry): boolean =>
  entry.file.type === 'directory' && entry.decision !== FILE_VISIT_DECISIONS.PRUNE;

export const walkDir = async (
  readDir: ReadDirFn,
  path: string,
  options: WalkDirOptions,
): Promise<DiskFile[]> => {
  const traversalPolicy = options.traversalPolicy ?? includeAllFilesTraversalPolicy;
  const entries = evaluateEntries(await readDir(path), traversalPolicy);
  const included = entries.filter((entry) => shouldIncludeEntry(entry, options)).map(({ file }) => file);
  if (options.recursive === false) return included;

  const nestedGroups = await Promise.all(
    entries
      .filter(shouldTraverseEntry)
      .map(({ file }) => walkDir(readDir, file.path, options)),
  );
  return [...included, ...nestedGroups.flat()];
};

const resolveOptions = (
  options: boolean | DirItemsGetterOptions,
): Required<DirItemsGetterOptions> => {
  const resolved = typeof options === 'boolean' ? { includeFiles: options } : options;
  const rootPath = resolved.rootPath ?? '/';
  return {
    includeFiles: resolved.includeFiles ?? false,
    rootPath,
    allowedExtensions: resolved.allowedExtensions ?? [],
    recursive: resolved.recursive ?? true,
    traversalPolicy:
      resolved.traversalPolicy ?? createFileSearchTraversalPolicy(rootPath),
  };
};

export const createDirItemsGetter = (
  api: OrgNoteApi,
  options: boolean | DirItemsGetterOptions = false,
) => {
  let allFiles: DiskFile[] | null = null;
  let fuse: Fuse<DiskFile> | null = null;
  const completion = api.core.useCompletion();
  const resolvedOptions = resolveOptions(options);

  return async (filter: string): Promise<CompletionSearchResult<DiskFile>> => {
    const fs = api.core.useFileSystem();

    if (!allFiles) {
      allFiles = await walkDir(fs.readDir, resolvedOptions.rootPath, {
        includeFiles: resolvedOptions.includeFiles,
        allowedExtensions: resolvedOptions.allowedExtensions,
        recursive: resolvedOptions.recursive,
        traversalPolicy: resolvedOptions.traversalPolicy,
      });
      const threshold = api.core.useConfig().config.completion.fuseThreshold;
      fuse = new Fuse(allFiles, { threshold, keys: ['name', 'path'] });
    }

    const results = filter ? fuse!.search(filter).map((result) => result.item) : allFiles;

    return {
      total: results.length,
      result: results.map((item) => ({
        icon: item.type === 'directory' ? 'sym_o_folder' : 'sym_o_description',
        title: item.type === 'directory' ? `${item.path}/` : item.path,
        data: item,
        commandHandler: (file: DiskFile) => {
          void completion.close(file.type === 'directory' ? `${file.path}/` : file.path);
        },
      })),
    };
  };
};
