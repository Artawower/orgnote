import { splitPath, type DiskFile, type FileSystem, type FileSystemParams } from 'orgnote-api';
import { getAndroidSaf, type SafPlugin } from 'src/plugins/saf.plugin';
import { isPresent } from 'orgnote-api/utils';
import { to } from 'orgnote-api/utils';

export const ANDROID_SAF_FS_NAME = 'SAF android file system';

export const useAndroidFs = (): FileSystem => {
  let rootUri = '';
  let saf: SafPlugin | undefined;

  const ensureSaf = async (): Promise<SafPlugin> => {
    if (!saf) {
      saf = await getAndroidSaf();
    }
    return saf;
  };

  const init: FileSystem['init'] = async (params?: FileSystemParams): Promise<FileSystemParams> => {
    const root = params?.root ?? (await pickFolder());
    rootUri = root;
    return { ...params, root };
  };

  const mount: FileSystem['mount'] = async (params?: FileSystemParams): Promise<boolean> => {
    if (params?.root) {
      rootUri = params.root;
      return true;
    }
    return false;
  };

  const pickFolder = async (): Promise<string> => {
    const safInstance = await ensureSaf();
    const res = await safInstance.openDirectoryPicker();
    return res.uri;
  };

  const toDiskFile = (file?: {
    name: string;
    uri?: string;
    path?: string;
    type: 'file' | 'directory';
    size: number;
    mtime: number;
  }): DiskFile | undefined => {
    if (!file) return;
    const uri = file.uri || file.path || '';
    let relativePath = '';

    const rootId = rootUri.split('/tree/')[1];
    const docPrefix = `/document/${rootId}`;
    const index = uri.indexOf(docPrefix);

    if (index !== -1) {
      const encodedRelPath = uri.slice(index + docPrefix.length);
      relativePath = decodeURIComponent(encodedRelPath).replace(/^\/+/, '');
    }

    return {
      name: file.name,
      path: `/${relativePath}`,
      uri,
      type: file.type,
      size: file.size,
      mtime: file.mtime,
    };
  };

  const readFile: FileSystem['readFile'] = async <T extends 'utf8' | 'binary'>(
    path: string,
    encoding: T = 'utf8' as T,
  ) => {
    const safInstance = await ensureSaf();
    const file = await to(safInstance.readFile.bind(safInstance))({
      uri: rootUri,
      path: splitPath(path),
    });
    if (file.isErr()) {
      throw file.error;
    }
    return (
      encoding === 'utf8' ? file.value.data : new TextEncoder().encode(file.value.data)
    ) as never;
  };

  const appendParentPath = (
    parentPaths: string[][],
    segment: string,
  ): string[][] => {
    const previousParentPath = parentPaths.at(-1) ?? [];
    return [...parentPaths, [...previousParentPath, segment]];
  };

  const toParentPaths = (path: string): string[][] =>
    splitPath(path).slice(0, -1).reduce(appendParentPath, [] as string[][]);

  const ensureDirectory = async (segments: string[]): Promise<void> => {
    const path = `/${segments.join('/')}`;
    if (await isDirExist(path)) return;
    const safInstance = await ensureSaf();
    await safInstance.mkdir({ uri: rootUri, path: segments });
  };

  const ensureParentDirectories = async (path: string): Promise<void> => {
    for (const parentPath of toParentPaths(path)) {
      await ensureDirectory(parentPath);
    }
  };

  const writeFile: FileSystem['writeFile'] = async (path, content) => {
    const safInstance = await ensureSaf();
    const data = typeof content === 'string' ? content : new TextDecoder().decode(content);
    await ensureParentDirectories(path);
    await safInstance.writeFile({ uri: rootUri, path: splitPath(path), data });
  };

  const readDir: FileSystem['readDir'] = async (path) => {
    const safInstance = await ensureSaf();
    const { files } = await safInstance.readDir({ uri: rootUri, path: splitPath(path) });
    const normalizedFiles = files.map(toDiskFile).filter((f) => isPresent(f));
    return normalizedFiles;
  };

  const fileInfo: FileSystem['fileInfo'] = async (path) => {
    const safInstance = await ensureSaf();
    const file = await safInstance.fileInfo({ uri: rootUri, path: splitPath(path) });
    return toDiskFile(file);
  };

  const mkdir: FileSystem['mkdir'] = async (path) => {
    const safInstance = await ensureSaf();
    await safInstance.mkdir({ uri: rootUri, path: splitPath(path) });
  };

  const deleteFile: FileSystem['deleteFile'] = async (path) => {
    const safInstance = await ensureSaf();
    await safInstance.delete({ uri: rootUri, path: splitPath(path) });
  };

  const rename: FileSystem['rename'] = async (path, newPath) => {
    const safInstance = await ensureSaf();
    await safInstance.rename({
      uri: rootUri,
      newPath: splitPath(newPath),
      oldPath: splitPath(path),
    });
  };

  const isDirExist: FileSystem['isDirExist'] = async (path) => {
    return (await to(fileInfo)(path)).map((i) => i?.type === 'directory').unwrapOr(false);
  };

  const isFileExist: FileSystem['isFileExist'] = async (path) => {
    return (await to(fileInfo)(path)).map((i) => i?.type === 'file').unwrapOr(false);
  };

  const utimeSync: FileSystem['utimeSync'] = async (path, _, mtime) => {
    const safInstance = await ensureSaf();
    const timestamp = mtime ? new Date(mtime).getTime() : Date.now();
    await safInstance.utime({ uri: rootUri, path: splitPath(path), mtime: timestamp });
  };

  const rmdir: FileSystem['rmdir'] = async (path) => {
    const dirFiles = await readDir(path);
    await Promise.all(
      dirFiles.map((file) =>
        file.type === 'directory' ? rmdir(file.path) : deleteFile(file.path),
      ),
    );
    await deleteFile(path);
  };

  const prettifyPath = (uri: string): string => {
    const primaryPrefix = 'primary%3A';
    const startIndex = uri.indexOf(primaryPrefix);

    if (startIndex !== -1) {
      const encodedPath = uri.substring(startIndex + primaryPrefix.length);
      return decodeURIComponent(encodedPath);
    }

    const treePrefix = 'tree/';
    const treeIndex = uri.indexOf(treePrefix);

    if (treeIndex !== -1) {
      const encodedPath = uri.substring(treeIndex + treePrefix.length);
      const colonIndex = encodedPath.indexOf('%3A');
      if (colonIndex !== -1) {
        return decodeURIComponent(encodedPath.substring(colonIndex + 3));
      }
    }

    throw new Error(`Unknown SAF URI format: ${uri}`);
  };

  return {
    init,
    readFile,
    writeFile,
    readDir,
    fileInfo,
    rename,
    deleteFile,
    mkdir,
    rmdir,
    isDirExist,
    isFileExist,
    utimeSync,
    pickFolder,
    mount,
    prettifyPath,
  };
};
