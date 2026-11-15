import { test, expect } from 'vitest';
import { extractPathFromRoute } from './extract-path-from-route';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

const createMockRoute = (
  params?: Record<string, string | string[]>,
  name?: string,
): RouteLocationNormalizedLoaded => {
  return {
    params: params || {},
    fullPath: '',
    path: '',
    name: name,
    hash: '',
    query: {},
    matched: [],
    redirectedFrom: undefined,
    meta: {},
  } as RouteLocationNormalizedLoaded;
};

test('should build file URI from File route', () => {
  const route = createMockRoute({ path: 'notes/my-note.org' }, 'File');
  const result = extractPathFromRoute(route);
  expect(result).toBe('file://notes/my-note.org');
});

test('should build remote URI from Remote route', () => {
  const route = createMockRoute({ path: '/docs/info.org' }, 'Remote');
  const result = extractPathFromRoute(route);
  expect(result).toBe('remote:///docs/info.org');
});

test('should build embedded URI from Embedded route', () => {
  const route = createMockRoute({ path: '/docs/embedded.org' }, 'Embedded');
  const result = extractPathFromRoute(route);
  expect(result).toBe('embedded:///docs/embedded.org');
});

test('should extract path from array param', () => {
  const route = createMockRoute({ path: ['notes', 'folder', 'file.org'] }, 'File');
  const result = extractPathFromRoute(route);
  expect(result).toBe('file://notes/folder/file.org');
});

test('should return undefined when no params available', () => {
  const route = createMockRoute({});
  const result = extractPathFromRoute(route);
  expect(result).toBeUndefined();
});

test('should handle empty string param', () => {
  const route = createMockRoute({ path: '' });
  const result = extractPathFromRoute(route);
  expect(result).toBeUndefined();
});

test('should handle empty array param', () => {
  const route = createMockRoute({ path: [] });
  const result = extractPathFromRoute(route);
  expect(result).toBeUndefined();
});

test('should handle route without params', () => {
  const route = createMockRoute(undefined);
  const result = extractPathFromRoute(route);
  expect(result).toBeUndefined();
});

test('should handle null route', () => {
  const result = extractPathFromRoute(null as unknown as RouteLocationNormalizedLoaded);
  expect(result).toBeUndefined();
});

test('should handle array with single element', () => {
  const route = createMockRoute({ path: ['single.org'] }, 'File');
  const result = extractPathFromRoute(route);
  expect(result).toBe('file://single.org');
});

test('should default to file scheme for unknown route name', () => {
  const route = createMockRoute({ path: 'deep/path/to/file.org' });
  const result = extractPathFromRoute(route);
  expect(result).toBe('file://deep/path/to/file.org');
});

test('should handle array with multiple segments', () => {
  const route = createMockRoute({ path: ['a', 'b', 'c', 'file.org'] }, 'File');
  const result = extractPathFromRoute(route);
  expect(result).toBe('file://a/b/c/file.org');
});
