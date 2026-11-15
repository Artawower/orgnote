// import {
//   Filesystem,
//   Encoding,
//   FileInfo as CapacitorFileInfo,
//   StatResult,
// } from '@capacitor/filesystem';
// import {
//   ErrorDirectoryNotFound,
//   ErrorFileNotFound,
//   FileInfo,
//   FileSystem,
//   getFileName,
// } from 'orgnote-api';
// import { b64toBlob, blobToB64 } from 'src/utils/blob-base64-converter';

// const FILE_NOT_FOUND_ERR = 'File does not exist';
// const DIRECTORY_NOT_FOUND_ERR = 'Directory does not exist';

// export const useMobileFs = (): FileSystem => {
//   const isFileNotFoundError = (e: unknown) =>
//     e instanceof Error && e.message === FILE_NOT_FOUND_ERR;
//   const isDirNotFoundError = (e: unknown) =>
//     e instanceof Error && e.message === DIRECTORY_NOT_FOUND_ERR;

//   const withErrorHandling = <ARGS extends unknown[], RES>(
//     fn: (path: string, ...params: ARGS) => RES,
//   ): ((path: string, ...params: ARGS) => Promise<Awaited<RES>>) => {
//     return async (path: string, ...params: ARGS): Promise<Awaited<RES>> => {
//       try {
//         return await fn(path, ...params);
//       } catch (e) {
//         if (isFileNotFoundError(e)) {
//           throw new ErrorFileNotFound(path);
//         }
//         if (isDirNotFoundError(e)) {
//           throw new ErrorDirectoryNotFound(path);
//         }
//         throw e;
//       }
//     };
//   };

//   // NOTE: mobile file system does not work with Blob.
//   // this is the reason why we convert binary files to base64 and vice versa.
//   const readFile: FileSystem['readFile'] = async <
//     T extends 'utf8' | 'binary' = 'utf8',
//     R = T extends 'utf8' ? string : Uint8Array,
//   >(
//     path: string,
//     encoding?: T,
//   ): Promise<R> => {
//     const data = (
//       await Filesystem.readFile({
//         path,
//         encoding: encoding === 'binary' || !encoding ? undefined : Encoding.UTF8,
//       })
//     ).data;

//     if (typeof data === 'string' && encoding === 'utf8') {
//       return data as R;
//     }

//     const res = await b64toBlob(data as string)
//       .arrayBuffer()
//       .then((buffer) => new Uint8Array(buffer));
//     return res as R;
//   };

//   const writeFile: FileSystem['writeFile'] = async (
//     path: string,
//     content: string | Uint8Array,
//     encoding: BufferEncoding,
//   ) => {
//     const data = encoding !== 'binary' ? (content as string) : await blobToB64(new Blob([content]));

//     encoding = encoding === 'binary' ? undefined : encoding;
//     await Filesystem.writeFile({
//       path,
//       data,
//       encoding: encoding as unknown as Encoding,
//     });
//   };

//   const rename: FileSystem['rename'] = async (oldPath: string, newPath: string) => {
//     await Filesystem.rename({
//       from: oldPath,
//       to: newPath,
//     });
//   };

//   const deleteFile: FileSystem['deleteFile'] = async (path: string) => {
//     await Filesystem.deleteFile({
//       path,
//     });
//   };

//   const readDir: FileSystem['readDir'] = async (path: string) => {
//     const res = await Filesystem.readdir({
//       path,
//     });

//     return res.files.map((f) => mapFileInfo(f, `${path}/${f.name}`));
//   };

//   const mapFileInfo = (file: CapacitorFileInfo | StatResult, path: string): FileInfo => ({
//     path,
//     name: getFileName(path),
//     type: file.type,
//     size: file.size,
//     mtime: file.mtime,
//     uri: file.uri,
//     ctime: file.ctime,
//   });

//   const rmdir: FileSystem['rmdir'] = async (path: string) => {
//     await Filesystem.rmdir({
//       recursive: true,
//       path,
//     });
//   };

//   const mkdir: FileSystem['mkdir'] = async (path: string) => {
//     await Filesystem.mkdir({
//       recursive: true,
//       path,
//     });
//   };

//   const isDirExist: FileSystem['isDirExist'] = async (path: string) => {
//     try {
//       await Filesystem.readdir({
//         path,
//       });
//       return true;
//     } catch (e) {
//       if (isDirNotFoundError(e)) {
//         return false;
//       }
//       throw e;
//     }
//   };

//   const isFileExist: FileSystem['isFileExist'] = async (path: string) => {
//     try {
//       await Filesystem.stat({
//         path,
//       });
//       return true;
//     } catch (e) {
//       if (isFileNotFoundError(e)) {
//         return false;
//       }
//       throw e;
//     }
//   };

//   const utimeSync: FileSystem['utimeSync'] = async (
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     _path: string,
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     _atime?: string | number | Date,
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     _mtime?: string | number | Date,
//   ) => {
//     // Mobile file system does not have API for update ctime and atime unfortunately.
//   };

//   const fileInfo: FileSystem['fileInfo'] = async (path: string) => {
//     const stat = await Filesystem.stat({
//       path: path,
//     });
//     return mapFileInfo(stat, path);
//   };

//   return {
//     fileInfo: withErrorHandling(fileInfo),
//     readFile: withErrorHandling(readFile),
//     writeFile: withErrorHandling(writeFile),
//     rename: withErrorHandling(rename),
//     deleteFile: withErrorHandling(deleteFile),
//     readDir: withErrorHandling(readDir),
//     rmdir: withErrorHandling(rmdir),
//     mkdir: withErrorHandling(mkdir),
//     isDirExist,
//     isFileExist,
//     utimeSync: withErrorHandling(utimeSync),
//   };
// };
