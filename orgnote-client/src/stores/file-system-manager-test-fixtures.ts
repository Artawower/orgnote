import type { FileSystem, FileSystemInfo } from 'orgnote-api';
import { vi } from 'vitest';

export const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

export const createReadFile = (): FileSystem['readFile'] => {
  const readFile: FileSystem['readFile'] = async (_path, encoding) => {
    if (encoding === 'binary') {
      return new Uint8Array() as never;
    }
    return '' as never;
  };
  return readFile;
};

export const createMinimalFs = (initPromise: Promise<{ root: string }>): FileSystem => ({
  readFile: createReadFile(),
  writeFile: vi.fn(async () => undefined),
  readDir: vi.fn(async () => []),
  fileInfo: vi.fn(async () => undefined),
  rename: vi.fn(async () => undefined),
  deleteFile: vi.fn(async () => undefined),
  rmdir: vi.fn(async () => undefined),
  mkdir: vi.fn(async () => undefined),
  isDirExist: vi.fn(async () => true),
  isFileExist: vi.fn(async () => false),
  utimeSync: vi.fn(async () => undefined),
  init: () => initPromise,
});

export const mockFileSystemInstance = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readDir: vi.fn(),
  fileInfo: vi.fn(),
  rename: vi.fn(),
  deleteFile: vi.fn(),
  rmdir: vi.fn(),
  mkdir: vi.fn(),
  isDirExist: vi.fn(),
  isFileExist: vi.fn(),
  utimeSync: vi.fn(),
};

export const mockFileSystemInfo: FileSystemInfo = {
  name: 'mockFs',
  fs: () => mockFileSystemInstance,
  type: 'desktop',
};
