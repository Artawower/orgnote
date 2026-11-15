import { QueueTask } from './queue-task';
import { ExtensionSource } from './extension';
import { FileMeta } from './file-meta';
import { LayoutSnapshotRepository } from './layout-snapshot-repository';
import { LoggerRepository } from './log-repository';

export interface ExtensionSourceRepository {
  get(extensionName: string): Promise<ExtensionSource | undefined>;
  getBySource(source: string): Promise<ExtensionSource | undefined>;
  getAll(): Promise<ExtensionSource[]>;
  upsert(extension: ExtensionSource): Promise<void>;
  upsertMany(extensions: ExtensionSource[]): Promise<void>;
  delete(extensionName: string): Promise<void>;
  deleteBySource(source: string): Promise<void>;
  clear(): Promise<void>;
}

export interface FileRepository {
  getById(id: string): Promise<FileMeta | undefined>;
  getByIds(ids: string[]): Promise<FileMeta[]>;
  getByPath(filePath: string[]): Promise<FileMeta | undefined>;
  getAll(options?: {
    limit?: number;
    offset?: number;
    tags?: string[];
  }): Promise<FileMeta[]>;
  save(meta: FileMeta): Promise<void>;
  saveBulk(metas: FileMeta[]): Promise<void>;
  delete(id: string): Promise<void>;
  count(tags?: string[]): Promise<number>;
  getTagsStats(): Promise<{ tag: string; count: number }[]>;
  clear(): Promise<void>;
}

export interface QueueRepository {
  add(task: QueueTask): Promise<void>;
  get(id: string): Promise<QueueTask | undefined>;
  getAll(queueId?: string): Promise<QueueTask[]>;
  delete(id: string, force?: boolean): Promise<void>;
  update(id: string, updates: Partial<QueueTask>): Promise<void>;
  lock(id: string): Promise<void>;
  release(id: string): Promise<void>;
  takeFirstN(n: number, queueId: string): Promise<string>;
  getLock(lockId: string): Promise<{ [id: string]: QueueTask } | undefined>;
  getRunningTasks(queueId: string): Promise<{ [id: string]: QueueTask }>;
  clear(queueId: string): Promise<void>;
}

export interface KeyValueRepository {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface Repositories {
  logRepository: LoggerRepository;
  layoutSnapshotRepository: LayoutSnapshotRepository;
  queueRepository: QueueRepository;
  extensionSourceRepository: ExtensionSourceRepository;
  keyValueRepository: KeyValueRepository;
  fileRepository: FileRepository;
}
