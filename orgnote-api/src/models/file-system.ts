import { OrgNoteApi } from 'src/api';

export type FileSystemChangeType = 'create' | 'modify' | 'delete' | 'rename';

export interface FileSystemChange {
  path: string;
  type: FileSystemChangeType;
  mtime?: number;
  previousPath?: string;
}

export interface WatcherHandle {
  stop: () => Promise<void> | void;
}

export interface DiskFile {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size: number;
  atime?: number;
  ctime?: number;
  mtime: number;
  uri?: string;
}

export class ErrorDirectoryNotFound extends Error {
  constructor(path: string) {
    super(`Directory not found: ${path}`);
    this.name = 'ErrorDirectoryNotFound';
  }
}

export class ErrorFileNotFound extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = 'ErrorFileNotFound';
  }
}

export type FileSystemPlatform =
  | 'android'
  | 'ios'
  | 'mobile'
  | 'desktop'
  | 'web'
  | 'all';

export interface FileSystemInfo {
  name: string;
  fs: (api?: OrgNoteApi) => FileSystem;
  type?: FileSystemPlatform;
  description?: string;
  initialVault?: string;
}

export interface FileSystemParams {
  root?: string;
}

export interface FileSystem {
  readFile: <
    T extends 'utf8' | 'binary' = 'utf8',
    R = T extends 'utf8' ? string : Uint8Array,
  >(
    path: string,
    encoding?: T
  ) => Promise<R>;
  writeFile: (
    path: string,
    content: string | Uint8Array,
    encoding?: BufferEncoding
  ) => Promise<void>;
  readDir: (path: string) => Promise<DiskFile[]>;
  fileInfo: (path: string) => Promise<DiskFile | undefined>;
  rename: (path: string, newPath: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  rmdir: (path: string) => Promise<void>;
  mkdir: (path: string) => Promise<void>;
  isDirExist: (path: string) => Promise<boolean>;
  isFileExist: (path: string) => Promise<boolean>;
  utimeSync: (
    path: string,
    atime?: string | number | Date,
    mtime?: string | number | Date
  ) => Promise<void>;
  init?: (params?: FileSystemParams) => Promise<FileSystemParams | void>;
  mount?: (params?: FileSystemParams) => Promise<boolean>;
  pickFolder?: () => Promise<string>;
  /* Convert internal path to pretty visual path for display */
  prettifyPath?: (path: string) => string;
  wipe?: () => Promise<void>;
  watch?: (
    listener: (change: FileSystemChange) => void,
    params?: FileSystemParams
  ) => WatcherHandle | Promise<WatcherHandle>;
  copyFile?: (src: string, dest: string) => Promise<void>;
}
