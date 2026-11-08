import { expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePaneStore } from 'src/stores/pane';
import { useLayoutStore } from 'src/stores/layout';
import { isPresent } from 'orgnote-api/utils';

vi.mock('src/utils/pane-router', () => ({
  createPaneRouter: vi.fn(() =>
    Promise.resolve({
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      currentRoute: {
        value: {
          path: '/',
          fullPath: '/',
          params: {},
          query: {},
          hash: '',
          name: 'InitialPage',
        },
      },
    }),
  ),
}));

vi.mock('src/boot/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      usePane: () => usePaneStore(),
      useLayout: () => useLayoutStore(),
      useNotifications: () => ({
        notify: vi.fn(),
        error: vi.fn(),
      }),
      useConfig: () => ({
        config: {
          ui: {
            persistantPanes: false,
            persistantPanesSaveDelay: 1000,
          },
        },
      }),
    },
    utils: {
      logger: {
        error: vi.fn(),
      },
    },
    infrastructure: {
      paneSnapshotRepository: {
        save: vi.fn(),
        restore: vi.fn(),
      },
    },
  },
}));

test('PanesPage should pass correct UUID pane IDs when layout has split panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const layoutStore = useLayoutStore();

  const firstPane = await paneStore.createPane();
  await paneStore.addTab(firstPane.id, { title: 'First Pane' });
  const firstPaneId = firstPane.id;
  paneStore.setActivePane(firstPaneId);
  await layoutStore.initLayout();

  const secondPaneId = await layoutStore.splitPaneInLayout(firstPaneId, 'right');

  const layout = layoutStore.layout;
  expect(layout).toBeDefined();
  expect(layout?.type).toBe('split');

  expect(firstPaneId).not.toBe('0');
  expect(firstPaneId).not.toBe('1');
  expect(secondPaneId).not.toBe('0');
  expect(secondPaneId).not.toBe('1');
  expect(firstPaneId).toBeTruthy();
  expect(secondPaneId).toBeTruthy();
});

test('PanesPage store should have valid pane IDs accessible via getPane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Test Pane' });
  const paneId = pane.id;
  paneStore.activePaneId = paneId;

  expect(paneStore.panes[paneId]).toBeDefined();
  expect(paneStore.panes[paneId]?.value.id).toBe(paneId);

  const retrievedPane = paneStore.getPane(paneId);
  expect(retrievedPane?.value).toBeDefined();
  expect(retrievedPane?.value?.id).toBe(paneId);
});

test('PanesPage store should initialize layout when pane is created', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const layoutStore = useLayoutStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Test Pane' });
  paneStore.setActivePane(pane.id);
  await layoutStore.initLayout();

  const updatedLayout = layoutStore.layout;
  expect(updatedLayout).toBeDefined();
  expect(updatedLayout?.type).toBe('pane');
  if (updatedLayout?.type === 'pane') {
    expect(updatedLayout.paneId).toBe(pane.id);
  }
  expect((updatedLayout as { paneId?: string }).paneId).not.toBe('');
});

test('PanesPage workflow should call initLayout after initNewPane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const layoutStore = useLayoutStore();

  const initialActivePaneId = paneStore.activePaneId;
  expect(initialActivePaneId).toBeUndefined();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Test Pane' });
  paneStore.activePaneId = pane.id;
  layoutStore.initLayout();

  const layout = layoutStore.layout;
  if (!isPresent(layout)) {
    throw new Error('Layout not found');
  }

  expect(layout.type).toBe('pane');
  if (layout.type === 'pane') {
    expect(layout.paneId).toBe(pane.id);
  }
  expect(paneStore.activePaneId).toBe(pane.id);
});

test('AppPane should be accessible with valid paneId after initialization', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Test Pane' });
  paneStore.activePaneId = pane.id;

  const retrievedPane = paneStore.getPane(pane.id);
  expect(retrievedPane?.value).toBeDefined();
  expect(retrievedPane?.value?.id).toBe(pane.id);
});
