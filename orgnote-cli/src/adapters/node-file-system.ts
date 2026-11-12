import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  renameSync,
  unlinkSync,
  rmdirSync,
  mkdirSync,
  existsSync,
  utimesSync,
} from 'fs';
import { join, basename } from 'path';
import type { FileSystem, DiskFile } from 'orgnote-api';
import { toAbsolutePath } from 'orgnote-api';

const statToDiskFile = (absolutePath: string, relativePath: string, name: string): DiskFile => {
  const stat = statSync(absolutePath);
  return {
    name,
    path: toAbsolutePath(relativePath),
    type: stat.isDirectory() ? 'directory' : 'file',
    size: stat.size,
    atime: stat.atimeMs,
    ctime: stat.ctimeMs,
    mtime: stat.mtimeMs,
  };
};

export const createNodeFileSystem = (rootPath: string): FileSystem => ({
  readFile: async <T extends 'utf8' | 'binary' = 'utf8'>(
    path: string,
    encoding?: T
  ) => {
    const fullPath = join(rootPath, path);
    if (encoding === 'binary') {
      return readFileSync(fullPath) as any;
    }
    return readFileSync(fullPath, 'utf8') as any;
  },

  writeFile: async (
    path: string,
    content: string | Uint8Array,
    encoding?: BufferEncoding
  ) => {
    const fullPath = join(rootPath, path);
    const dir = join(fullPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(fullPath, content, { encoding: encoding ?? 'utf8' });
  },

  readDir: async (path: string) => {
    const fullPath = join(rootPath, path);
    const entries = readdirSync(fullPath, { withFileTypes: true });
    return entries.map((entry) => {
      const absolutePath = join(fullPath, entry.name);
      const relativePath = join(path, entry.name);
      return statToDiskFile(absolutePath, relativePath, entry.name);
    });
  },

  fileInfo: async (path: string) => {
    const fullPath = join(rootPath, path);
    if (!existsSync(fullPath)) {
      return undefined;
    }
    return statToDiskFile(fullPath, path, basename(path));
  },

  rename: async (path: string, newPath: string) => {
    const fullPath = join(rootPath, path);
    const fullNewPath = join(rootPath, newPath);
    renameSync(fullPath, fullNewPath);
  },

  deleteFile: async (path: string) => {
    const fullPath = join(rootPath, path);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  },

  rmdir: async (path: string) => {
    const fullPath = join(rootPath, path);
    rmdirSync(fullPath, { recursive: true });
  },

  mkdir: async (path: string) => {
    const fullPath = join(rootPath, path);
    mkdirSync(fullPath, { recursive: true });
  },

  isDirExist: async (path: string) => {
    const fullPath = join(rootPath, path);
    return existsSync(fullPath) && statSync(fullPath).isDirectory();
  },

  isFileExist: async (path: string) => {
    const fullPath = join(rootPath, path);
    return existsSync(fullPath) && statSync(fullPath).isFile();
  },

  utimeSync: async (
    path: string,
    atime?: string | number | Date,
    mtime?: string | number | Date
  ) => {
    const fullPath = join(rootPath, path);
    utimesSync(fullPath, atime ?? new Date(), mtime ?? new Date());
  },
});
