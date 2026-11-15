import type { StoreDefinition } from './store';

export interface EmbeddedBufferStore {
  create(text: string): string;
  get(path: string): string | undefined;
  remove(path: string): void;
}

export type EmbeddedBufferStoreDefinition = StoreDefinition<EmbeddedBufferStore>;
