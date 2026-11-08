import type { FileSystemChange } from './file-system';
import type { BufferScheme } from './buffer-uri';

export interface BufferContext {
  title?: string;
  icon?: string;
  [key: string]: unknown;
}

export interface BufferProvider {
  readonly scheme: BufferScheme;

  read(path: string): Promise<Uint8Array>;
  write?(path: string, content: Uint8Array): Promise<void>;
  watch?(path: string, callback: (change: FileSystemChange) => void): () => void;

  getContext?(path: string): BufferContext;
}
