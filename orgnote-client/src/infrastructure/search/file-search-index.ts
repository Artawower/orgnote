import { Document, type DefaultDocumentSearchResults } from 'flexsearch';
import type { FileIndexMeta, FileMeta, StoredIndex } from 'orgnote-api';
import { to } from 'orgnote-api';
import { repositories } from 'src/boot/repositories';

export const FILE_INDEX_KEY = 'file-index';
export const INDEX_VERSION = 4;

interface IndexedFile {
  [key: string]: string;
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string;
}

export interface FileSearchIndexDependencies {
  getFilesByIds?: (ids: string[]) => Promise<FileMeta[]>;
  getKeyValueRepo?: () => typeof repositories.keyValueRepository;
}

export interface FileSearchIndex {
  add: (file: FileMeta, content: string) => void;
  remove: (id: string) => void;
  hasId: (id: string) => boolean;
  getMeta: (id: string) => FileIndexMeta | undefined;
  updateMeta: (fileId: string, mtime: Date) => void;
  search: (
    query: string,
    limit: number,
    offset: number,
  ) => Promise<{ files: FileMeta[]; total: number }>;
  save: () => Promise<void>;
  load: () => Promise<boolean>;
  clear: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
  size: () => number;
  getStats: () => { indexed: number; total: number };
}

export const createFileSearchIndex = (
  deps?: FileSearchIndexDependencies,
): FileSearchIndex => {
  const getFiles = deps?.getFilesByIds ?? ((ids) => repositories.fileRepository.getByIds(ids));
  const getKv = deps?.getKeyValueRepo ?? (() => repositories?.keyValueRepository);

  const index = new Document<IndexedFile>({
    document: {
      id: 'id',
      index: ['title', 'description', 'content', 'tags'],
      store: ['id'],
    },
    tokenize: 'forward',
    cache: true,
    context: true,
  });

  const indexedIds = new Set<string>();
  const indexMetaMap = new Map<string, FileIndexMeta>();

  const add = (file: FileMeta, content: string): void => {
    if (!file.id) return;
    if (indexedIds.has(file.id)) {
      index.remove(file.id);
    }
    index.add({
      id: file.id,
      title: file.title ?? '',
      description: file.description ?? '',
      content,
      tags: file.tags?.join(' ') ?? '',
    });
    indexedIds.add(file.id);
  };

  const remove = (id: string): void => {
    index.remove(id);
    indexedIds.delete(id);
    indexMetaMap.delete(id);
  };

  const updateMeta = (fileId: string, mtime: Date): void => {
    const meta: FileIndexMeta = {
      id: fileId,
      indexedAt: new Date().toISOString(),
      fileModifiedAt: mtime.toISOString(),
    };
    indexMetaMap.set(fileId, meta);
  };

  const extractIdsFromResults = (results: DefaultDocumentSearchResults): string[] => {
    const fileIds = new Set<string>();
    results.forEach((fieldResult) => {
      fieldResult.result.forEach((fileId) => fileIds.add(String(fileId)));
    });
    return [...fileIds];
  };

  const search = async (
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ files: FileMeta[]; total: number }> => {
    const results = index.search(query, { limit: indexedIds.size });
    const allIds = extractIdsFromResults(results);
    const paginatedIds = allIds.slice(offset, offset + limit);
    const files = await getFiles(paginatedIds);
    return { files, total: allIds.length };
  };

  const exportIndexData = (): Record<string, unknown> => {
    const indexData: Record<string, unknown> = {};
    index.export((key: string | number, data: unknown) => {
      if (data !== undefined) indexData[String(key)] = data;
    });
    return indexData;
  };

  const exportIndexedFiles = (): Record<string, FileIndexMeta> => {
    const files: Record<string, FileIndexMeta> = {};
    indexMetaMap.forEach((meta, id) => {
      if (indexedIds.has(id)) files[id] = meta;
    });
    return files;
  };

  const save = async (): Promise<void> => {
    const keyValueRepo = getKv();
    if (!keyValueRepo) return;
    const files = exportIndexedFiles();
    const indexData = exportIndexData();
    await keyValueRepo.set(
      FILE_INDEX_KEY,
      JSON.stringify({ version: INDEX_VERSION, files, indexData }),
    );
  };

  const load = async (): Promise<boolean> => {
    const keyValueRepo = getKv();
    if (!keyValueRepo) return false;

    const stored = await keyValueRepo.get(FILE_INDEX_KEY);
    if (!stored) return false;

    const result = to(JSON.parse)(stored);
    if (result.isErr()) return false;

    const parsed = result.value as StoredIndex;
    if (parsed.version !== INDEX_VERSION || !parsed.indexData) return false;
    if (Object.keys(parsed.indexData).length === 0) return false;

    Object.entries(parsed.indexData).forEach(([key, data]) => index.import(key, data as string));

    Object.entries(parsed.files).forEach(([id, meta]) => {
      indexMetaMap.set(id, meta);
      indexedIds.add(id);
    });

    return indexedIds.size > 0;
  };

  const clear = async (): Promise<void> => {
    const keyValueRepo = getKv();
    if (keyValueRepo) {
      await keyValueRepo.delete(FILE_INDEX_KEY);
    }
    [...indexedIds].forEach((id) => index.remove(id));
    indexedIds.clear();
    indexMetaMap.clear();
  };

  const ensureLoaded = async (): Promise<void> => {
    if (indexedIds.size > 0) return;
    const loaded = await load();
    if (loaded) return;
    indexMetaMap.clear();
  };

  return {
    add,
    remove,
    hasId: (id: string) => indexedIds.has(id),
    getMeta: (id: string) => indexMetaMap.get(id),
    updateMeta,
    search,
    save,
    load,
    clear,
    ensureLoaded,
    size: () => indexedIds.size,
    getStats: () => ({ indexed: indexedIds.size, total: indexedIds.size }),
  };
};
