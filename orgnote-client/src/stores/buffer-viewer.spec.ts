import { test, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { defineComponent, shallowRef } from 'vue';
import type { LayoutNode } from 'orgnote-api';

const mockNavigate = vi.fn();
const mockAddTab = vi.fn();
const mockSelectTab = vi.fn();
const mockSetActivePane = vi.fn();
const mockSplitPaneInLayout = vi.fn();
const mockLayout = { value: undefined as LayoutNode | undefined };
let mockActivePaneId: string | undefined = 'pane-1';
let mockActiveTab: { id?: string; router: object } | undefined = { router: {} };
let mockPanes: Record<string, ReturnType<typeof shallowRef>> = {};
const mockConfig = {
  fileReaders: {
    preferredReaders: {} as Record<string, string>,
  },
  ui: {
    reuseExistingBuffers: false,
  },
};

vi.mock('./pane', () => ({
  usePaneStore: () => ({
    navigate: mockNavigate,
    addTab: mockAddTab,
    selectTab: mockSelectTab,
    setActivePane: mockSetActivePane,
    get panes() {
      return mockPanes;
    },
    get activePaneId() {
      return mockActivePaneId;
    },
    get activeTab() {
      return mockActiveTab;
    },
  }),
}));

vi.mock('./config', () => ({
  useConfigStore: () => ({
    config: mockConfig,
  }),
}));

vi.mock('./layout', () => ({
  useLayoutStore: () => ({
    get layout() {
      return mockLayout.value;
    },
    splitPaneInLayout: mockSplitPaneInLayout,
  }),
}));

vi.mock('./index', () => ({}));

vi.mock('src/boot/api', () => ({
  api: {},
}));

vi.mock('src/boot/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('src/boot/repositories', () => ({
  repositories: {},
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError: vi.fn(),
  },
}));

const { useBufferViewerStore } = await import('./buffer-viewer');
const { useBufferViewStateStore } = await import('./buffer-view-state');

const createMockComponent = (name: string) => defineComponent({ name, template: '<div />' });

const POMODORO_URI = 'builtin:///agenda/pomodoro';

const createPomodoroTab = (id: string, paneId: string) => ({
  id,
  paneId,
  router: {
    currentRoute: shallowRef({ name: 'Builtin', params: { path: '/agenda/pomodoro' } }),
  },
});

const addMockPane = (paneId: string, tabs: ReturnType<typeof createPomodoroTab>[]): void => {
  const activeTabId = tabs[0]?.id ?? '';
  mockPanes[paneId] = shallowRef({
    activeTabId,
    id: paneId,
    tabs: shallowRef(Object.fromEntries(tabs.map((tab) => [tab.id, tab]))),
  });
};

beforeEach(() => {
  setActivePinia(createPinia());
  mockNavigate.mockReset();
  mockAddTab.mockReset();
  mockSelectTab.mockReset();
  mockSetActivePane.mockReset();
  mockSplitPaneInLayout.mockReset();
  mockSetActivePane.mockImplementation((paneId: string) => {
    mockActivePaneId = paneId;
  });
  mockActivePaneId = 'pane-1';
  mockActiveTab = { router: {} };
  mockPanes = {};
  mockLayout.value = undefined;
  mockConfig.fileReaders.preferredReaders = {};
  mockConfig.ui.reuseExistingBuffers = false;
});

test('register reuses one async component wrapper for a viewer loader', () => {
  const store = useBufferViewerStore();
  const loader = vi.fn(async () => createMockComponent('AsyncViewer'));

  store.register({
    pattern: '\\.org$',
    component: loader,
    meta: { id: 'test:async-org', name: 'Async Org Viewer' },
  });

  const firstComponent = store.getViewer('first.org')?.component;
  const secondComponent = store.getViewer('second.org')?.component;

  expect(firstComponent).toBe(secondComponent);
  expect(firstComponent).not.toBe(loader);
});

