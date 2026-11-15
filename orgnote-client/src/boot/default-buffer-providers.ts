import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';
import { createFileSystemBufferProvider } from 'src/infrastructure/buffer-providers/file-system-buffer-provider';
import { createRemoteBufferProvider } from 'src/infrastructure/buffer-providers/remote-buffer-provider';
import { createEmbeddedBufferProvider } from 'src/infrastructure/buffer-providers/embedded-buffer-provider';
import { createBuiltinBufferProvider } from 'src/infrastructure/buffer-providers/builtin-buffer-provider';

export default defineBoot(() => {
  const providerStore = api.core.useBufferProviders();

  providerStore.register(createFileSystemBufferProvider());
  providerStore.register(createRemoteBufferProvider());
  providerStore.register(createEmbeddedBufferProvider());
  providerStore.register(createBuiltinBufferProvider());
});
