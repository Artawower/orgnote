import type {
  SyncExecutor,
  LocalFile,
  RemoteFile,
  SyncPlan,
  SyncContext,
  UploadResult,
  DeleteResult,
  FileSystem,
  BaseContentStore,
} from 'orgnote-api';
import type { VersionConflictResponse } from 'orgnote-api/remote-api';
import {
  createSyncPlan,
  processUpload,
  processDownload,
  processDeleteLocal,
  processDeleteRemote,
  recoverState,
  toRelativePath,
  validateSyncFileResponse,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import type { OrgNotePublishedConfig } from '../config.js';
import { createNodeFileSystem } from '../adapters/node-file-system.js';
import { createSyncState } from '../adapters/sync-state.js';
import { createFileBaseContentStore } from '../adapters/base-content-store.js';
import { getApi, type Api } from './sdk.js';
import { getLogger } from '../logger.js';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import FormData from 'form-data';
import axios, { type AxiosError } from 'axios';
import pMap from 'p-map';
import { readGitignorePatterns } from '../tools/gitignore.js';

const logger = getLogger();
const DEFAULT_SYNC_CONCURRENCY = 4;

const createFormData = (filePath: string, absolutePath: string): FormData => {
  if (!existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = readFileSync(absolutePath);
  const filename = filePath.split('/').pop() || 'file';

  const formData = new FormData();
  formData.append('filePath', filePath);
  formData.append('file', content, {
    filename,
    contentType: 'application/octet-stream',
  });

  logger.debug(
    'FormData created: filePath=%s, absolutePath=%s, size=%d bytes',
    filePath,
    absolutePath,
    content.length
  );
  return formData;
};

const isConflictError = (
  error: unknown
): error is AxiosError<VersionConflictResponse> =>
  axios.isAxiosError(error) && error.response?.status === 409;

const extractConflictVersion = (
  error: AxiosError<VersionConflictResponse>
): number => error.response?.data?.serverVersion ?? 0;

const uploadFile =
  (api: Api, rootFolder: string) =>
  async (file: LocalFile, expectedVersion?: number): Promise<UploadResult> => {
    logger.info('Uploading: %s', file.path);

    const relativePath = toRelativePath(file.path);
    const absolutePath = join(rootFolder, relativePath);
    const formData = createFormData(file.path, absolutePath);

    const result = await to(() =>
      api.sync.uploadFile(
        relativePath,
        formData,
        file.contentHash,
        expectedVersion
      )
    )();

    if (result.isOk()) {
      return { status: 'ok', version: result.value.data.data.version };
    }

    if (isConflictError(result.error)) {
      return {
        status: 'conflict',
        serverVersion: extractConflictVersion(result.error),
      };
    }
    throw result.error;
  };

const fetchFileContent =
  (api: Api) =>
  async (file: RemoteFile): Promise<Uint8Array> => {
    logger.info('Fetching: %s', file.path);
    const response = await api.sync.downloadFile(file.path);
    return validateSyncFileResponse(response, file);
  };

const downloadFile =
  (api: Api, fs: FileSystem) =>
  async (file: RemoteFile): Promise<void> => {
    await fs.writeFile(file.path, await fetchFileContent(api)(file));
  };

const deleteLocalFile =
  (fs: FileSystem) =>
  async (path: string): Promise<void> => {
    logger.info('Deleting local: %s', path);
    await fs.deleteFile(path);
  };

const deleteRemoteFile =
  (api: Api) =>
  async (path: string, expectedVersion: number): Promise<DeleteResult> => {
    logger.info('Deleting remote: %s', path);
    const result = await to(() => api.sync.deleteFile(path, expectedVersion))();
    if (result.isOk()) return { status: 'ok' };
    if (isConflictError(result.error)) {
      return { status: 'conflict', serverVersion: extractConflictVersion(result.error) };
    }
    throw result.error;
  };

export const createExecutor = (
  api: Api,
  rootFolder: string,
  fs: FileSystem
): SyncExecutor => ({
  upload: uploadFile(api, rootFolder),
  download: downloadFile(api, fs),
  fetchContent: fetchFileContent(api),
  deleteLocal: deleteLocalFile(fs),
  deleteRemote: deleteRemoteFile(api),
});

const logPlanSummary = (plan: SyncPlan): void => {
  logger.info('Sync plan:');
  logger.info('  To upload: %d files', plan.toUpload.length);
  logger.info('  To download: %d files', plan.toDownload.length);
  logger.info('  To delete locally: %d files', plan.toDeleteLocal.length);
  logger.info('  To delete remotely: %d files', plan.toDeleteRemote.length);
};

const logPlanDetails = (plan: SyncPlan): void => {
  plan.toUpload.forEach((f) => logger.debug('    upload: %s', f.path));
  plan.toDownload.forEach((f) => logger.debug('    download: %s', f.path));
  plan.toDeleteLocal.forEach((p) => logger.debug('    delete local: %s', p));
  plan.toDeleteRemote.forEach((p) => logger.debug('    delete remote: %s', p));
};

const isPlanEmpty = (plan: SyncPlan): boolean =>
  plan.toUpload.length === 0 &&
  plan.toDownload.length === 0 &&
  plan.toDeleteLocal.length === 0 &&
  plan.toDeleteRemote.length === 0;

interface SyncStats {
  uploaded: number;
  downloaded: number;
  deletedLocal: number;
  deletedRemote: number;
  errors: number;
}

const createStats = (): SyncStats => ({
  uploaded: 0,
  downloaded: 0,
  deletedLocal: 0,
  deletedRemote: 0,
  errors: 0,
});

const logStats = (stats: SyncStats): void => {
  logger.info('Sync completed:');
  logger.info('  Uploaded: %d', stats.uploaded);
  logger.info('  Downloaded: %d', stats.downloaded);
  logger.info('  Deleted locally: %d', stats.deletedLocal);
  logger.info('  Deleted remotely: %d', stats.deletedRemote);

  if (stats.errors > 0) {
    logger.error('  Errors: %d', stats.errors);
  }
};

const processItem = async <T>(
  item: T,
  processor: (item: T) => Promise<void>,
  getPath: (item: T) => string,
  operationName: string
): Promise<boolean> => {
  const result = await to(() => processor(item))();
  if (result.isErr()) {
    logger.error(
      '%s failed: %s - %s',
      operationName,
      getPath(item),
      result.error
    );
    return false;
  }
  return true;
};

export const getSyncConcurrency = (): number => {
  const rawConcurrency = Number(process.env.SYNC_CONCURRENCY);
  if (Number.isInteger(rawConcurrency) && rawConcurrency > 0) return rawConcurrency;
  return DEFAULT_SYNC_CONCURRENCY;
};

export const executeWithErrorHandling = async <T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  getPath: (item: T) => string,
  operationName: string
): Promise<{ success: number; errors: number }> => {
  const results = await pMap(
    items,
    (item) => processItem(item, processor, getPath, operationName),
    { concurrency: getSyncConcurrency(), stopOnError: false }
  );

  const success = results.filter(Boolean).length;
  return { success, errors: results.length - success };
};

interface SyncOperation<T> {
  items: T[];
  processor: (item: T) => Promise<void>;
  getPath: (item: T) => string;
  name: string;
  statKey: keyof Omit<SyncStats, 'errors'>;
}

const createOperations = (
  plan: SyncPlan,
  ctx: SyncContext
): SyncOperation<LocalFile | RemoteFile | string>[] => [
  {
    items: plan.toUpload,
    processor: (file) => processUpload(file as LocalFile, ctx),
    getPath: (file) => (file as LocalFile).path,
    name: 'Upload',
    statKey: 'uploaded',
  },
  {
    items: plan.toDownload,
    processor: (file) => processDownload(file as RemoteFile, ctx),
    getPath: (file) => (file as RemoteFile).path,
    name: 'Download',
    statKey: 'downloaded',
  },
  {
    items: plan.toDeleteLocal,
    processor: (path) => processDeleteLocal(path as string, ctx),
    getPath: (path) => path as string,
    name: 'Delete local',
    statKey: 'deletedLocal',
  },
  {
    items: plan.toDeleteRemote,
    processor: (path) => processDeleteRemote(path as string, ctx),
    getPath: (path) => path as string,
    name: 'Delete remote',
    statKey: 'deletedRemote',
  },
];

const executePlan = async (
  plan: SyncPlan,
  ctx: SyncContext
): Promise<SyncStats> => {
  const operations = createOperations(plan, ctx);

  const results = await Promise.all(
    operations.map(async (op) => ({
      statKey: op.statKey,
      result: await executeWithErrorHandling(
        op.items,
        op.processor,
        op.getPath,
        op.name
      ),
    }))
  );

  return results.reduce(
    (stats, { statKey, result }) => ({
      ...stats,
      [statKey]: result.success,
      errors: stats.errors + result.errors,
    }),
    createStats()
  );
};

interface SyncDependencies {
  api: Api;
  fs: FileSystem;
  state: ReturnType<typeof createSyncState>;
  rootFolder: string;
  baseStore: BaseContentStore;
  ignorePatterns: string[];
}

const initDependencies = (
  config: OrgNotePublishedConfig
): SyncDependencies => ({
  api: getApi(config),
  fs: createNodeFileSystem(config.rootFolder),
  state: createSyncState(config.name),
  rootFolder: config.rootFolder,
  baseStore: createFileBaseContentStore(config.name),
  ignorePatterns: config.ignorePatterns,
});

const buildSyncPlan = async (
  deps: SyncDependencies
): Promise<{ plan: SyncPlan; serverTime: string }> => {
  const plan = await createSyncPlan({
    fs: deps.fs,
    api: deps.api.sync,
    state: deps.state,
    rootPath: '/',
    ignorePatterns: deps.ignorePatterns,
    enableContentHashCheck: true,
  });

  return { plan, serverTime: plan.serverTime };
};

const createSyncContext = (
  deps: SyncDependencies,
  serverTime: string
): SyncContext => ({
  executor: createExecutor(deps.api, deps.rootFolder, deps.fs),
  state: deps.state,
  fs: deps.fs,
  serverTime,
  baseStore: deps.baseStore,
});

export const syncFiles = async (
  config: OrgNotePublishedConfig
): Promise<void> => {
  logger.info('Starting sync for account: %s', config.name);
  logger.info('Root folder: %s', config.rootFolder);

  const gitignorePatterns = readGitignorePatterns(config.rootFolder);
  const mergedIgnorePatterns = [
    ...gitignorePatterns,
    ...config.ignorePatterns,
  ];

  const deps = initDependencies({
    ...config,
    ignorePatterns: mergedIgnorePatterns,
  });

  await recoverState(deps.state);

  const { plan, serverTime } = await buildSyncPlan(deps);

  logPlanSummary(plan);
  logPlanDetails(plan);

  if (isPlanEmpty(plan)) {
    logger.info('Everything is up to date.');
    return;
  }

  const ctx = createSyncContext(deps, serverTime);
  const stats = await executePlan(plan, ctx);

  logStats(stats);
};