test('register adds a viewer correctly', () => {
  const store = useBufferViewerStore();
  const mockComponent = createMockComponent('OrgViewer');

  store.register({
    pattern: '\\.org$',
    component: mockComponent,
    meta: { id: 'test:org', name: 'Org Viewer' },
  });

  const viewer = store.getViewer('test.org');
  expect(viewer).toBeDefined();
  expect(viewer?.meta.id).toBe('test:org');
});

test('getViewers returns all matching viewers sorted by priority', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('LowPriority'),
    meta: { id: 'test:low', name: 'Low Priority', priority: 5 },
  });

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('HighPriority'),
    meta: { id: 'test:high', name: 'High Priority', priority: 20 },
  });

  const viewers = store.getViewers('test.org');
  expect(viewers).toHaveLength(2);
  expect(viewers[0]?.meta.id).toBe('test:high');
  expect(viewers[1]?.meta.id).toBe('test:low');
});

test('getViewer returns highest priority viewer', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.md$',
    component: createMockComponent('Default'),
    meta: { id: 'builtin:md', name: 'Default', priority: 0 },
  });

  store.register({
    pattern: '\\.md$',
    component: createMockComponent('Extension'),
    meta: { id: 'ext:md', name: 'Extension', priority: 10 },
  });

  const viewer = store.getViewer('readme.md');
  expect(viewer?.meta.id).toBe('ext:md');
});

test('config preferred viewer overrides priority', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.md$',
    component: createMockComponent('Low'),
    meta: { id: 'test:low', name: 'Low', priority: 5 },
  });

  store.register({
    pattern: '\\.md$',
    component: createMockComponent('High'),
    meta: { id: 'test:high', name: 'High', priority: 20 },
  });

  mockConfig.fileReaders.preferredReaders['md'] = 'test:low';

  const viewer = store.getViewer('readme.md');
  expect(viewer?.meta.id).toBe('test:low');
});

test('handles compound extensions like org.gpg', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.org(\\.gpg)?$',
    component: createMockComponent('Org'),
    meta: { id: 'test:org', name: 'Org', priority: 10 },
  });

  store.register({
    pattern: '\\.org(\\.gpg)?$',
    component: createMockComponent('OrgAlt'),
    meta: { id: 'test:org-alt', name: 'Org Alt', priority: 5 },
  });

  mockConfig.fileReaders.preferredReaders['org.gpg'] = 'test:org-alt';

  const viewer = store.getViewer('secret.org.gpg');
  expect(viewer?.meta.id).toBe('test:org-alt');
});

test('unregister removes viewer by id', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('ToRemove'),
    meta: { id: 'test:remove', name: 'To Remove' },
  });

  expect(store.getViewer('test.org')).toBeDefined();

  store.unregister('test:remove');

  expect(store.getViewer('test.org')).toBeUndefined();
});

test('unregister clears state owned by the removed viewer', () => {
  const viewerId = 'test:stateful';
  const stateHandle = useBufferViewStateStore().createHandle({
    tabId: 'tab-1',
    bufferUri: 'file:///notes/example.org',
    viewerId,
    version: 1,
  });
  stateHandle.set({ cursor: 12 });

  useBufferViewerStore().unregister(viewerId);
  stateHandle.set({ cursor: 24 });
  const currentHandle = useBufferViewStateStore().createHandle({
    tabId: 'tab-1',
    bufferUri: 'file:///notes/example.org',
    viewerId,
    version: 1,
  });

  expect(currentHandle.get()).toBeUndefined();
});

test('openInNewTab always creates a tab in the active pane', async () => {
  mockAddTab.mockResolvedValueOnce({ id: 'tab-2', paneId: 'pane-1' });
  const store = useBufferViewerStore();

  await store.openInNewTab(POMODORO_URI);

  expect(mockAddTab).toHaveBeenCalledWith('pane-1');
  expect(mockNavigate).toHaveBeenCalledWith(
    { name: 'Builtin', params: { path: '/agenda/pomodoro' } },
    'pane-1',
    'tab-2',
  );
});

