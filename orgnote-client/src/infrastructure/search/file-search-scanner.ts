import type { DiskFile, FileIndexMeta, FileMeta, QueueStatus } from 'orgnote-api';
import { isOrgFile, to } from 'orgnote-api';
import { runWithConcurrency } from 'orgnote-api/utils';
import { repositories } from 'src/boot/repositories';
import type { useQueueStore } from 'src/stores/queue';
import { INDEX_QUEUE_ID } from 'src/constants/queue-ids';
import { logger } from 'src/boot/logger';

const INDEX_SCAN_CONCURRENCY = 4;
const INDEX_QUEUE_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVE_TASK_STATUSES: Set<QueueStatus> = new Set(['pending', 'processing']);

export type ExistingFileSnapshot = Map<string, FileMeta>;

export interface IndexScanContext {
  existingFiles: ExistingFileSnapshot;
  queue: ReturnType<typeof useQueueStore>;
  signal: AbortSignal;
}

export interface FileSearchScannerDependencies {
  hasIndexedId: (id: string) => boolean;
  getIndexMeta: (id: string) => FileIndexMeta | undefined;
  ensureIndexLoaded: () => Promise<void>;
  getFileInfo: (path: string) => Promise<{ mtime: string | number | Date } | undefined>;
  readDir: (path: string) => Promise<DiskFile[]>;
  getQueueStore: () => ReturnType<typeof useQueueStore>;
}

export interface FileSearchScanner {
  getFileMtime: (entryPath: string) => Promise<Date | null>;
  shouldIndexFile: (
    entryPath: string,
    currentMtime?: Date,
    existingFile?: FileMeta | null,
  ) => Promise<boolean>;
  indexFile: (filePath: string) => Promise<void>;
  scanAllFilesUntilQueueDrain: () => Promise<void>;
}

