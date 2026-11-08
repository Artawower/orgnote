import { defineStore } from 'pinia';
import type { BufferProviderStore, BufferProvider, BufferScheme } from 'orgnote-api';

export const useBufferProviderStore = defineStore<string, BufferProviderStore>(
  'buffer-providers',
  (): BufferProviderStore => {
    const providers = new Map<BufferScheme, BufferProvider>();

    const register = (provider: BufferProvider): void => {
      providers.set(provider.scheme, provider);
    };

    const unregister = (scheme: BufferScheme): void => {
      providers.delete(scheme);
    };

    const get = (scheme: BufferScheme): BufferProvider | undefined => providers.get(scheme);

    return {
      register,
      unregister,
      get,
    };
  },
);
