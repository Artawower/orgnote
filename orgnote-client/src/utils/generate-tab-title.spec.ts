import { test, expect, vi } from 'vitest';
import { generateTabTitle } from './generate-tab-title';
import type { RouteLocationNormalized } from 'vue-router';

const createMockRoute = (overrides: Partial<RouteLocationNormalized>): RouteLocationNormalized => ({
  path: '/',
  name: 'test',
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {},
  redirectedFrom: undefined,
  ...overrides,
});

test('returns title from titleGenerator in meta when available', () => {
  const route = createMockRoute({
    meta: {
      titleGenerator: () => 'Custom Title',
    },
  });

  expect(generateTabTitle(route)).toBe('Custom Title');
});

test('titleGenerator receives route as parameter', () => {
  const titleGenerator = vi.fn().mockReturnValue('Generated Title');
  const route = createMockRoute({
    params: { path: 'test/file.org' },
    meta: { titleGenerator },
  });

  generateTabTitle(route);

  expect(titleGenerator).toHaveBeenCalledWith(route);
});

test('extracts filename from EditNote route path parameter', () => {
  const route = createMockRoute({
    name: 'EditNote',
    params: { path: 'folder/my-note.org' },
    meta: {
      titleGenerator: (route: RouteLocationNormalized) => {
        const filePath = route.params.path as string;
        if (!filePath) return 'Untitled';
        const fileName = filePath.split('/').pop();
        return fileName || 'Untitled';
      },
    },
  });

  expect(generateTabTitle(route)).toBe('my-note.org');
});

test('handles path with nested folders correctly', () => {
  const route = createMockRoute({
    params: { path: 'folder/subfolder/deeply/nested/note.org' },
    meta: {
      titleGenerator: (route: RouteLocationNormalized) => {
        const filePath = route.params.path as string;
        const fileName = filePath.split('/').pop();
        return fileName || 'Untitled';
      },
    },
  });

  expect(generateTabTitle(route)).toBe('note.org');
});

test('returns Untitled when path parameter is empty', () => {
  const route = createMockRoute({
    params: { path: '' },
    meta: {
      titleGenerator: (route: RouteLocationNormalized) => {
        const filePath = route.params.path as string;
        if (!filePath) return 'Untitled';
        const fileName = filePath.split('/').pop();
        return fileName || 'Untitled';
      },
    },
  });

  expect(generateTabTitle(route)).toBe('Untitled');
});

test('returns Untitled when no titleGenerator in meta', () => {
  const route = createMockRoute({
    meta: {},
  });

  expect(generateTabTitle(route)).toBe('Untitled');
});

test('returns Untitled when titleGenerator is not a function', () => {
  const route = createMockRoute({
    meta: {
      titleGenerator: 'not a function' as unknown as (route: RouteLocationNormalized) => string,
    },
  });

  expect(generateTabTitle(route)).toBe('Untitled');
});

test('handles route without meta property', () => {
  const route = createMockRoute({});
  delete (route as { meta?: unknown }).meta;

  expect(generateTabTitle(route)).toBe('Untitled');
});
