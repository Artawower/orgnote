import type { Ref, ComputedRef } from 'vue';
import type { FileMeta } from './file-meta';
import type { StoreDefinition } from './store';

export interface FileSearchResult {
  files: FileMeta[];
  total: number;
  query: string;
  searchedAt: number;
}

export interface FileIndexStats {
  indexed: number;
  total: number;
}

export interface FileSearchStore {
  isSearching: Ref<boolean>;
  isIndexing: Ref<boolean>;
  lastSearchResult: Ref<FileSearchResult | null>;
  indexStats: ComputedRef<FileIndexStats>;

  search(
    query: string,
    options?: { limit?: number; offset?: number }
  ): Promise<FileMeta[]>;

  indexFile(filePath: string): Promise<void>;
  indexFiles(): Promise<void>;
  processFile(filePath: string): Promise<void>;
  removeFile(target: { id: string } | { path: string[] }): Promise<void>;

  loadIndex(): Promise<boolean>;
  saveIndex(): Promise<void>;
  clearIndex(): Promise<void>;
}

export type FileSearchStoreDefinition = StoreDefinition<FileSearchStore>;
