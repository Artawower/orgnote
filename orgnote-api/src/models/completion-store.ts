import { ComputedRef, Ref } from 'vue';
import {
  Completion,
  CompletionConfig,
  CompletionInterceptor,
} from './completion';
import { StoreDefinition } from './store';

export interface CompletionStore {
  restore: () => void;
  close: <TData = unknown>(data?: TData) => Promise<boolean>;
  closeAll: () => void;
  open: <TItem, TReturn = void>(
    config: CompletionConfig<TItem>,
  ) => Promise<TReturn>;
  activeCompletion: ComputedRef<Completion | undefined>;
  nextCandidate: () => void;
  previousCandidate: () => void;
  canAcceptAutocomplete: () => boolean;
  acceptAutocomplete: () => void;
  search: (limit?: number, offset?: number) => Promise<void>;
  registerInterceptor: <T = unknown>(
    interceptor: CompletionInterceptor<T>,
  ) => () => void;
  isLoading: Readonly<Ref<boolean>>;
}

export type CompletionStoreDefinition = StoreDefinition<CompletionStore>;
