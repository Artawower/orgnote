import Dexie from 'dexie';
import { v4 } from 'uuid';
import type { DiskFile, FileSystem, FileSystemChange, FileSystemChangeType } from 'orgnote-api';
import { reporter } from 'src/boot/report';
import {
  ErrorDirectoryNotFound,
  ErrorFileNotFound,
  getFileName,
  splitPath,
  toAbsolutePath,
} from 'orgnote-api';
import { extractFileNameFromPath } from 'src/utils/extract-file-name-from-path';
import { getFileDirPath } from 'src/utils/get-file-dir-path';
import { isNullable, to } from 'orgnote-api/utils';
import { desktopOnly } from 'src/utils/platform-specific';
import { withDexieRecovery } from 'src/infrastructure/repositories/dexie-retry';

type File = DiskFile & { content?: string | Uint8Array };

type WatchListener = (change: FileSystemChange) => void;

class ErrorDirectoryAlreadyExist extends Error {
  constructor(path: string) {
    super(`Directory already exists: ${path}`);
  }
}

export const SIMPLE_FS_NAME = 'simple-fs';

const isConstraintError = (error: unknown): error is Error =>
  error instanceof Error && error.name === 'ConstraintError';

const isExistingDirectoryError = (error: unknown): error is ErrorDirectoryAlreadyExist =>
  error instanceof ErrorDirectoryAlreadyExist;

const buildChange = (
  path: string,
  type: FileSystemChangeType,
  mtime?: number,
): FileSystemChange => ({
  path,
  type,
  mtime,
});

const notifyListeners = (listeners: Map<string, WatchListener>, change: FileSystemChange): void => {
  listeners.forEach((listener) => {
    const result = to(listener)(change);
    if (result.isOk()) {
      return;
    }
    reporter.reportError(new Error('simple-fs watch listener failed', { cause: result.error }));
  });
};

