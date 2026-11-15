import fs from 'node:fs';
import path from 'node:path';

const VAULT_WATCHER_ERROR_MESSAGE = 'Vault watcher error:';
const VAULT_CHANGE_SETTLE_DELAY = 100;

export interface VaultWatcherOptions {
  root: string;
  onPathSettled: (absolutePath: string) => void;
}

export interface VaultWatcher {
  close: () => void;
}

/**
 * Watches the whole vault through a single recursive native handle
 * (FSEvents on macOS, ReadDirectoryChangesW on Windows) instead of one
 * file descriptor per file, which exhausts the process limit on large vaults.
 * Events are reported per path once it stays quiet for the settle delay,
 * so partial writes and atomic saves surface as one final state.
 */
export const createVaultWatcher = ({ root, onPathSettled }: VaultWatcherOptions): VaultWatcher => {
  const pendingPaths = new Map<string, ReturnType<typeof setTimeout>>();

  const settlePath = (absolutePath: string): void => {
    pendingPaths.delete(absolutePath);
    onPathSettled(absolutePath);
  };

  const schedulePath = (absolutePath: string): void => {
    clearTimeout(pendingPaths.get(absolutePath));
    pendingPaths.set(absolutePath, setTimeout(() => settlePath(absolutePath), VAULT_CHANGE_SETTLE_DELAY));
  };

  const watcher = fs.watch(root, { recursive: true }, (_eventType, fileName) => {
    if (!fileName) return;
    schedulePath(path.join(root, fileName.toString()));
  });
  watcher.on('error', (error) => console.error(VAULT_WATCHER_ERROR_MESSAGE, error));

  const close = (): void => {
    pendingPaths.forEach((timeout) => clearTimeout(timeout));
    pendingPaths.clear();
    watcher.close();
  };

  return { close };
};
