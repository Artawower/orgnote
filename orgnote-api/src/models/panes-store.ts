import { Ref, ShallowRef, ComputedRef } from 'vue';
import { StoreDefinition } from './store';
import { InitialTabParams, Tab, Pane, PaneSnapshot } from './pane';
import type { RouteLocationRaw, RouteLocationNormalizedLoaded } from 'vue-router';

export interface ActiveBufferSnapshot {
  readonly paneId?: string;
  readonly tabId?: string;
  readonly uri?: string;
}

export interface BufferActivatedEvent {
  readonly current: ActiveBufferSnapshot;
  readonly previous?: ActiveBufferSnapshot;
}

export interface BufferActivationSubscriptionOptions {
  readonly immediate?: boolean;
}

export type BufferActivationCallback = (
  event: BufferActivatedEvent
) => void | Promise<void>;

export type BufferActivationUnsubscribe = () => void;

export interface PaneStore {
  panes: Ref<Record<string, ShallowRef<Pane>>>;
  activePaneId: Ref<string | undefined>;
  activePane: ComputedRef<Pane | undefined>;
  activeTab: ComputedRef<Tab | undefined>;
  activeRoute: ComputedRef<RouteLocationNormalizedLoaded | undefined>;
  activeBufferUri: ComputedRef<string | undefined>;
  activeTabTitle: ComputedRef<string>;
  afterBufferActivated: (
    callback: BufferActivationCallback,
    options?: BufferActivationSubscriptionOptions
  ) => BufferActivationUnsubscribe;

  createPane: (params?: Partial<Pane>) => Promise<Pane>;
  getPane: (id: string) => ShallowRef<Pane>;
  closePane: (paneId: string) => void;
  setActivePane: (paneId: string) => void;

  isDraggingTab: Ref<boolean>;
  draggedTabData: Ref<{ tabId: string; paneId: string } | undefined>;
  initNewTab: (params?: InitialTabParams) => Promise<Tab>;
  addTab: (
    paneId: string,
    params?: InitialTabParams
  ) => Promise<Tab | undefined>;
  closeTab: (paneId: string, tabId: string) => Promise<boolean>;
  selectTab: (paneId: string, tabId: string) => void;
  moveTab: (
    tabId: string,
    fromPaneId: string,
    toPaneId: string,
    index?: number
  ) => Promise<Tab | undefined>;
  navigate: (
    params: RouteLocationRaw,
    paneId?: string,
    tabId?: string
  ) => Promise<void>;

  startDraggingTab: (tabId: string, paneId: string) => void;
  stopDraggingTab: () => void;

  getPanesData: () => PaneSnapshot[];
  restorePanesData: (panes: PaneSnapshot[]) => Promise<void>;
}

export type PaneStoreDefinition = StoreDefinition<PaneStore>;
