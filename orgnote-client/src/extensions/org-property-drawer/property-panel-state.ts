import { readonly, shallowRef } from 'vue';
import type { PropertyScope } from './property-model';

const MAX_TRACKED_PANELS = 300;

const expandedHeadlinePanels = new Set<string>();
const collapsedPagePanels = new Set<string>();
const trackedPanelKeys: string[] = [];
const pendingAddRowRequests = shallowRef<Record<string, number>>({});
let nextAddRowRequestId = 0;

const rememberPanelKey = (key: string): void => {
  const existingIndex = trackedPanelKeys.indexOf(key);
  if (existingIndex >= 0) trackedPanelKeys.splice(existingIndex, 1);
  trackedPanelKeys.push(key);
  trimTrackedPanels();
};

const removePendingAddRowRequest = (stateKey: string): void => {
  const remainingRequests = { ...pendingAddRowRequests.value };
  delete remainingRequests[stateKey];
  pendingAddRowRequests.value = remainingRequests;
};

const trimTrackedPanels = (): void => {
  while (trackedPanelKeys.length > MAX_TRACKED_PANELS) {
    const staleKey = trackedPanelKeys.shift();
    if (!staleKey) return;
    expandedHeadlinePanels.delete(staleKey);
    collapsedPagePanels.delete(staleKey);
    removePendingAddRowRequest(staleKey);
  }
};

export const isPropertyPanelCollapsed = (
  scope: PropertyScope,
  stateKey: string,
  isEmpty: boolean,
): boolean => {
  if (isEmpty) return false;
  rememberPanelKey(stateKey);
  if (scope === 'page') return collapsedPagePanels.has(stateKey);
  return !expandedHeadlinePanels.has(stateKey);
};

export const expandPropertyPanel = (scope: PropertyScope, stateKey: string): void => {
  rememberPanelKey(stateKey);
  if (scope === 'page') {
    collapsedPagePanels.delete(stateKey);
    return;
  }
  expandedHeadlinePanels.add(stateKey);
};

export const togglePropertyPanel = (scope: PropertyScope, stateKey: string): void => {
  rememberPanelKey(stateKey);
  const targetSet = scope === 'page' ? collapsedPagePanels : expandedHeadlinePanels;
  if (targetSet.has(stateKey)) {
    targetSet.delete(stateKey);
    return;
  }
  targetSet.add(stateKey);
};

export const propertyAddRowRequests = readonly(pendingAddRowRequests);

export const requestPropertyAddRow = (stateKey: string): void => {
  rememberPanelKey(stateKey);
  nextAddRowRequestId += 1;
  pendingAddRowRequests.value = {
    ...pendingAddRowRequests.value,
    [stateKey]: nextAddRowRequestId,
  };
};

export const consumePropertyAddRowRequest = (stateKey: string): boolean => {
  if (!pendingAddRowRequests.value[stateKey]) return false;
  removePendingAddRowRequest(stateKey);
  return true;
};
