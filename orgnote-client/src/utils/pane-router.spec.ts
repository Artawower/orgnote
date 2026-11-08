import { RouteNames } from 'orgnote-api';
import { createPaneRouter } from './pane-router';
import { beforeEach, expect, test, vi } from 'vitest';
import type { Router, RouteLocationNormalized } from 'vue-router';

vi.mock('src/pages/InitialPage.vue', () => ({
  default: { name: 'InitialPage' },
}));

vi.mock('src/pages/FilePage.vue', () => ({
  default: { name: 'FilePage' },
}));

vi.mock('src/pages/AppBuffer.vue', () => ({
  default: { name: 'AppBuffer' },
}));

let router: Router;
const testTabId = 'test-tab-123';

beforeEach(async () => {
  router = await createPaneRouter(testTabId);
});

test('creates router with memory history', () => {
  expect(router).toBeDefined();
  expect(router.options.history.location).toBeDefined();
});

test('initializes with the owning tab scope', () => {
  expect(router.currentRoute.value.name).toBe(RouteNames.InitialPage);
  expect(router.currentRoute.value.params.tabId).toBe(testTabId);
});

test('has initial page route configured', () => {
  const initialPageRoute = router
    .getRoutes()
    .find((route) => route.name === RouteNames.InitialPage);

  expect(initialPageRoute).toBeDefined();
  expect(initialPageRoute?.path).toBe('/:tabId');
  expect(initialPageRoute?.meta?.titleGenerator).toBeDefined();
});

test('has file route configured', () => {
  const fileRoute = router.getRoutes().find((route) => route.name === RouteNames.File);

  expect(fileRoute).toBeDefined();
  expect(fileRoute?.path).toBe('/:tabId/file/:path(.*)');
  expect(fileRoute?.meta?.titleGenerator).toBeDefined();
});

test('has embedded route configured', () => {
  const embeddedRoute = router.getRoutes().find((route) => route.name === RouteNames.Embedded);

  expect(embeddedRoute).toBeDefined();
  expect(embeddedRoute?.path).toBe('/:tabId/embedded/:path(.*)');
  expect(embeddedRoute?.meta?.titleGenerator).toBeDefined();
});

test('initial page title generator returns empty string', () => {
  const initialPageRoute = router
    .getRoutes()
    .find((route) => route.name === RouteNames.InitialPage);
  const titleGenerator = initialPageRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const mockRoute = {
    params: {},
    query: {},
    hash: '',
    fullPath: '/test',
    path: '/test',
    name: RouteNames.InitialPage,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  if (!titleGenerator) {
    throw new Error('Expected titleGenerator to be defined');
  }
  expect(titleGenerator(mockRoute)).toBe('');
});

test('file title generator extracts filename from path', () => {
  const fileRoute = router.getRoutes().find((route) => route.name === RouteNames.File);
  const titleGenerator = fileRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const mockRoute = {
    params: { path: 'folder/subfolder/test-file.org' },
    query: {},
    hash: '',
    fullPath: '/test/file/folder/subfolder/test-file.org',
    path: '/test/file/folder/subfolder/test-file.org',
    name: RouteNames.File,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  if (!titleGenerator) {
    throw new Error('Expected titleGenerator to be defined');
  }
  expect(titleGenerator(mockRoute)).toBe('test-file.org');
});

test('file title generator returns empty string for empty path', () => {
  const fileRoute = router.getRoutes().find((route) => route.name === RouteNames.File);
  const titleGenerator = fileRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const mockRoute = {
    params: { path: '' },
    query: {},
    hash: '',
    fullPath: '/test/file/',
    path: '/test/file/',
    name: RouteNames.File,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  if (!titleGenerator) {
    throw new Error('Expected titleGenerator to be defined');
  }
  expect(titleGenerator(mockRoute)).toBe('');
});

test('file title generator returns default title for path without filename', () => {
  const fileRoute = router.getRoutes().find((route) => route.name === RouteNames.File);
  const titleGenerator = fileRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const mockRoute = {
    params: { path: 'folder/' },
    query: {},
    hash: '',
    fullPath: '/test/file/folder/',
    path: '/test/file/folder/',
    name: RouteNames.File,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  if (!titleGenerator) {
    throw new Error('Expected titleGenerator to be defined');
  }
  expect(titleGenerator(mockRoute)).toBe('Untitled');
});

test('can navigate to file route', async () => {
  const testPath = 'test/file.org';

  await router.push({
    name: RouteNames.File,
    params: {
      tabId: testTabId,
      path: testPath,
    },
  });

  expect(router.currentRoute.value.name).toBe(RouteNames.File);
  expect(router.currentRoute.value.params.tabId).toBe(testTabId);
  expect(router.currentRoute.value.params.path).toBe(testPath);
});

test('preserves a scoped Agenda buffer path', async () => {
  const agendaPath = '/agenda-tasks/day/2026-05-14';

  await router.push({
    name: RouteNames.Builtin,
    params: {
      tabId: testTabId,
      path: agendaPath,
    },
  });

  expect(router.currentRoute.value.name).toBe(RouteNames.Builtin);
  expect(router.currentRoute.value.params.path).toBe(agendaPath);
});

test('can navigate back to initial page', async () => {
  await router.push({
    name: RouteNames.File,
    params: {
      tabId: testTabId,
      path: 'test.org',
    },
  });

  await router.push({
    name: RouteNames.InitialPage,
    params: {
      tabId: testTabId,
    },
  });

  expect(router.currentRoute.value.name).toBe(RouteNames.InitialPage);
  expect(router.currentRoute.value.params.tabId).toBe(testTabId);
});

test('handles complex file paths correctly', () => {
  const fileRoute = router.getRoutes().find((route) => route.name === RouteNames.File);
  const titleGenerator = fileRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const complexPathRoute = {
    params: { path: 'documents/projects/2024/notes/meeting-notes.org' },
    query: {},
    hash: '',
    fullPath: '/test/file/documents/projects/2024/notes/meeting-notes.org',
    path: '/test/file/documents/projects/2024/notes/meeting-notes.org',
    name: RouteNames.File,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  if (!titleGenerator) {
    throw new Error('Expected titleGenerator to be defined');
  }
  expect(titleGenerator(complexPathRoute)).toBe('meeting-notes.org');
});
