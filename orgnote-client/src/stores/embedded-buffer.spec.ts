import { test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEmbeddedBufferStore } from './embedded-buffer';
import { EMBEDDED_SCHEME } from 'src/constants/embedded-buffer';

beforeEach(() => {
  setActivePinia(createPinia());
});

test('create() generates unique path with prefix and scheme', () => {
  const store = useEmbeddedBufferStore();
  const text = 'test content';
  const uri = store.create(text);

  expect(uri).toContain(EMBEDDED_SCHEME);
  expect(uri).toContain('/embedded/');
  expect(uri.endsWith('.org')).toBe(true);
});

test('get() returns stored content', () => {
  const store = useEmbeddedBufferStore();
  const text = 'hello world';
  const uri = store.create(text);
  const path = uri.replace(EMBEDDED_SCHEME, '');

  expect(store.get(path)).toBe(text);
});

test('remove() clears stored content', () => {
  const store = useEmbeddedBufferStore();
  const text = 'to be removed';
  const uri = store.create(text);
  const path = uri.replace(EMBEDDED_SCHEME, '');

  store.remove(path);
  expect(store.get(path)).toBeUndefined();
});

test('get() returns undefined for non-existent path', () => {
  const store = useEmbeddedBufferStore();
  expect(store.get('/embedded/non-existent.org')).toBeUndefined();
});

test('create() generates different IDs for different calls', () => {
  const store = useEmbeddedBufferStore();
  const uri1 = store.create('content 1');
  const uri2 = store.create('content 2');

  expect(uri1).not.toBe(uri2);
});
