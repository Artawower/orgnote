import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import type { Router } from 'vue-router';
import { ref, shallowRef, type Ref, type ShallowRef } from 'vue';
import type { Pane, Tab } from 'orgnote-api';
import { sleep } from 'src/utils/sleep';

const createMockPaneStore = () => {
  const panes = shallowRef({} as Record<string, ShallowRef<Pane>>);
  return {
    get panes() {
      return panes.value;
    },
    set panes(val) {
      panes.value = val;
    },
    $onAction: vi.fn(() => vi.fn()),
  };
};

const createMockLayoutStore = () => ({
  saveLayout: vi.fn(() => Promise.resolve()),
  restoreLayout: vi.fn(() => Promise.resolve()),
});

const createMockConfigStore = () => ({
  config: ref({
    ui: {
      persistantPanesSaveDelay: 30,
    },
  }),
});

const createMockLogger = () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
});

const mockPaneStore = createMockPaneStore();
const mockLayoutStore = createMockLayoutStore();
const mockConfigStore = createMockConfigStore();
const mockLogger = createMockLogger();

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      usePane: () => mockPaneStore,
      useLayout: () => mockLayoutStore,
      useConfig: () => mockConfigStore,
    },
    utils: {
      get logger() {
        return mockLogger;
      },
    },
  },
}));

vi.mock('src/utils/debounce', () => ({
  debounce: (fn: () => Promise<void>) => fn,
}));

import { usePanePersistence } from './pane-persistence';

const uid = () => Math.random().toString(36).slice(2);

const createMockRouter = (): Router => {
  const afterEachHandlers: Array<() => void> = [];
  return {
    afterEach: vi.fn((handler: () => void) => {
      afterEachHandlers.push(handler);
      return () => {
        const index = afterEachHandlers.indexOf(handler);
        if (index > -1) afterEachHandlers.splice(index, 1);
      };
    }),
    triggerAfterEach: () => afterEachHandlers.forEach((h) => h()),
  } as unknown as Router;
};

const createTestTab = (overrides: Partial<Tab> = {}): Tab =>
  ({
    id: uid(),
    router: createMockRouter(),
    title: 'Test Tab',
    ...overrides,
  }) as Tab;

const createTestPane = (tabs: Tab[] = []): ShallowRef<Pane> => {
  const tabsObj = tabs.reduce(
    (acc, tab) => {
      acc[tab.id] = tab;
      return acc;
    },
    {} as Record<string, Tab>,
  );
  const tabsRef = ref(tabsObj);
  const paneObj = {
    id: uid(),
    tabs: tabsRef as Ref<Record<string, Tab>>,
    activeTabId: tabs[0]?.id ?? '',
  } as unknown as Pane;
  return shallowRef(paneObj) as unknown as ShallowRef<Pane>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPaneStore.panes = {} as Record<string, ShallowRef<Pane>>;
  mockPaneStore.$onAction.mockReturnValue(vi.fn());
  mockLayoutStore.saveLayout.mockReturnValue(Promise.resolve());
  mockLayoutStore.restoreLayout.mockReturnValue(Promise.resolve());
  mockConfigStore.config.value = {
    ui: {
      persistantPanesSaveDelay: 30,
    },
  };
  const composable = usePanePersistence();
  if (composable.isStarted.value) composable.stop();
});

afterEach(() => {
  const composable = usePanePersistence();
  if (composable.isStarted.value) composable.stop();
});

test('start restores panes', async () => {
  const { start } = usePanePersistence();
  await start();
  expect(mockLayoutStore.restoreLayout).toHaveBeenCalledOnce();
});

test('start logs error when restore fails', async () => {
  const error = new Error('Restore failed');
  mockLayoutStore.restoreLayout.mockImplementation(() => Promise.reject(error));
  const { start } = usePanePersistence();
  await start();
  expect(mockLogger.error).toHaveBeenCalledWith('Failed to restore panes', { error });
});

test('start sets isStarted to true', async () => {
  const { start, isStarted } = usePanePersistence();
  expect(isStarted.value).toBe(false);
  await start();
  expect(isStarted.value).toBe(true);
});

test('start is idempotent', async () => {
  const { start } = usePanePersistence();
  await start();
  vi.clearAllMocks();
  await start();
  expect(mockLayoutStore.restoreLayout).not.toHaveBeenCalled();
});

test('start registers router hooks for existing tabs', async () => {
  const router1 = createMockRouter();
  const router2 = createMockRouter();
  const tab1 = createTestTab({ router: router1 });
  const tab2 = createTestTab({ router: router2 });
  const pane = createTestPane([tab1, tab2]);
  mockPaneStore.panes = { [pane.value.id]: pane } as Record<string, ShallowRef<Pane>>;
  const { start } = usePanePersistence();
  await start();
  expect(router1.afterEach).toHaveBeenCalledOnce();
  expect(router2.afterEach).toHaveBeenCalledOnce();
});

test('start subscribes to pane store actions', async () => {
  const { start } = usePanePersistence();
  await start();
  expect(mockPaneStore.$onAction).toHaveBeenCalledOnce();
  expect(mockPaneStore.$onAction).toHaveBeenCalledWith(expect.any(Function));
});