export const createFileSearchScanner = (
  deps: FileSearchScannerDependencies,
): FileSearchScanner => {
  const buildIndexTaskId = (filePath: string): string => `file:${filePath}`;

  const hasQueuedIndexTask = async (taskId: string): Promise<boolean> => {
    const queueRepository = repositories.queueRepository;
    if (!queueRepository) return false;

    const existing = await queueRepository.get(taskId);
    if (!existing) return false;
    if (existing.queueId !== INDEX_QUEUE_ID) return false;
    if (existing.deletedAt) return false;
    if (!existing.status || !ACTIVE_TASK_STATUSES.has(existing.status)) return false;
    return true;
  };

  const enqueueIndexTask = async (
    queue: ReturnType<typeof useQueueStore>,
    filePath: string,
    signal?: AbortSignal,
  ): Promise<void> => {
    signal?.throwIfAborted();
    const taskId = buildIndexTaskId(filePath);
    const alreadyQueued = await hasQueuedIndexTask(taskId);
    signal?.throwIfAborted();

    if (alreadyQueued) {
      logger.debug('search index skip existing queued task', { filePath, taskId });
      return;
    }

    await queue.add(INDEX_QUEUE_ID, { filePath }, { id: taskId });
  };

  const buildEntryPath = (dirPath: string, name: string): string =>
    dirPath === '/' ? `/${name}` : `${dirPath}/${name}`;

  const getFileMtime = async (entryPath: string): Promise<Date | null> => {
    const fileInfo = await deps.getFileInfo(entryPath);
    if (!fileInfo) return null;
    return new Date(fileInfo.mtime);
  };

  const shouldIndexFile = async (
    entryPath: string,
    currentMtime?: Date,
    existingFile?: FileMeta | null,
  ): Promise<boolean> => {
    const filePath = entryPath.split('/').filter(Boolean);
    const existing =
      existingFile === undefined
        ? await repositories.fileRepository.getByPath(filePath)
        : existingFile;

    if (!existing) return true;
    if (!deps.hasIndexedId(existing.id)) return true;

    const meta = deps.getIndexMeta(existing.id);
    if (!meta) return true;

    const resolvedMtime = currentMtime ?? (await getFileMtime(entryPath));
    if (!resolvedMtime) return false;

    const storedMtime = new Date(meta.fileModifiedAt).getTime();
    const needsIndex = resolvedMtime.getTime() > storedMtime;

    if (!needsIndex) {
      logger.debug('search index skip unchanged file', {
        filePath: entryPath,
        fileId: existing.id,
        fileModifiedAt: meta.fileModifiedAt,
      });
    }

    return needsIndex;
  };

  const indexFile = async (filePath: string): Promise<void> => {
    const shouldIndexResult = await to(() => shouldIndexFile(filePath))();
    if (shouldIndexResult.isErr()) {
      logger.error('search index failed to check if file needs indexing', {
        filePath,
        error: shouldIndexResult.error,
      });
      return;
    }
    if (!shouldIndexResult.value) return;

    const queue = deps.getQueueStore();
    await enqueueIndexTask(queue, filePath);
  };

  const readDirectoryEntries = async (
    dirPath: string,
    signal: AbortSignal,
  ): Promise<DiskFile[] | null> => {
    signal.throwIfAborted();
    const readResult = await to(() => deps.readDir(dirPath))();
    signal.throwIfAborted();

    if (readResult.isErr()) {
      logger.error('search index failed to read directory', { dirPath, error: readResult.error });
      return null;
    }

    return readResult.value ?? null;
  };

  const scanSubdirectory = async (
    entryPath: string,
    context: IndexScanContext,
  ): Promise<void> => {
    const scanResult = await to(() => scanDirectory(entryPath, context))();
    if (scanResult.isOk()) return;
    context.signal.throwIfAborted();

    logger.error('search index failed to scan directory', {
      dirPath: entryPath,
      error: scanResult.error,
    });
  };

  const scanFileEntry = async (
    entryPath: string,
    entry: DiskFile,
    context: IndexScanContext,
  ): Promise<void> => {
    context.signal.throwIfAborted();
    if (!isOrgFile(entry.name)) return;

    const shouldIndexResult = await to(() =>
      shouldIndexFile(
        entryPath,
        new Date(entry.mtime),
        context.existingFiles.get(entryPath) ?? null,
      ),
    )();
    if (shouldIndexResult.isErr()) {
      logger.error('search index failed to check if file needs indexing', {
        filePath: entryPath,
        error: shouldIndexResult.error,
      });
      return;
    }

    if (!shouldIndexResult.value) return;

    await enqueueIndexTask(context.queue, entryPath, context.signal);
  };

  const scanEntry = async (
    dirPath: string,
    entry: DiskFile,
    context: IndexScanContext,
  ): Promise<void> => {
    context.signal.throwIfAborted();
    const entryPath = buildEntryPath(dirPath, entry.name);
    if (entry.type === 'directory') {
      await scanSubdirectory(entryPath, context);
      return;
    }
    await scanFileEntry(entryPath, entry, context);
  };

  const scanDirectory = async (dirPath: string, context: IndexScanContext): Promise<void> => {
    const entries = await readDirectoryEntries(dirPath, context.signal);
    if (!entries) return;
    await runWithConcurrency(entries, INDEX_SCAN_CONCURRENCY, (entry) =>
      scanEntry(dirPath, entry, context),
    );
  };

  const toFilePathKey = (filePath: string[]): string => `/${filePath.join('/')}`;

  const buildExistingFileSnapshot = async (): Promise<ExistingFileSnapshot> => {
    const files = await repositories.fileRepository.getAll();
    return new Map(files.map((file) => [toFilePathKey(file.filePath), file]));
  };

  const performIndexing = async (
    queue: ReturnType<typeof useQueueStore>,
    signal: AbortSignal,
  ): Promise<void> => {
    signal.throwIfAborted();
    await deps.ensureIndexLoaded();
    const existingFiles = await buildExistingFileSnapshot();
    signal.throwIfAborted();
    await scanDirectory('/', { queue, existingFiles, signal });
    logger.info('File indexing scan completed, added files to queue');
  };

  const scanAllFilesUntilQueueDrain = async (): Promise<void> => {
    const queueStore = deps.getQueueStore();
    await queueStore.runAndWaitForIdle(
      INDEX_QUEUE_ID,
      (signal) => performIndexing(queueStore, signal),
      { timeoutMs: INDEX_QUEUE_IDLE_TIMEOUT_MS },
    );
  };

  return {
    getFileMtime,
    shouldIndexFile,
    indexFile,
    scanAllFilesUntilQueueDrain,
  };
};
