import type { FileMeta } from './file-meta';
import type { StoreDefinition } from './store';

export interface FileMetaStore {
  getById(id: string): Promise<FileMeta | undefined>;
  getByIds(ids: string[]): Promise<FileMeta[]>;
  getByPath(filePath: string[]): Promise<FileMeta | undefined>;
  getAll(options?: {
    limit?: number;
    offset?: number;
    tags?: string[];
  }): Promise<FileMeta[]>;
  count(tags?: string[]): Promise<number>;
  getTagsStats(): Promise<{ tag: string; count: number }[]>;
  save(meta: FileMeta): Promise<void>;
  saveBulk(metas: FileMeta[]): Promise<void>;
  delete(target: { id: string } | { path: string[] }): Promise<void>;
  clear(): Promise<void>;
}

export type FileMetaStoreDefinition = StoreDefinition<FileMetaStore>;
