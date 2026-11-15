import { ShallowRef } from 'vue';
import type { Router } from 'vue-router';
import type { LayoutNode } from './layout';

export interface Pane {
  id: string;
  activeTabId: string;
  tabs: ShallowRef<Record<string, Tab>>;
}

export interface Tab {
  title: string;
  id: string;
  paneId: string;
  router: Router;
}

export type InitialTabParams = Partial<Pick<Tab, 'title' | 'id' | 'paneId'>>;

export interface TabSnapshot {
  id: string;
  title: string;
  paneId: string;
  routeLocation: {
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
    hash: string;
    name?: string;
  };
}

export interface PaneSnapshot {
  id: string;
  activeTabId: string;
  tabs: TabSnapshot[];
}

export interface LayoutSnapshot {
  panes: PaneSnapshot[];
  activePaneId: string;
  timestamp: number;
  layout: LayoutNode;
}
