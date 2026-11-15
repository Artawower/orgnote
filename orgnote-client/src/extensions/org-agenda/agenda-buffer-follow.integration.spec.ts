import { beforeEach, expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { RouteNames, type OrgNoteApi } from 'orgnote-api';
import { usePaneStore } from 'src/stores/pane';
import { useSidebarStore } from 'src/stores/sidebar';
import { AgendaSidebarRef } from './agenda-sidebar-ref';
import { disposeAgendaBufferFollow, registerAgendaBufferFollow } from './agenda-buffer-follow';

beforeEach(() => {
  disposeAgendaBufferFollow();
  setActivePinia(createPinia());
});

test('Agenda buffer navigation selects its sidebar through the activation event', async () => {
  const pane = usePaneStore();
  const sidebar = useSidebarStore();
  const api = {
    core: {
      useConfig: () => ({ config: { ui: { followActiveBufferInSidebar: true } } }),
      usePane: () => pane,
    },
    ui: {
      useSidebar: () => sidebar,
    },
  } as unknown as OrgNoteApi;
  const createdPane = await pane.createPane();
  await pane.addTab(createdPane.id);
  registerAgendaBufferFollow(api);

  await pane.navigate({ name: RouteNames.Builtin, params: { path: '/agenda-habits' } });
  await nextTick();

  expect(sidebar.component).toBe(AgendaSidebarRef);
  expect(sidebar.opened).toBe(false);
});
