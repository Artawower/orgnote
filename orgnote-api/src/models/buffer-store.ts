import type { ComputedRef, Ref } from 'vue';
import type { StoreDefinition } from './store';
import type { Buffer } from './buffer';

export interface BufferStore {
  buffers: Ref<Map<string, Buffer>>;

  allBuffers: ComputedRef<Buffer[]>;

  getOrCreateBuffer: (uri: string) => Promise<Buffer>;
  releaseBuffer: (uri: string) => void;
  closeBuffer: (uri: string, force?: boolean) => Promise<boolean>;
  getBufferByUri: (uri: string) => Buffer | undefined;
  saveAllBuffers: () => Promise<void>;
  cleanup: () => void;
}

export type BufferStoreDefinition = StoreDefinition<BufferStore>;
