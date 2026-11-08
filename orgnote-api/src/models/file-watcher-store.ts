import { Ref } from 'vue';
import { StoreDefinition } from './store';
import { FileSystemChange } from './file-system';

export interface FileWatcherStartOptions {
  interval?: number;
  fileFilter?: (path: string) => boolean;
}

export interface FileWatcherWatchOptions {
  recursive?: boolean;
}

export type FileWatcherListener = (
  change: FileSystemChange
) => void | Promise<void>;

export interface FileWatcherStore {
  isWatching: Ref<boolean>;

  start: (options?: FileWatcherStartOptions) => Promise<void>;
  restart: (options?: FileWatcherStartOptions) => Promise<void>;
  stop: () => Promise<void>;
  watch: (
    path: string,
    listener: FileWatcherListener,
    options?: FileWatcherWatchOptions
  ) => () => void;
  emitChange: (change: FileSystemChange) => Promise<void>;
}

export type FileWatcherStoreDefinition = StoreDefinition<FileWatcherStore>;
