import { expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePaneStore } from 'src/stores/pane';
import { useLayoutStore } from 'src/stores/layout';
import { isPresent } from 'orgnote-api/utils';

test('initNewPane followed by setting activePaneId should populate layout with correct paneId', async () => {
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
  expect(paneStore.activePaneId).toBe(pane.id);
});

test('getPane with empty string should return undefined', () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = paneStore.panes[''];
  expect(pane).toBeUndefined();
});

test('getPane with valid id should return pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Test Pane' });
  const retrievedPane = paneStore.getPane(pane.id);

  expect(retrievedPane?.value).toBeDefined();
  expect(retrievedPane?.value?.id).toBe(pane.id);
});

test('layout should be updated when activePaneId is set', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();
  const layoutStore = useLayoutStore();

  const pane1 = await paneStore.createPane();
  await paneStore.addTab(pane1.id, { title: 'Pane 1' });
  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Pane 2' });

  paneStore.activePaneId = pane2.id;
  layoutStore.initLayout();

  const layout = layoutStore.layout;
  if (!isPresent(layout)) {
    throw new Error('Layout not found');
  }

  expect(layout.type).toBe('pane');
  if (layout.type === 'pane') {
    expect(layout.paneId).toBe(pane2.id);
  }
});