test('openInNewTab rejects without an active pane', async () => {
  mockActivePaneId = undefined;
  const store = useBufferViewerStore();

  await expect(store.openInNewTab(POMODORO_URI)).rejects.toThrow(
    'buffer-viewer.openInNewTab: no active pane available',
  );
});

test('openInAdjacentPane opens a new tab in the next pane', async () => {
  mockLayout.value = {
    type: 'split',
    id: 'split-1',
    orientation: 'horizontal',
    children: [
      { type: 'pane', id: 'node-1', paneId: 'pane-1' },
      { type: 'pane', id: 'node-2', paneId: 'pane-2' },
    ],
  };
  mockAddTab.mockResolvedValueOnce({ id: 'tab-2', paneId: 'pane-2' });
  const store = useBufferViewerStore();

  await store.openInAdjacentPane(POMODORO_URI);

  expect(mockAddTab).toHaveBeenCalledWith('pane-2');
  expect(mockNavigate).toHaveBeenCalledWith(
    { name: 'Builtin', params: { path: '/agenda/pomodoro' } },
    'pane-2',
    'tab-2',
  );
  expect(mockSetActivePane).toHaveBeenCalledWith('pane-2');
  expect(mockSplitPaneInLayout).not.toHaveBeenCalled();
});

test('openInAdjacentPane creates a pane when the layout has no adjacent pane', async () => {
  mockLayout.value = { type: 'pane', id: 'node-1', paneId: 'pane-1' };
  mockSplitPaneInLayout.mockResolvedValueOnce('pane-2');
  mockAddTab.mockResolvedValueOnce({ id: 'tab-2', paneId: 'pane-2' });
  const store = useBufferViewerStore();

  await store.openInAdjacentPane(POMODORO_URI);

  expect(mockSplitPaneInLayout).toHaveBeenCalledWith('pane-1', 'right', false);
  expect(mockAddTab).toHaveBeenCalledWith('pane-2');
  expect(mockNavigate).toHaveBeenCalledWith(
    { name: 'Builtin', params: { path: '/agenda/pomodoro' } },
    'pane-2',
    'tab-2',
  );
  expect(mockSetActivePane).toHaveBeenCalledWith('pane-2');
});

test('openInAdjacentPane falls back to the current pane when the layout is unavailable', async () => {
  const store = useBufferViewerStore();

  await store.openInAdjacentPane(POMODORO_URI);

  expect(mockSplitPaneInLayout).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith({
    name: 'Builtin',
    params: { path: '/agenda/pomodoro' },
  });
  expect(mockAddTab).not.toHaveBeenCalled();
});

