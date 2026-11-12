import path from 'node:path';
import { readEntryState, walkVaultTree, type VaultEntry, type VaultEntryState, type VaultTree } from './vault-tree';

export type VaultChangeType = 'create' | 'modify' | 'delete';

export interface VaultChange {
  absolutePath: string;
  type: VaultChangeType;
  mtime?: number;
}

export interface VaultChangeTracker {
  ready: Promise<void>;
  resolveChanges: (absolutePath: string) => Promise<VaultChange[]>;
}

interface ResolveContext {
  root: string;
  absolutePath: string;
  state: VaultEntryState;
  knownEntries: VaultTree;
}

interface Resolution {
  changes: VaultChange[];
  addedEntries: VaultTree;
  removedPaths: string[];
}

type EntryResolver = (context: ResolveContext) => Promise<Resolution>;

const EMPTY_RESOLUTION: Resolution = { changes: [], addedEntries: new Map(), removedPaths: [] };

const isDescendantOf = (candidate: string, directory: string): boolean =>
  candidate.startsWith(`${directory}${path.sep}`);

const findKnownDescendants = (knownEntries: VaultTree, directory: string): string[] =>
  [...knownEntries.keys()].filter((knownPath) => isDescendantOf(knownPath, directory));

const findKnownSubtree = (knownEntries: VaultTree, absolutePath: string): string[] => {
  if (knownEntries.get(absolutePath)?.kind !== 'directory') return [absolutePath];
  return [...findKnownDescendants(knownEntries, absolutePath), absolutePath];
};

const isSameEntry = (known: VaultEntry | undefined, current: VaultEntry): boolean =>
  known?.kind === current.kind && known.identity === current.identity;

const isReplacedDirectory = (known: VaultEntry | undefined, current: VaultEntry): boolean =>
  known?.kind === 'directory' &&
  Boolean(known.identity && current.identity) &&
  known.identity !== current.identity;

const toDeletedChanges = (removedPaths: string[]): VaultChange[] =>
  removedPaths.map((absolutePath) => ({ absolutePath, type: 'delete' }));

const toStatedChanges = async (root: string, absolutePaths: string[], type: VaultChangeType): Promise<VaultChange[]> => {
  const states = await Promise.all(absolutePaths.map((absolutePath) => readEntryState(root, absolutePath)));
  return absolutePaths.flatMap((absolutePath, index) => {
    const state = states[index];
    if (!state || state.kind === 'missing') return [];
    return [{ absolutePath, type, mtime: state.mtime }];
  });
};

const resolveMissingEntry: EntryResolver = async ({ absolutePath, knownEntries }) => {
  if (!knownEntries.has(absolutePath)) return EMPTY_RESOLUTION;
  const removedPaths = findKnownSubtree(knownEntries, absolutePath);
  return { changes: toDeletedChanges(removedPaths), addedEntries: new Map(), removedPaths };
};

const resolveFileEntry: EntryResolver = async ({ absolutePath, state, knownEntries }) => {
  const knownKind = knownEntries.get(absolutePath)?.kind;
  const removedPaths = knownKind === 'directory' ? findKnownSubtree(knownEntries, absolutePath) : [];
  const mtime = state.kind === 'missing' ? undefined : state.mtime;
  return {
    changes: [...toDeletedChanges(removedPaths), { absolutePath, type: knownKind === 'file' ? 'modify' : 'create', mtime }],
    addedEntries: new Map([[absolutePath, { kind: 'file' }]]),
    removedPaths,
  };
};

const findFilesInReplacedDirectories = (currentEntries: VaultTree, knownEntries: VaultTree): string[] => {
  const replacedDirectories = new Set(
    [...currentEntries]
      .filter(([entryPath, entry]) => isReplacedDirectory(knownEntries.get(entryPath), entry))
      .map(([entryPath]) => entryPath),
  );
  return [...currentEntries]
    .filter(([entryPath, entry]) => entry.kind === 'file' && knownEntries.get(entryPath)?.kind === 'file')
    .map(([entryPath]) => entryPath)
    .filter((entryPath) => replacedDirectories.has(path.dirname(entryPath)));
};

const readCurrentSubtree = async ({ root, absolutePath, state }: ResolveContext): Promise<VaultTree> => {
  const identity = state.kind === 'directory' ? state.identity : undefined;
  return new Map([[absolutePath, { kind: 'directory', identity }], ...(await walkVaultTree(root, absolutePath))]);
};

const resolveDirectoryEntry: EntryResolver = async (context) => {
  const { root, absolutePath, knownEntries } = context;
  const currentEntries = await readCurrentSubtree(context);
  const knownSubtree = [absolutePath, ...findKnownDescendants(knownEntries, absolutePath)].filter((knownPath) =>
    knownEntries.has(knownPath),
  );
  const removedPaths = knownSubtree.filter(
    (knownPath) => currentEntries.get(knownPath)?.kind !== knownEntries.get(knownPath)?.kind,
  );
  const createdPaths = [...currentEntries]
    .filter(([entryPath, entry]) => knownEntries.get(entryPath)?.kind !== entry.kind)
    .map(([entryPath]) => entryPath);
  const changes = [
    ...toDeletedChanges(removedPaths),
    ...(await toStatedChanges(root, createdPaths, 'create')),
    ...(await toStatedChanges(root, findFilesInReplacedDirectories(currentEntries, knownEntries), 'modify')),
  ];
  const addedEntries: VaultTree = new Map(
    [...currentEntries].filter(([entryPath, entry]) => !isSameEntry(knownEntries.get(entryPath), entry)),
  );
  return { changes, addedEntries, removedPaths };
};

const ENTRY_RESOLVERS: Record<VaultEntryState['kind'], EntryResolver> = {
  missing: resolveMissingEntry,
  file: resolveFileEntry,
  directory: resolveDirectoryEntry,
};

const applyResolution = (knownEntries: VaultTree, { addedEntries, removedPaths }: Resolution): void => {
  removedPaths.forEach((removedPath) => knownEntries.delete(removedPath));
  addedEntries.forEach((entry, entryPath) => knownEntries.set(entryPath, entry));
};

const ignoreOutcome = (): void => undefined;

/**
 * Turns settled native watch paths into file-level changes. Resolutions run
 * one at a time against a snapshot of known vault entries, and the snapshot
 * changes only after a resolution fully succeeds, so a failed path is
 * resolved again on its next event. The snapshot distinguishes create from
 * modify, reports a kind change as delete plus create, and reconciles
 * directories, because the native watcher may report only a moved or
 * replaced directory and not its nested entries. Directory identities
 * (device and inode) reveal a directory replaced under the same name, whose
 * files are then reported as modified.
 */
export const createVaultChangeTracker = (root: string): VaultChangeTracker => {
  const knownEntriesReady = walkVaultTree(root, root);
  let resolutionQueue: Promise<unknown> = knownEntriesReady;

  const resolveNow = async (absolutePath: string): Promise<VaultChange[]> => {
    const knownEntries = await knownEntriesReady;
    const state = await readEntryState(root, absolutePath);
    const resolution = await ENTRY_RESOLVERS[state.kind]({ root, absolutePath, state, knownEntries });
    applyResolution(knownEntries, resolution);
    return resolution.changes;
  };

  const resolveChanges = (absolutePath: string): Promise<VaultChange[]> => {
    const resolution = resolutionQueue.then(() => resolveNow(absolutePath));
    resolutionQueue = resolution.then(ignoreOutcome, ignoreOutcome);
    return resolution;
  };

  return { ready: knownEntriesReady.then(ignoreOutcome), resolveChanges };
};
