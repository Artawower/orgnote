import type {
  BufferViewStateHandle,
  SerializableViewState,
} from 'orgnote-api';
import { defineStore } from 'pinia';

export interface BufferViewStateScope {
  readonly tabId: string;
  readonly bufferUri: string;
  readonly viewerId: string;
  readonly version: number;
}

interface StoredBufferViewState {
  readonly scope: BufferViewStateScope;
  readonly value: SerializableViewState;
}

const MAX_VIEW_STATE_ENTRIES = 100;

const createStateKey = (scope: BufferViewStateScope): string =>
  JSON.stringify([scope.tabId, scope.bufferUri, scope.viewerId, scope.version]);

const cloneState = <TState extends SerializableViewState>(state: TState): TState =>
  structuredClone(state);

export const useBufferViewStateStore = defineStore('buffer-view-state', () => {
  const entries = new Map<string, StoredBufferViewState>();
  const tabTokens = new Map<string, symbol>();
  const viewerTokens = new Map<string, symbol>();

  const pruneOldest = (): void => {
    if (entries.size <= MAX_VIEW_STATE_ENTRIES) return;
    const oldestKey = entries.keys().next().value;
    if (typeof oldestKey === 'string') entries.delete(oldestKey);
  };

  const setState = (scope: BufferViewStateScope, value: SerializableViewState): void => {
    const key = createStateKey(scope);
    entries.delete(key);
    entries.set(key, { scope, value: cloneState(value) });
    pruneOldest();
  };

  const getState = (scope: BufferViewStateScope): SerializableViewState | undefined => {
    const key = createStateKey(scope);
    const stored = entries.get(key);
    if (!stored) return;
    entries.delete(key);
    entries.set(key, stored);
    return cloneState(stored.value);
  };

  const clearScope = (scope: BufferViewStateScope): void => {
    entries.delete(createStateKey(scope));
  };

  const resolveToken = (tokens: Map<string, symbol>, id: string): symbol => {
    const current = tokens.get(id);
    if (current) return current;
    const token = Symbol(id);
    tokens.set(id, token);
    return token;
  };

  const createHandle = <TState extends SerializableViewState>(
    scope: BufferViewStateScope,
  ): BufferViewStateHandle<TState> => {
    const tabToken = resolveToken(tabTokens, scope.tabId);
    const viewerToken = resolveToken(viewerTokens, scope.viewerId);
    const isCurrent = (): boolean =>
      tabToken === tabTokens.get(scope.tabId) && viewerToken === viewerTokens.get(scope.viewerId);
    return {
      get: () => (isCurrent() ? (getState(scope) as TState | undefined) : undefined),
      set: (state) => {
        if (isCurrent()) setState(scope, state);
      },
      clear: () => {
        if (isCurrent()) clearScope(scope);
      },
    };
  };

  const clearMatching = (predicate: (scope: BufferViewStateScope) => boolean): void => {
    [...entries.entries()]
      .filter(([, stored]) => predicate(stored.scope))
      .forEach(([key]) => entries.delete(key));
  };

  const clearTab = (tabId: string): void => {
    clearMatching((scope) => scope.tabId === tabId);
    tabTokens.delete(tabId);
  };

  const clearViewer = (viewerId: string): void => {
    clearMatching((scope) => scope.viewerId === viewerId);
    viewerTokens.delete(viewerId);
  };

  return {
    createHandle,
    clearTab,
    clearViewer,
  };
});
