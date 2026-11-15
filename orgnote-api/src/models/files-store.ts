import { StoreDefinition } from './store';

export interface FilesStore {
  getBlobUrl: (filePath: string) => Promise<string>;
  uploadMediaFile: (path?: string) => Promise<string>;
  saveFile: (file: File, path?: string) => Promise<string>;
}

export type FilesStoreDefinition = StoreDefinition<FilesStore>;
