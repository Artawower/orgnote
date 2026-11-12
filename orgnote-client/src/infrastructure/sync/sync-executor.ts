import type {
  DeleteResult,
  FileSystem,
  LocalFile,
  RemoteFile,
  SyncExecutor,
  UploadResult,
} from 'orgnote-api';
import { hashContent, validateSyncFileResponse } from 'orgnote-api';
import type { VersionConflictResponse } from 'orgnote-api/remote-api';
import { sdk } from 'src/boot/axios';
import axios, { type AxiosError } from 'axios';
import { to } from 'orgnote-api/utils';

const fallbackFilename = 'file';

const isConflictError = (error: unknown): error is AxiosError<VersionConflictResponse> =>
  axios.isAxiosError(error) && error.response?.status === 409;

const extractConflictVersion = (error: AxiosError<VersionConflictResponse>): number =>
  error.response?.data?.serverVersion ?? 0;

const uploadFile =
  (fs: FileSystem) =>
  async (file: LocalFile, expectedVersion?: number): Promise<UploadResult> => {
    const content = await fs.readFile(file.path, 'binary');
    const contentHash = await hashContent(content);
    const blob = new File([content], file.path.split('/').pop() ?? fallbackFilename);
    const result = await to(sdk.sync.syncFilesPut)(
      file.path,
      blob,
      contentHash,
      expectedVersion,
    );

    if (result.isOk()) {
      return { status: 'ok', version: result.value.data.data?.version ?? 1 };
    }

    if (isConflictError(result.error)) {
      return { status: 'conflict', serverVersion: extractConflictVersion(result.error) };
    }

    throw result.error;
  };

const fetchFileContent = async (file: RemoteFile): Promise<Uint8Array> => {
  const response = await sdk.sync.syncFilesGet(file.path, { responseType: 'arraybuffer' });
  return validateSyncFileResponse(response, file);
};

const downloadFile =
  (fs: FileSystem) =>
  async (file: RemoteFile): Promise<Uint8Array> => {
    const content = await fetchFileContent(file);
    await fs.writeFile(file.path, content);
    return content;
  };

const deleteLocalFile =
  (fs: FileSystem) =>
  async (path: string): Promise<void> => {
    await fs.deleteFile(path);
  };

const deleteRemoteFile = async (
  path: string,
  expectedVersion: number,
): Promise<DeleteResult> => {
  const result = await to(sdk.sync.syncFilesDelete)(path, expectedVersion);
  if (result.isOk()) return { status: 'ok' };
  if (isConflictError(result.error)) {
    return { status: 'conflict', serverVersion: extractConflictVersion(result.error) };
  }
  throw result.error;
};

export const createSyncExecutor = (fs: FileSystem): SyncExecutor => ({
  upload: uploadFile(fs),
  download: downloadFile(fs),
  fetchContent: fetchFileContent,
  deleteLocal: deleteLocalFile(fs),
  deleteRemote: deleteRemoteFile,
});
