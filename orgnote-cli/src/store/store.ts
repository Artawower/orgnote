import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { dirname } from 'path';
import type { SyncedFile } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { getStorePath } from '../tools/paths.js';

interface Store {
  files?: Record<string, SyncedFile>;
}

const getDefaultStore = (): Store => ({ files: {} });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStore = (value: unknown): value is Store =>
  isRecord(value) && (value.files === undefined || isRecord(value.files));

export const initStore = (
  accountName: string,
  onRecovery?: (corruptedFile: string) => void
) => {
  const storeFile = getStorePath(accountName);
  let store: Store | undefined;

  const ensureStoreDir = (): void => {
    const dir = dirname(storeFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  };

  const preserveStore = (): void => {
    ensureStoreDir();
    store ??= getDefaultStore();
    const temporaryFile = `${storeFile}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(temporaryFile, JSON.stringify(store, null, 2));
    renameSync(temporaryFile, storeFile);
  };

  const get = <K extends keyof Store>(key: K): Store[K] => {
    if (!store) {
      readStore();
    }
    return store[key] ?? getDefaultStore()[key];
  };

  const set = <K extends keyof Store>(key: K, val: Store[K]): void => {
    if (!store) {
      readStore();
    }
    store[key] = val;
    preserveStore();
  };

  const restoreCorruptedStore = (): void => {
    const corruptedFile = `${storeFile}.corrupt-${Date.now()}-${process.pid}`;
    renameSync(storeFile, corruptedFile);
    store = getDefaultStore();
    preserveStore();
    onRecovery?.(corruptedFile);
  };

  const readStore = (): void => {
    const readResult = to(() => readFileSync(storeFile, 'utf8'))();
    if (readResult.isErr()) {
      if ((readResult.error as NodeJS.ErrnoException).code === 'ENOENT') {
        store = getDefaultStore();
        return;
      }
      throw readResult.error;
    }

    const parseResult = to(JSON.parse)(readResult.value);
    if (parseResult.isErr() || !isStore(parseResult.value)) {
      restoreCorruptedStore();
      return;
    }
    store = parseResult.value;
  };

  const clear = (): void => {
    store = getDefaultStore();
    preserveStore();
  };

  return {
    preserveStore,
    get,
    set,
    clear,
  };
};
