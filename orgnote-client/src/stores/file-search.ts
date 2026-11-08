import { defineStorageBoundStore } from 'src/infrastructure/stores/storage-bound-store';
import { ref, computed } from 'vue';
import type { FileMeta, FileSearchStore } from 'orgnote-api';
import { to } from 'orgnote-api';
import { uint8ArrayToText } from 'orgnote-api/utils';
import { parse, withMetaInfo } from 'org-mode-ast';
import { repositories } from 'src/boot/repositories';
import { invalidateCountCache } from 'src/stores/file-meta';
import { useQueueStore } from 'src/stores/queue';
import { useFileSystemStore } from 'src/stores/file-system';
import { api } from 'src/boot/api';
import { extractOrgTitleFromPath } from 'src/utils/extract-org-title-from-path';
import { extractFileTasks } from 'src/utils/extract-file-tasks';
import { logger } from 'src/boot/logger';
import { createFileSearchIndex } from 'src/infrastructure/search/file-search-index';
import { createFileSearchScanner } from 'src/infrastructure/search/file-search-scanner';

const SAVE_INDEX_EVERY_N = 10;

export const useFileSearchStore = defineStorageBoundStore<'fileSearch', FileSearchStore>('fileSearch', () => {
  let processedCount = 0;
  const searchIndex = createFileSearchIndex();
  const fs = useFileSystemStore();

  const scanner = createFileSearchScanner({
    hasIndexedId: (id) => searchIndex.hasId(id),
    getIndexMeta: (id) => searchIndex.getMeta(id),
    ensureIndexLoaded: () => searchIndex.ensureLoaded(),
    getFileInfo: (path) => fs.fileInfo(path),
    readDir: (path) => fs.readDir(path),
    getQueueStore: () => useQueueStore(),
  });

  const isSearching = ref(false);
  const isIndexing = ref(false);
  const lastSearchResult = ref<FileSearchStore['lastSearchResult']['value']>(null);

  const indexStats = computed(() => searchIndex.getStats());

  const performSearch = async (
    query: string,
    limit: number,
    offset: number,
  ): Promise<FileMeta[]> => {
    const { files, total } = await searchIndex.search(query, limit, offset);
    lastSearchResult.value = {
      files,
      total,
      query,
      searchedAt: Date.now(),
    };
    return files;
  };

  const search = async (
    query: string,
    options?: { limit?: number; offset?: number },
  ): Promise<FileMeta[]> => {
    const { limit = 20, offset = 0 } = options ?? {};

    if (!query.trim()) {
      lastSearchResult.value = null;
      return [];
    }

    isSearching.value = true;
    const result = await to(() => performSearch(query, limit, offset))();
    isSearching.value = false;

    if (result.isErr()) return [];
    return result.value;
  };

  const readFileContent = async (filePath: string): Promise<string> => {
    const fileContent = api.core.useFileContent();
    const raw = await fileContent.read(filePath);
    return uint8ArrayToText(raw);
  };

  const parseFile = (content: string, filePath: string): FileMeta => {
    const root = withMetaInfo(parse(content));
    const orgMeta = root.meta;
    const tasks = extractFileTasks(root, filePath);

    return {
      id: orgMeta.id ?? filePath,
      filePath: filePath.split('/').filter(Boolean),
      title: orgMeta.title,
      description: orgMeta.description,
      tags: orgMeta.fileTags,
      links: orgMeta.connectedNotes ? Object.keys(orgMeta.connectedNotes) : undefined,
      tasks,
      updatedAt: new Date().toISOString(),
    };
  };

  const createMetaFromPath = (filePath: string): FileMeta => ({
    id: filePath,
    filePath: filePath.split('/').filter(Boolean),
    title: extractOrgTitleFromPath(filePath),
    tasks: [],
    updatedAt: new Date().toISOString(),
  });

  const removeStaleRecord = async (meta: FileMeta): Promise<void> => {
    const existingByPath = await repositories.fileRepository.getByPath(meta.filePath);
    if (!existingByPath || existingByPath.id === meta.id) return;

    searchIndex.remove(existingByPath.id);
    invalidateCountCache();
    await repositories.fileRepository.delete(existingByPath.id);
  };

  const processFile = async (filePath: string): Promise<void> => {
    const readResult = await to(() => readFileContent(filePath))();
    if (readResult.isErr()) return;
    const content = readResult.value;

    const meta = content.length > 0 ? parseFile(content, filePath) : createMetaFromPath(filePath);

    await removeStaleRecord(meta);

    invalidateCountCache();
    await repositories.fileRepository.save(meta);
    searchIndex.add(meta, content);

    const mtime = await scanner.getFileMtime(filePath);
    if (mtime) searchIndex.updateMeta(meta.id, mtime);

    processedCount++;
    if (processedCount % SAVE_INDEX_EVERY_N !== 0) return;
    await searchIndex.save();
  };

  const resolveFileId = async (
    target: { id: string } | { path: string[] },
  ): Promise<string | undefined> => {
    if ('id' in target) return target.id;
    const file = await repositories.fileRepository.getByPath(target.path);
    return file?.id;
  };

  const removeFile = async (target: { id: string } | { path: string[] }): Promise<void> => {
    const id = await resolveFileId(target);
    if (!id) return;

    searchIndex.remove(id);
    invalidateCountCache();
    await repositories.fileRepository.delete(id);
  };

  const indexFiles = async (): Promise<void> => {
    isIndexing.value = true;
    const result = await to(scanner.scanAllFilesUntilQueueDrain)();
    isIndexing.value = false;
    processedCount = 0;
    if (result.isErr() && result.error.name !== 'AbortError') {
      logger.error('File indexing failed before the queue became idle', { error: result.error });
    }
  };

  return {
    isSearching,
    isIndexing,
    lastSearchResult,
    indexStats,
    search,
    indexFile: scanner.indexFile,
    indexFiles,
    processFile,
    removeFile,
    loadIndex: searchIndex.load,
    saveIndex: searchIndex.save,
    clearIndex: searchIndex.clear,
    $resetStorage: searchIndex.clear,
  };
});