test('stop clears router hooks', async () => {
  const router1 = createMockRouter();
  const router2 = createMockRouter();
  const tab1 = createTestTab({ router: router1 });
  const tab2 = createTestTab({ router: router2 });
  const pane = createTestPane([tab1, tab2]);
  mockPaneStore.panes = { [pane.value.id]: pane } as Record<string, ShallowRef<Pane>>;
  const { start, stop } = usePanePersistence();
  await start();
  const removeHook1 = (router1.afterEach as ReturnType<typeof vi.fn>).mock.results[0]?.value;
  const removeHook2 = (router2.afterEach as ReturnType<typeof vi.fn>).mock.results[0]?.value;
  stop();
  expect(removeHook1).toBeDefined();
  expect(removeHook2).toBeDefined();
});

test('stop unsubscribes from pane store actions', async () => {
  const unsubscribe = vi.fn();
  mockPaneStore.$onAction.mockReturnValue(unsubscribe);
  const { start, stop } = usePanePersistence();
  await start();
  stop();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

test('stop sets isStarted to false', async () => {
  const { start, stop, isStarted } = usePanePersistence();
  await start();
  expect(isStarted.value).toBe(true);
  stop();
  expect(isStarted.value).toBe(false);
});

test('stop when not started does nothing', () => {
  const { stop } = usePanePersistence();
  stop();
  expect(mockPaneStore.$onAction).not.toHaveBeenCalled();
});

test('router afterEach triggers save', async () => {
  const router = createMockRouter();
  const tab = createTestTab({ router });
  const pane = createTestPane([tab]);
  mockPaneStore.panes = { [pane.value.id]: pane } as Record<string, ShallowRef<Pane>>;
  const { start } = usePanePersistence();
  await start();
  vi.clearAllMocks();
  (router as unknown as { triggerAfterEach: () => void }).triggerAfterEach();
  await sleep(50);
  expect(mockLayoutStore.saveLayout).toHaveBeenCalled();
});

test('logs error when save fails', async () => {
  const error = new Error('Save failed');
  mockLayoutStore.saveLayout.mockImplementation(() => Promise.reject(error));
  const router = createMockRouter();
  const tab = createTestTab({ router });
  const pane = createTestPane([tab]);
  mockPaneStore.panes = { [pane.value.id]: pane } as Record<string, ShallowRef<Pane>>;
  const { start } = usePanePersistence();
  await start();
  (router as unknown as { triggerAfterEach: () => void }).triggerAfterEach();
  await sleep(50);
  expect(mockLogger.error).toHaveBeenCalledWith('Pane snapshot save failed', {
    error,
    context: 'auto-save',
  });
});

test('uses default delay when config delay is missing', async () => {
  mockConfigStore.config.value = {
    ui: { persistantPanesSaveDelay: undefined as unknown as number },
  };
  const router = createMockRouter();
  const tab = createTestTab({ router });
  const pane = createTestPane([tab]);
  mockPaneStore.panes = { [pane.value.id]: pane } as Record<string, ShallowRef<Pane>>;
  const { start } = usePanePersistence();
  await start();
  (router as unknown as { triggerAfterEach: () => void }).triggerAfterEach();
  await sleep(50);
  expect(mockLayoutStore.saveLayout).toHaveBeenCalled();
});

test('removes hooks for routers that no longer exist', async () => {
  const router1 = createMockRouter();
  const router2 = createMockRouter();
  const tab1 = createTestTab({ router: router1 });
  const tab2 = createTestTab({ router: router2 });
  const pane = createTestPane([tab1, tab2]);
  mockPaneStore.panes = { [pane.value.id]: pane } as Record<string, ShallowRef<Pane>>;
  const { start } = usePanePersistence();
  await start();
  expect(router1.afterEach).toHaveBeenCalled();
  expect(router2.afterEach).toHaveBeenCalled();
  const removeHook2 = (router2.afterEach as ReturnType<typeof vi.fn>).mock.results[0]?.value;
  pane.value.tabs.value = { [tab1.id]: tab1 } as Record<string, Tab>;
  mockPaneStore.panes = { [pane.value.id]: pane } as Record<string, ShallowRef<Pane>>;
  const actionCallback = (mockPaneStore.$onAction as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
  const afterCallback = vi.fn();
  type ActionContext = { after: (cb: () => void) => unknown };
  const ctx: ActionContext = {
    after: (cb: () => void) => {
      afterCallback.mockImplementation(cb);
      return cb;
    },
  };
  actionCallback?.(ctx);
  afterCallback();
  expect(removeHook2).toBeDefined();
});

test('does not add duplicate hooks for the same router', async () => {
  const router = createMockRouter();
  const tab1 = createTestTab({ router });
  const tab2 = createTestTab({ router });
  const pane = createTestPane([tab1, tab2]);
  mockPaneStore.panes = { [pane.value.id]: pane } as Record<string, ShallowRef<Pane>>;
  const { start } = usePanePersistence();
  await start();
  expect(router.afterEach).toHaveBeenCalledOnce();
});