export const useSimpleFs = (): FileSystem => {
  const db = new Dexie(SIMPLE_FS_NAME);
  const storeName = 'root';
  db.version(1).stores({
    [storeName]: 'path,mtime,ctime,atime,name,type',
  });
  const fs = db.table<File, string>(storeName);
  const listeners = new Map<string, WatchListener>();

  const createListenerId = (): string => v4();

  const readFile: FileSystem['readFile'] = async <
    T extends 'utf8' | 'binary' = 'utf8',
    R = T extends 'utf8' ? string : Uint8Array,
  >(
    path: string,
    encoding: T = 'utf8' as T,
  ): Promise<R> => {
    path = toAbsolutePath(path);
    if (!(await isFileExist(path))) {
      throw new ErrorFileNotFound(path);
    }
    const file = await fs.get(path);
    if (file?.content === undefined || isNullable(file?.content)) {
      throw new ErrorFileNotFound(path);
    }
    await fs.update(path, { atime: Date.now() });

    return decodeContent(file.content, encoding) as R;
  };

  const decodeContent = (
    raw: string | Uint8Array,
    encoding: 'utf8' | 'binary',
  ): string | Uint8Array => {
    if (encoding === 'utf8' && typeof raw === 'string') return raw;
    if (encoding === 'utf8' && raw instanceof Uint8Array) return new TextDecoder().decode(raw);
    if (encoding === 'binary' && raw instanceof Uint8Array) return raw;
    if (encoding === 'binary' && typeof raw === 'string') return new TextEncoder().encode(raw);
    return raw;
  };

  const emitCreateOrModify = (path: string, type: FileSystemChangeType, mtime: number): void => {
    notifyListeners(listeners, buildChange(path, type, mtime));
  };

  const emitDelete = (path: string): void => {
    notifyListeners(listeners, buildChange(path, 'delete'));
  };

  const emitRename = (path: string, previousPath: string): void => {
    notifyListeners(listeners, { path, previousPath, type: 'rename' });
  };

  const writeFile: FileSystem['writeFile'] = async (path, content, _encoding) => {
    void _encoding;
    path = toAbsolutePath(path);
    const existingFile = await fileInfo(path);
    await recursiveMkdir(path);

    const now = Date.now();
    const type: FileSystemChangeType = existingFile ? 'modify' : 'create';

    await fs.put({
      mtime: now,
      ctime: existingFile?.ctime ?? now,
      atime: now,
      size: new Blob([content]).size,
      name: getFileName(path),
      type: 'file',
      content,
      path,
    });

    emitCreateOrModify(path, type, now);
  };

  const recursiveMkdir = async (path: string) => {
    const paths = splitPath(getFileDirPath(path));
    path = '';
    while (paths.length) {
      path = path + '/' + paths.shift();
      const isDirExist = await isFileExist(path);
      if (isDirExist) {
        continue;
      }
      const result = await to(() => mkdir(path))();
      if (result.isOk()) {
        continue;
      }

      if (isExistingDirectoryError(result.error)) {
        continue;
      }

      throw result.error;
    }
  };

  const rename: FileSystem['rename'] = async (oldPath: string, newPath: string) => {
    oldPath = toAbsolutePath(oldPath);
    newPath = toAbsolutePath(newPath);

    const filesToRename = await getFilesToRename(oldPath);
    await updateFilePaths(filesToRename, oldPath, newPath);
    emitRename(newPath, oldPath);
  };

  const getFilesToRename = async (oldPath: string): Promise<string[]> => {
    const files: string[] = [];
    await fs.each((f) => {
      if (f.path.startsWith(oldPath)) {
        files.push(f.path);
      }
    });
    return files;
  };

  const updateFilePaths = async (files: string[], oldPath: string, newPath: string) => {
    await Promise.all(
      files.map(async (filePath) => {
        const relativePath = filePath.slice(oldPath.length);
        const newFilePath = `${newPath}${relativePath}`;
        const fileName = extractFileNameFromPath(newFilePath);

        await fs.update(filePath, {
          path: newFilePath,
          name: fileName,
          mtime: Date.now(),
        });
      }),
    );
  };

  const deleteFile: FileSystem['deleteFile'] = async (path: string) => {
    path = toAbsolutePath(path);
    await fs.delete(path);
    emitDelete(path);
  };

  const readDir: FileSystem['readDir'] = async (path: string) => {
    path = toAbsolutePath(path);

    const fileInfos: DiskFile[] = [];
    const prefix = path === '/' ? '' : path;
    const pattern = new RegExp(`^${prefix}/[^/]+$`);

    await fs.each((f) => {
      if (!pattern.test(f.path)) {
        return;
      }
      const { content: _, ...fileInfo } = f;
      void _;
      fileInfos.push(fileInfo);
    });

    return fileInfos;
  };

  const rmdir: FileSystem['rmdir'] = async (path: string) => {
    if (path === '/') {
      await fs.clear();
      emitDelete(path);
      await init?.();
      return;
    }
    if (!(await isDirExist(path))) {
      throw new ErrorDirectoryNotFound(path);
    }
    // TODO: master throw error if file is not dir

    const nestedFilesPaths: string[] = [];
    await fs.each((f) => {
      if (!f.path.startsWith(path)) {
        return;
      }
      nestedFilesPaths.push(f.path);
    });
    await Promise.all(nestedFilesPaths.map((p) => fs.delete(p)));
    emitDelete(path);
  };

  const mkdir: FileSystem['mkdir'] = async (path: string) => {
    path = toAbsolutePath(path);
    if (await isDirExist(path)) {
      throw new ErrorDirectoryAlreadyExist(path);
    }
    // TODO: master update atime/mtime for all parent directories

    const now = Date.now();
    const addResult = await to(() =>
      fs.add({
        size: 0,
        mtime: now,
        ctime: now,
        atime: now,
        name: getFileName(path),
        type: 'directory',
        path,
      }),
    )();

    if (!addResult.isErr()) {
      emitCreateOrModify(path, 'create', now);
      return;
    }

    if (isConstraintError(addResult.error) && (await isDirExist(path))) {
      return;
    }

    throw addResult.error;
  };

  const isDirExist: FileSystem['isDirExist'] = async (path: string) => {
    path = toAbsolutePath(path);
    return !!(await fs.get(path));
  };

  const isFileExist: FileSystem['isFileExist'] = async (path: string) => {
    path = toAbsolutePath(path);
    return !!(await fs.get(path));
  };

  const utimeSync: FileSystem['utimeSync'] = async (
    path: string,
    atime?: string | number | Date,
    mtime?: string | number | Date,
  ) => {
    path = toAbsolutePath(path);

    await fs.update(path, {
      atime: atime ? new Date(atime).getTime() : undefined,
      mtime: mtime ? new Date(mtime).getTime() : undefined,
    });

    if (mtime) {
      notifyListeners(listeners, buildChange(path, 'modify', new Date(mtime).getTime()));
    }
  };

  const fileInfo: FileSystem['fileInfo'] = async (path: string): Promise<DiskFile | undefined> => {
    path = toAbsolutePath(path);
    const file = await fs.get(path);
    return file;
  };

  const init: FileSystem['init'] = async () => {
    const res = await to(mkdir)('/');

    if (res.isErr() && !(res.error instanceof ErrorDirectoryAlreadyExist)) {
      throw res.error;
    }

    return {
      root: '/',
    };
  };

  const watch: FileSystem['watch'] = (listener) => {
    const id = createListenerId();
    listeners.set(id, listener);

    return {
      stop: () => {
        listeners.delete(id);
      },
    };
  };

  const wipe: FileSystem['wipe'] = async () => {
    desktopOnly(indexedDB.deleteDatabase.bind(indexedDB))(SIMPLE_FS_NAME);
  };

  const recoverableFs = withDexieRecovery(db, {
    readFile,
    fileInfo,
    writeFile,
    rename,
    deleteFile,
    readDir,
    rmdir,
    mkdir,
    isDirExist,
    isFileExist,
    utimeSync,
    init,
  });

  return { ...recoverableFs, wipe, watch };
};