test('showOrOpen selects an existing buffer tab without navigating', async () => {
  const existingTab = createPomodoroTab('pomodoro-tab', 'pane-2');
  addMockPane('pane-1', []);
  addMockPane('pane-2', [existingTab]);
  const store = useBufferViewerStore();

  await store.showOrOpen(POMODORO_URI);

  expect(mockSelectTab).toHaveBeenCalledWith('pane-2', existingTab.id);
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('showOrOpen keeps an already active buffer unchanged', async () => {
  const existingTab = createPomodoroTab('pomodoro-tab', 'pane-1');
  addMockPane('pane-1', [existingTab]);
  mockActiveTab = existingTab;
  const store = useBufferViewerStore();

  await store.showOrOpen(POMODORO_URI);

  expect(mockSelectTab).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('showOrOpen treats an unqualified file path as its canonical file URI', async () => {
  const existingTab = {
    id: 'note-tab',
    paneId: 'pane-2',
    router: {
      currentRoute: shallowRef({ name: 'File', params: { path: '/notes/example.org' } }),
    },
  };
  addMockPane('pane-2', [existingTab]);
  const store = useBufferViewerStore();

  await store.showOrOpen('/notes/example.org');

  expect(mockSelectTab).toHaveBeenCalledWith('pane-2', existingTab.id);
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('showOrOpen does not conflate different buffer URI schemes', async () => {
  const existingTab = {
    id: 'file-tab',
    paneId: 'pane-2',
    router: {
      currentRoute: shallowRef({ name: 'File', params: { path: '/notes/example.org' } }),
    },
  };
  addMockPane('pane-2', [existingTab]);
  const store = useBufferViewerStore();

  await store.showOrOpen('memory:///notes/example.org');

  expect(mockSelectTab).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith({
    name: 'File',
    params: { path: '/notes/example.org' },
  });
});

test('showOrOpen prefers a matching tab from the active pane', async () => {
  const inactiveTab = createPomodoroTab('inactive-match', 'pane-2');
  const activePaneTab = createPomodoroTab('active-pane-match', 'pane-1');
  addMockPane('pane-2', [inactiveTab]);
  addMockPane('pane-1', [activePaneTab]);
  const store = useBufferViewerStore();

  await store.showOrOpen(POMODORO_URI);

  expect(mockSelectTab).toHaveBeenCalledWith('pane-1', activePaneTab.id);
});

test('showOrOpen navigates when the buffer is not open', async () => {
  const store = useBufferViewerStore();

  await store.showOrOpen(POMODORO_URI);

  expect(mockNavigate).toHaveBeenCalledWith({
    name: 'Builtin',
    params: { path: '/agenda/pomodoro' },
  });
});

test('open selects an existing buffer when reuse is enabled', async () => {
  const existingTab = createPomodoroTab('pomodoro-tab', 'pane-2');
  addMockPane('pane-2', [existingTab]);
  mockConfig.ui.reuseExistingBuffers = true;
  const store = useBufferViewerStore();

  await store.open(POMODORO_URI);

  expect(mockSelectTab).toHaveBeenCalledWith('pane-2', existingTab.id);
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('open preserves duplicate navigation when reuse is disabled', async () => {
  const existingTab = createPomodoroTab('pomodoro-tab', 'pane-2');
  addMockPane('pane-2', [existingTab]);
  const store = useBufferViewerStore();

  await store.open(POMODORO_URI);

  expect(mockSelectTab).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledOnce();
});

test('open navigates to remote route for remote scheme', async () => {
  const store = useBufferViewerStore();

  await store.open('remote:///docs/info.org');

  expect(mockNavigate).toHaveBeenCalledWith({
    name: 'Remote',
    params: { path: '/docs/info.org' },
  });
});

test('open navigates to file route for file scheme', async () => {
  const store = useBufferViewerStore();

  await store.open('file:///home/user/notes.org');

  expect(mockNavigate).toHaveBeenCalledWith({
    name: 'File',
    params: { path: '/home/user/notes.org' },
  });
});

test('open defaults to file route for path without scheme', async () => {
  const store = useBufferViewerStore();

  await store.open('/home/user/notes.org');

  expect(mockNavigate).toHaveBeenCalledWith({
    name: 'File',
    params: { path: '/home/user/notes.org' },
  });
});

test('open defaults to file route for unknown scheme', async () => {
  const store = useBufferViewerStore();

  await store.open('custom:///some/path.org');

  expect(mockNavigate).toHaveBeenCalledWith({
    name: 'File',
    params: { path: '/some/path.org' },
  });
});

test('open creates a new tab when no active tab is available', async () => {
  const store = useBufferViewerStore();
  const route = { name: 'Builtin', params: { path: '/agenda/tasks' } };
  mockActiveTab = undefined;
  mockAddTab.mockResolvedValueOnce({ id: 'tab-2', paneId: 'pane-1' });

  await store.open('builtin:///agenda/tasks');

  expect(mockAddTab).toHaveBeenCalledWith('pane-1');
  expect(mockNavigate).toHaveBeenCalledWith(route, 'pane-1', 'tab-2');
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

test('open rejects when neither active tab nor active pane exists', async () => {
  const store = useBufferViewerStore();
  mockActiveTab = undefined;
  mockActivePaneId = undefined;

  await expect(store.open('builtin:///agenda/tasks')).rejects.toThrow('no active pane available');

  expect(mockAddTab).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('pattern matches correctly with regex', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.org(\\.gpg)?$',
    component: createMockComponent('Org'),
    meta: { id: 'test:org', name: 'Org' },
  });

  expect(store.getViewer('test.org')).toBeDefined();
  expect(store.getViewer('test.org.gpg')).toBeDefined();
  expect(store.getViewer('test.txt')).toBeUndefined();
});

test('unregister does nothing for non-existent viewer id', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('Existing'),
    meta: { id: 'test:existing', name: 'Existing' },
  });

  store.unregister('test:nonexistent');

  expect(store.getViewer('test.org')).toBeDefined();
  expect(store.getViewer('test.org')?.meta.id).toBe('test:existing');
});

test('getViewer returns undefined when no viewers registered', () => {
  const store = useBufferViewerStore();

  expect(store.getViewer('test.org')).toBeUndefined();
});

test('getViewers returns empty array when no viewers match', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.md$',
    component: createMockComponent('Markdown'),
    meta: { id: 'test:md', name: 'Markdown' },
  });

  const viewers = store.getViewers('test.org');
  expect(viewers).toHaveLength(0);
});

test('viewers with same priority preserve registration order', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.txt$',
    component: createMockComponent('First'),
    meta: { id: 'test:first', name: 'First', priority: 10 },
  });

  store.register({
    pattern: '\\.txt$',
    component: createMockComponent('Second'),
    meta: { id: 'test:second', name: 'Second', priority: 10 },
  });

  const viewers = store.getViewers('test.txt');
  expect(viewers).toHaveLength(2);
});

