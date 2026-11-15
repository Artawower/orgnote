import type { BufferProvider, BufferContext, FileSystemChange } from 'orgnote-api';
import { api } from 'src/boot/api';
import { useFileWatcherStore } from 'src/stores/file-watcher';
import { createTitleExtractor } from './extract-title';

const extractTitleFromPath = createTitleExtractor('Untitled');

export const createFileSystemBufferProvider = (): BufferProvider => ({
  scheme: 'file',

  async read(path: string): Promise<Uint8Array> {
    const fileContent = api.core.useFileContent();
    return fileContent.read(path);
  },

  async write(path: string, content: Uint8Array): Promise<void> {
    const fileContent = api.core.useFileContent();
    return fileContent.write(path, content);
  },

  watch(path: string, callback: (change: FileSystemChange) => void): () => void {
    const fileWatcher = useFileWatcherStore();
    return fileWatcher.watch(path, callback);
  },

  getContext(path: string): BufferContext {
    return {
      title: extractTitleFromPath(path),
    };
  },
});
