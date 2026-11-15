import type { DiskFile, FileSystem, FileSystemInfo } from 'orgnote-api';
import { useSettingsStore } from './settings';
import { useFileSystemManagerStore } from './file-system-manager';

export interface MockFileSystemData {
  fs: FileSystem;
  files: Map<string, DiskFile & { content: string }>;
}

export const createDiskFile = (path: string, mtime: number, size = 0): DiskFile => ({
  name: path.split('/').pop() ?? '',
  path,
  type: 'file',
  size,
  mtime,
});

export const createMockFs = (configToml: string): MockFileSystemData => {
  const files = new Map<string, DiskFile & { content: string }>();
  let nextMtime = 300;

  const configPath = '/.orgnote/config.toml';
  files.set(configPath, {
    ...createDiskFile(configPath, 200, configToml.length),
    content: configToml,
  });

  const fs: FileSystem = {
    readFile: async (path) => {
      const file = files.get(path);
      if (!file) throw new Error(`Missing file: ${path}`);
      return file.content as never;
    },
    writeFile: async (path, content) => {
      const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
      files.set(path, { ...createDiskFile(path, nextMtime++, text.length), content: text });
    },
    readDir: async (path) => {
      if (path !== '/.orgnote') return [];
      return [...files.values()].filter(
        (f) => f.path.startsWith('/.orgnote/') && f.path.split('/').length === 3,
      );
    },
    fileInfo: async (path) => files.get(path),
    rename: async (path, newPath) => {
      const file = files.get(path);
      if (!file) throw new Error(`Missing file: ${path}`);
      files.delete(path);
      files.set(newPath, {
        ...file,
        path: newPath,
        name: newPath.split('/').pop() ?? '',
        mtime: nextMtime++,
      });
    },
    deleteFile: async (path) => void files.delete(path),
    rmdir: async () => undefined,
    mkdir: async () => undefined,
    isDirExist: async () => true,
    isFileExist: async (path) => files.has(path),
    utimeSync: async () => undefined,
  };

  return { fs, files };
};

export const mountMockFileSystem = async (
  fs: FileSystem,
  name = 'mock-fs',
  vault = '/',
): Promise<void> => {
  const fsInfo: FileSystemInfo = {
    name,
    fs: () => fs,
    type: 'web',
    initialVault: vault,
  };

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = vault;

  const fsManager = useFileSystemManagerStore();
  fsManager.register(fsInfo);
  await fsManager.useFs(name);
};
