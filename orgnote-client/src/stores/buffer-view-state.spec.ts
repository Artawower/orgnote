import { beforeEach, expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useBufferViewStateStore, type BufferViewStateScope } from './buffer-view-state';

const createScope = (overrides: Partial<BufferViewStateScope> = {}): BufferViewStateScope => ({
  tabId: 'tab-1',
  bufferUri: 'file:///notes/example.org',
  viewerId: 'builtin:org-rich-editor',
  version: 1,
  ...overrides,
});

beforeEach(() => {
  setActivePinia(createPinia());
});

test('view state is isolated between tabs showing the same buffer', () => {
  const store = useBufferViewStateStore();
  const firstTab = store.createHandle(createScope());
  const secondTab = store.createHandle(createScope({ tabId: 'tab-2' }));

  firstTab.set({ cursor: 12 });
  secondTab.set({ cursor: 48 });

  expect(firstTab.get()).toEqual({ cursor: 12 });
  expect(secondTab.get()).toEqual({ cursor: 48 });
});

test('view state is isolated by buffer, viewer, and schema version', () => {
  const store = useBufferViewStateStore();
  const original = store.createHandle(createScope());
  original.set({ cursor: 12 });

  expect(
    store.createHandle(createScope({ bufferUri: 'file:///notes/other.org' })).get(),
  ).toBeUndefined();
  expect(store.createHandle(createScope({ viewerId: 'builtin:text-editor' })).get()).toBeUndefined();
  expect(store.createHandle(createScope({ version: 2 })).get()).toBeUndefined();
});

test('view state copies serializable values on set and get', () => {
  const handle = useBufferViewStateStore().createHandle(createScope());
  const value = { selection: { anchor: 4, head: 8 } };

  handle.set(value);
  value.selection.anchor = 20;
  const restored = handle.get() as typeof value;
  restored.selection.head = 30;

  expect(handle.get()).toEqual({ selection: { anchor: 4, head: 8 } });
});

test('reading view state refreshes its LRU position', () => {
  const store = useBufferViewStateStore();
  const retained = store.createHandle(createScope({ tabId: 'retained' }));
  retained.set({ cursor: 1 });

  Array.from({ length: 99 }, (_, index) => index).forEach((index) => {
    store.createHandle(createScope({ tabId: `tab-${index}` })).set({ cursor: index });
  });
  retained.get();
  store.createHandle(createScope({ tabId: 'overflow' })).set({ cursor: 100 });

  expect(retained.get()).toEqual({ cursor: 1 });
  expect(store.createHandle(createScope({ tabId: 'tab-0' })).get()).toBeUndefined();
});

test('clearTab invalidates handles from the unmounted tab generation', () => {
  const store = useBufferViewStateStore();
  const staleHandle = store.createHandle(createScope());
  staleHandle.set({ cursor: 1 });

  store.clearTab('tab-1');
  staleHandle.set({ cursor: 2 });
  const currentHandle = store.createHandle(createScope());

  expect(currentHandle.get()).toBeUndefined();
  currentHandle.set({ cursor: 3 });
  expect(currentHandle.get()).toEqual({ cursor: 3 });
});

test('clearTab removes every state owned by the closed tab', () => {
  const store = useBufferViewStateStore();
  store.createHandle(createScope()).set({ cursor: 1 });
  store.createHandle(createScope({ bufferUri: 'file:///notes/other.org' })).set({ cursor: 2 });
  const otherTab = store.createHandle(createScope({ tabId: 'tab-2' }));
  otherTab.set({ cursor: 3 });

  store.clearTab('tab-1');

  expect(store.createHandle(createScope()).get()).toBeUndefined();
  expect(
    store.createHandle(createScope({ bufferUri: 'file:///notes/other.org' })).get(),
  ).toBeUndefined();
  expect(otherTab.get()).toEqual({ cursor: 3 });
});
