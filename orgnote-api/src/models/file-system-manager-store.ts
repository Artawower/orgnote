import type { ComputedRef, Ref } from 'vue';
import type { FileSystemInfo, FileSystem } from './file-system';
import type { StoreDefinition } from './store';

export interface FileSystemSession {
  readonly id: number;
  readonly fs: FileSystem;
  readonly fsName: string;
  readonly root?: string;
  readonly storageKey: string;
}

export interface FileSystemManagerStore {
  register(fs: FileSystemInfo): void;
  currentFsInfo: ComputedRef<FileSystemInfo | undefined>;
  currentFs: ComputedRef<FileSystem | undefined>;
  fileSystems: ComputedRef<FileSystemInfo[]>;
  currentFsName: Ref<string>;
  fsMounted: Ref<boolean>;
  isReconciling: Ref<boolean>;
  readonly currentSession: ComputedRef<FileSystemSession | null>;
  useFs: (fsName: string) => Promise<void>;
  runWithMountedFileSystem: <T>(
    session: FileSystemSession,
    operation: (fs: FileSystem) => Promise<T>,
  ) => Promise<T | undefined>;
}

export type FileSystemManagerStoreDefinition =
  StoreDefinition<FileSystemManagerStore>;
