import { test, expect } from 'vitest';
import { resolveTabFileActionData } from './use-tab-context-menu';
import type { Tab } from 'orgnote-api';
import type { Router, RouteLocationNormalizedLoadedGeneric } from 'vue-router';
import { ref } from 'vue';

const createMockTab = (
  routeParams?: Record<string, string | string[]>,
  routeName?: string,
): Tab =>
  ({
    id: 'tab-1',
    title: 'Test Tab',
    paneId: 'pane-1',
    router: {
      currentRoute: ref({
        params: routeParams ?? {},
        fullPath: '',
        path: '',
        name: routeName,
        hash: '',
        query: {},
        matched: [],
        redirectedFrom: undefined,
        meta: {},
      } as RouteLocationNormalizedLoadedGeneric),
    } as unknown as Router,
  }) satisfies Tab;

test('resolveTabFileActionData returns undefined when route has no path param', () => {
  const tab = createMockTab({});
  expect(resolveTabFileActionData(tab)).toBeUndefined();
});

test('resolveTabFileActionData returns undefined for non-file scheme', () => {
  const tab = createMockTab({ path: 'docs/note.org' }, 'Remote');
  expect(resolveTabFileActionData(tab)).toBeUndefined();
});

test('resolveTabFileActionData returns undefined for embedded scheme', () => {
  const tab = createMockTab({ path: 'docs/note.org' }, 'Embedded');
  expect(resolveTabFileActionData(tab)).toBeUndefined();
});

test('resolveTabFileActionData returns action data for file scheme', () => {
  const tab = createMockTab({ path: 'notes/my-note.org' }, 'File');
  const result = resolveTabFileActionData(tab);

  expect(result).toEqual({
    path: 'notes/my-note.org',
    paths: ['notes/my-note.org'],
    interactive: true,
  });
});

test('resolveTabFileActionData returns action data for unknown route (defaults to file)', () => {
  const tab = createMockTab({ path: 'notes/default.org' });
  const result = resolveTabFileActionData(tab);

  expect(result).toEqual({
    path: 'notes/default.org',
    paths: ['notes/default.org'],
    interactive: true,
  });
});

test('resolveTabFileActionData returns undefined for empty path param', () => {
  const tab = createMockTab({ path: '' });
  expect(resolveTabFileActionData(tab)).toBeUndefined();
});

test('resolveTabFileActionData handles array path param for file route', () => {
  const tab = createMockTab({ path: ['folder', 'sub', 'note.org'] }, 'File');
  const result = resolveTabFileActionData(tab);

  expect(result).toEqual({
    path: 'folder/sub/note.org',
    paths: ['folder/sub/note.org'],
    interactive: true,
  });
});
