import type { BigIntStats, Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export type VaultEntryKind = 'file' | 'directory';

export interface VaultEntry {
  kind: VaultEntryKind;
  identity?: string;
}

export type VaultEntryState = { kind: 'missing' } | (VaultEntry & { mtime: number });

export type VaultTree = Map<string, VaultEntry>;

const MISSING_ENTRY_CODES = new Set(['ENOENT', 'ENOTDIR']);
const UNKNOWN_INODE = 0n;

const isMissingEntryError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && MISSING_ENTRY_CODES.has(String(error.code));

const ignoreMissingEntry = (error: unknown): undefined => {
  if (isMissingEntryError(error)) return undefined;
  throw error;
};

export const isPathInsideRoot = (root: string, candidate: string): boolean => {
  const relativePath = path.relative(root, candidate);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
};

/**
 * Some filesystems (FAT, several network and FUSE mounts) report inode 0,
 * which cannot tell a replaced directory from the original one.
 */
const toDirectoryIdentity = (stat: BigIntStats): string | undefined => {
  if (!stat.isDirectory() || stat.ino === UNKNOWN_INODE) return undefined;
  return `${stat.dev}:${stat.ino}`;
};

/**
 * Reads an entry without following symlinks into it: a link that resolves
 * outside the vault is reported as missing, any other link is a leaf file.
 */
export const readEntryState = async (root: string, absolutePath: string): Promise<VaultEntryState> => {
  const realPath = await fs.realpath(absolutePath).catch(ignoreMissingEntry);
  if (!realPath || !isPathInsideRoot(root, realPath)) return { kind: 'missing' };
  const stat = await fs.lstat(absolutePath, { bigint: true }).catch(ignoreMissingEntry);
  if (!stat) return { kind: 'missing' };
  return {
    kind: stat.isDirectory() ? 'directory' : 'file',
    identity: toDirectoryIdentity(stat),
    mtime: Number(stat.mtimeMs),
  };
};

const isPlainFile = (entry: Dirent): boolean => !entry.isDirectory() && !entry.isSymbolicLink();

const collectEntry = async (root: string, entryPath: string, entry: Dirent, tree: VaultTree): Promise<void> => {
  if (isPlainFile(entry)) {
    tree.set(entryPath, { kind: 'file' });
    return;
  }
  const state = await readEntryState(root, entryPath);
  if (state.kind === 'missing') return;
  tree.set(entryPath, { kind: state.kind, identity: state.identity });
  if (state.kind === 'directory') await collectDirectory(root, entryPath, tree);
};

const collectDirectory = async (root: string, directory: string, tree: VaultTree): Promise<void> => {
  const entries = (await fs.readdir(directory, { withFileTypes: true }).catch(ignoreMissingEntry)) ?? [];
  await Promise.all(entries.map((entry) => collectEntry(root, path.join(directory, entry.name), entry, tree)));
};

/**
 * Lists every entry below the directory. Each directory is re-checked with
 * realpath and lstat right before descending, so the walk does not follow a
 * directory swapped for a symlink after its parent was listed.
 */
export const walkVaultTree = async (root: string, directory: string): Promise<VaultTree> => {
  const tree: VaultTree = new Map();
  await collectDirectory(root, directory, tree);
  return tree;
};
