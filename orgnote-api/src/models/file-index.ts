export interface FileIndexMeta {
  id: string;
  indexedAt: string;
  fileModifiedAt: string;
}

export interface StoredIndex {
  version: number;
  files: Record<string, FileIndexMeta>;
  indexData: Record<string, unknown>;
}
