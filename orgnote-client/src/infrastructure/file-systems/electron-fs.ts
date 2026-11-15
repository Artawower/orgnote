import type { DiskFile, FileSystem, FileSystemChange, FileSystemParams } from 'orgnote-api';

export const ELECTRON_FS_NAME = 'Electron file system';

const getElectronFsApi = () => {
  const fs = window.electron?.fs;
  if (!fs) throw new Error('Electron filesystem API is unavailable');
  return fs;
};

export const useElectronFs = (): FileSystem => {
  let mountedRoot = '';

  const pickFolder = async (): Promise<string> => {
    const root = await getElectronFsApi().selectDirectory();
    if (root === undefined) throw new Error('Electron vault selection cancelled');
    return root;
  };

  const init: FileSystem['init'] = async (params?: FileSystemParams) => {
    const root = params?.root ?? (await pickFolder());
    mountedRoot = root;
    return { root };
  };

  const mount: FileSystem['mount'] = async (params?: FileSystemParams) => {
    const root = params?.root ?? mountedRoot;
    if (!root) return false;
    const mounted = await getElectronFsApi().mountRoot(root);
    mountedRoot = root;
    return mounted;
  };

  const readFile: FileSystem['readFile'] = async <
    T extends 'utf8' | 'binary' = 'utf8',
    R = T extends 'utf8' ? string : Uint8Array,
  >(
    path: string,
    encoding?: T,
  ): Promise<R> => {
    const content = await getElectronFsApi().readFile(path, encoding);
    return content as R;
  };

  const writeFile: FileSystem['writeFile'] = async (path, content, encoding) => {
    await getElectronFsApi().writeFile(path, content, encoding);
  };

  const readDir: FileSystem['readDir'] = (path): Promise<DiskFile[]> =>
    getElectronFsApi().readDir(path);

  const fileInfo: FileSystem['fileInfo'] = (path): Promise<DiskFile | undefined> =>
    getElectronFsApi().fileInfo(path);

  const rename: FileSystem['rename'] = async (path, newPath) => {
    await getElectronFsApi().rename(path, newPath);
  };

  const deleteFile: FileSystem['deleteFile'] = async (path) => {
    await getElectronFsApi().deleteFile(path);
  };

  const rmdir: FileSystem['rmdir'] = async (path) => {
    await getElectronFsApi().rmdir(path);
  };

  const mkdir: FileSystem['mkdir'] = async (path) => {
    await getElectronFsApi().mkdir(path);
  };

  const isDirExist: FileSystem['isDirExist'] = async (path) => {
    const file = await fileInfo(path);
    return file?.type === 'directory';
  };

  const isFileExist: FileSystem['isFileExist'] = async (path) => {
    const file = await fileInfo(path);
    return file?.type === 'file';
  };

  const utimeSync: FileSystem['utimeSync'] = async (path, atime, mtime) => {
    await getElectronFsApi().utime(path, atime, mtime);
  };

  const copyFile: FileSystem['copyFile'] = async (src, dest) => {
    await getElectronFsApi().copyFile(src, dest);
  };

  const watch: FileSystem['watch'] = async (listener, params) => {
    await mount(params);
    const watchId = await getElectronFsApi().watchStart();
    const unsubscribe = getElectronFsApi().onWatchEvent((event) => {
      if (event.watchId !== watchId) return;
      listener(event.change as FileSystemChange);
    });

    return {
      stop: async () => {
        unsubscribe();
        await getElectronFsApi().watchStop(watchId);
      },
    };
  };

  const prettifyPath: FileSystem['prettifyPath'] = (path) => path;

  return {
    init,
    mount,
    readFile,
    writeFile,
    readDir,
    fileInfo,
    rename,
    deleteFile,
    rmdir,
    mkdir,
    isDirExist,
    isFileExist,
    utimeSync,
    copyFile,
    watch,
    pickFolder,
    prettifyPath,
  };
};
