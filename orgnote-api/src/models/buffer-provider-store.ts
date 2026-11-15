import type { BufferProvider } from './buffer-provider';
import type { BufferScheme } from './buffer-uri';
import type { StoreDefinition } from './store';

export interface BufferProviderStore {
  register(provider: BufferProvider): void;
  unregister(scheme: BufferScheme): void;
  get(scheme: BufferScheme): BufferProvider | undefined;
}

export type BufferProviderStoreDefinition = StoreDefinition<BufferProviderStore>;
