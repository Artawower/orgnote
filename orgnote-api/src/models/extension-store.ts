import type { ComputedRef, Ref } from 'vue';
import {
  Extension,
  ExtensionMeta,
  ExtensionSource,
  ExtensionSourceInfo,
} from './extension';
import { StoreDefinition } from './store';

export interface ExtensionStore {
  ready: Ref<boolean>;
  extensions: Ref<ExtensionMeta[]>;

  sync: () => Promise<void>;

  enableExtension: (extensionName: string) => Promise<void>;
  disableExtension: (extensionName: string) => Promise<void>;

  enableSafeMode: () => Promise<void>;
  disableSafeMode: () => Promise<void>;

  isExtensionExist: (extensionName: string) => boolean;

  installExtension: (source: ExtensionSourceInfo) => Promise<void>;

  addExtension: (meta: ExtensionMeta, source: ExtensionSource) => Promise<void>;

  importExtension: (file: File) => Promise<void>;

  deleteExtension: (extensionName: string) => Promise<void>;

  getExtensionConfig: (
    name: string
  ) => ComputedRef<Readonly<Record<string, unknown>>>;
  setExtensionConfig: (
    name: string,
    config: Record<string, unknown>
  ) => Promise<void>;
  hasExtensionSettings: (name: string) => boolean;
  getActiveExtensionModule: (name: string) => Extension | undefined;
}

export type ExtensionStoreDefinition = StoreDefinition<ExtensionStore>;
