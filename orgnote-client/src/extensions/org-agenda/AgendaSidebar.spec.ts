import { flushPromises, mount } from '@vue/test-utils';
import { DefaultCommands } from 'orgnote-api';
import { defineComponent } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';
import { AGENDA_POMODORO_URI } from './constants';
import AgendaSidebar from './AgendaSidebar.vue';

const mocks = vi.hoisted(() => ({
  closeSidebar: vi.fn(),
  ensureLoaded: vi.fn(),
  execute: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('src/boot/api', async () => {
  const { reactive, ref } = await import('vue');
  const pane = reactive({ activeBufferUri: ref<string>() });
  return {
    api: {
      core: {
        useCommands: () => ({ execute: mocks.execute }),
        usePane: () => pane,
      },
      ui: {
        useScreenDetection: () => ({ tabletBelow: ref(false) }),
        useSidebar: () => ({ close: mocks.closeSidebar }),
      },
    },
  };
});

vi.mock('src/boot/report', () => ({
  reporter: { reportError: mocks.reportError },
}));

vi.mock('./stores/agenda-filter-store', () => ({
  useAgendaFilterStore: () => ({ selectedFilePath: undefined }),
}));

vi.mock('./stores/agenda-tasks-store', () => ({
  useAgendaTasksStore: () => ({
    agendaFiles: [],
    ensureLoaded: mocks.ensureLoaded,
    totalByFilter: {},
  }),
}));

const AgendaViewsNavStub = defineComponent({
  emits: ['navigate'],
  template: `<button class="open-pomodoro" @click="$emit('navigate', '${AGENDA_POMODORO_URI}')" />`,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureLoaded.mockResolvedValue(undefined);
  mocks.execute.mockResolvedValue(undefined);
});

test('Agenda sidebar focuses an open Pomodoro buffer', async () => {
  const wrapper = mount(AgendaSidebar, {
    global: {
      stubs: {
        AgendaTasksFilter: true,
        AgendaViewsNav: AgendaViewsNavStub,
        AppFlex: { template: '<div><slot /></div>' },
      },
    },
  });

  await wrapper.get('.open-pomodoro').trigger('click');
  await flushPromises();

  expect(mocks.execute).toHaveBeenCalledWith(DefaultCommands.SHOW_OR_OPEN_BUFFER, {
    uri: AGENDA_POMODORO_URI,
  });
});
