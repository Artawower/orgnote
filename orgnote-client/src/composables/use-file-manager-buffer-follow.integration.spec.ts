import { beforeEach, expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { RouteNames, type OrgNoteApi } from 'orgnote-api';
import { usePaneStore } from 'src/stores/pane';
import { useSidebarStore } from 'src/stores/sidebar';
import { FileManagerRef } from 'src/containers/file-manager-ref';
import { registerFileManagerBufferFollow } from './use-file-manager-buffer-follow';

beforeEach(() => {
  setActivePinia(createPinia());
});

test('active pane navigation updates the file manager through the activation event', async () => {
  const pane = usePaneStore();
  const fileManager = { path: '/', searchQuery: 'filtered' };
  const sidebar = useSidebarStore();
  const api = {
    core: {
      useConfig: () => ({ config: { ui: { followActiveBufferInSidebar: true } } }),
      useFileManager: () => fileManager,
      usePane: () => pane,
    },
    ui: {
      useSidebar: () => sidebar,
    },
  } as unknown as OrgNoteApi;
  const unsubscribe = registerFileManagerBufferFollow(api);
  const createdPane = await pane.createPane();
  const firstTab = await pane.addTab(createdPane.id);
  if (!firstTab) throw new Error('First tab was not created');
  await pane.navigate({ name: RouteNames.File, params: { path: '/notes/today.org' } });
  const secondTab = await pane.addTab(createdPane.id);
  if (!secondTab) throw new Error('Second tab was not created');
  await pane.navigate({ name: RouteNames.File, params: { path: '/work/project.org' } });

  pane.selectTab(createdPane.id, firstTab.id);
  await nextTick();

  expect(fileManager.path).toBe('/notes');
  expect(fileManager.searchQuery).toBe('');
  expect(sidebar.component).toBe(FileManagerRef);
  expect(sidebar.opened).toBe(false);

  unsubscribe();
});
