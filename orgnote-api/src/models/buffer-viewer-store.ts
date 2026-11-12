import type { Component } from 'vue';
import type { StoreDefinition } from './store';

export type BufferViewerComponent = Component | (() => Promise<Component>);

export type SerializableViewState =
  | null
  | boolean
  | number
  | string
  | readonly SerializableViewState[]
  | { readonly [key: string]: SerializableViewState };

export interface BufferViewStateHandle<
  TState extends SerializableViewState = SerializableViewState,
> {
  get: () => TState | undefined;
  set: (state: TState) => void;
  clear: () => void;
}

export interface ViewerViewStateConfig {
  version: number;
}

export interface ViewerMeta {
  id: string;
  name: string;
  icon?: string;
  priority?: number;
  viewState?: ViewerViewStateConfig;
}

export interface BufferViewerEntry {
  pattern: string;
  component: BufferViewerComponent;
  meta: ViewerMeta;
}

export interface BufferViewerStore {
  register: (entry: BufferViewerEntry) => void;

  unregister: (viewerId: string) => void;

  getViewers: (path: string) => BufferViewerEntry[];

  getViewer: (path: string) => BufferViewerEntry | undefined;

  open: (uri: string) => Promise<void>;

  openInNewTab: (uri: string) => Promise<void>;

  openInAdjacentPane: (uri: string) => Promise<void>;

  showOrOpen: (uri: string) => Promise<void>;
}

export type BufferViewerStoreDefinition = StoreDefinition<BufferViewerStore>;
