import { test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBufferProviderStore } from './buffer-provider';
import type { BufferProvider } from 'orgnote-api';

const createMockProvider = (scheme: string): BufferProvider => ({
  scheme,
  read: async () => new Uint8Array(0),
});

beforeEach(() => {
  setActivePinia(createPinia());
});

test('register adds provider to store', () => {
  const store = useBufferProviderStore();
  const provider = createMockProvider('test');

  store.register(provider);

  expect(store.get('test')).toBe(provider);
});

test('get returns undefined for unregistered scheme', () => {
  const store = useBufferProviderStore();

  expect(store.get('nonexistent')).toBeUndefined();
});

test('unregister removes provider from store', () => {
  const store = useBufferProviderStore();
  const provider = createMockProvider('removable');

  store.register(provider);
  expect(store.get('removable')).toBe(provider);

  store.unregister('removable');
  expect(store.get('removable')).toBeUndefined();
});

test('register overwrites existing provider with same scheme', () => {
  const store = useBufferProviderStore();
  const provider1 = createMockProvider('duplicate');
  const provider2 = createMockProvider('duplicate');

  store.register(provider1);
  store.register(provider2);

  expect(store.get('duplicate')).toBe(provider2);
});

test('unregister does nothing for unregistered scheme', () => {
  const store = useBufferProviderStore();

  expect(() => store.unregister('nonexistent')).not.toThrow();
});

test('multiple providers can be registered with different schemes', () => {
  const store = useBufferProviderStore();
  const fileProvider = createMockProvider('file');
  const memoryProvider = createMockProvider('memory');
  const embeddedProvider = createMockProvider('embedded');

  store.register(fileProvider);
  store.register(memoryProvider);
  store.register(embeddedProvider);

  expect(store.get('file')).toBe(fileProvider);
  expect(store.get('memory')).toBe(memoryProvider);
  expect(store.get('embedded')).toBe(embeddedProvider);
});