test('preferred viewer config ignores non-matching id', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('Only'),
    meta: { id: 'test:only', name: 'Only', priority: 5 },
  });

  mockConfig.fileReaders.preferredReaders['org'] = 'test:nonexistent';

  const viewer = store.getViewer('test.org');
  expect(viewer?.meta.id).toBe('test:only');
});

test('register allows duplicate viewer ids', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('First'),
    meta: { id: 'test:dup', name: 'First' },
  });

  store.register({
    pattern: '\\.txt$',
    component: createMockComponent('Second'),
    meta: { id: 'test:dup', name: 'Second' },
  });

  expect(store.getViewer('test.org')).toBeDefined();
  expect(store.getViewer('test.txt')).toBeDefined();
});

test('open navigates to file route for memory scheme', async () => {
  const store = useBufferViewerStore();

  await store.open('memory:///temp/buffer.org');

  expect(mockNavigate).toHaveBeenCalledWith({
    name: 'File',
    params: { path: '/temp/buffer.org' },
  });
});

test('open navigates to embedded route for embedded scheme', async () => {
  const store = useBufferViewerStore();

  await store.open('embedded:///docs/about.org');

  expect(mockNavigate).toHaveBeenCalledWith({
    name: 'Embedded',
    params: { path: '/docs/about.org' },
  });
});

test('getViewer uses default priority when not specified', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('NoPriority'),
    meta: { id: 'test:noprio', name: 'NoPriority' },
  });

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('HighPriority'),
    meta: { id: 'test:high', name: 'HighPriority', priority: 20 },
  });

  const viewer = store.getViewer('test.org');
  expect(viewer?.meta.id).toBe('test:high');
});

test('preferred reader with simple extension works', () => {
  const store = useBufferViewerStore();

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('Default'),
    meta: { id: 'test:default', name: 'Default', priority: 20 },
  });

  store.register({
    pattern: '\\.org$',
    component: createMockComponent('Alternative'),
    meta: { id: 'test:alt', name: 'Alternative', priority: 5 },
  });

  mockConfig.fileReaders.preferredReaders['org'] = 'test:alt';

  const viewer = store.getViewer('notes.org');
  expect(viewer?.meta.id).toBe('test:alt');
});
