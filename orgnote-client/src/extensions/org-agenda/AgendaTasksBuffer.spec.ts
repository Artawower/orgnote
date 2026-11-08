import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, shallowRef } from 'vue';
import { beforeEach, expect, test, vi } from 'vitest';
import type { Buffer, BufferViewStateHandle } from 'orgnote-api';
import type * as VueI18nModule from 'vue-i18n';
import type { AgendaTasksViewState } from './composables/use-agenda-tasks-view-state';

const scrollTo = vi.fn();
const agenda = vi.hoisted(() => ({
  groups: {
    __v_isRef: true,
    value: [
      {
        fileTitle: 'Inbox',
        filePath: '/inbox.org',
        tasks: [{ id: 'inbox-task', text: 'Inbox task', state: 'todo' }],
      },
      {
        fileTitle: 'Project',
        filePath: '/project.org',
        tasks: [{ id: 'project-task', text: 'Project task', state: 'todo' }],
      },
    ],
  },
}));

vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof VueI18nModule>()),
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileContent: () => ({ read: vi.fn(), write: vi.fn() }),
    },
  },
}));

vi.mock('./composables/use-agenda-tasks', () => ({
  useAgendaTasks: () => ({
    loading: { __v_isRef: true, value: false },
    groups: agenda.groups,
    filteredTaskCount: { __v_isRef: true, value: 2 },
  }),
}));

vi.mock('./services/show-agenda-task-buffer', () => ({
  showAgendaTaskBuffer: vi.fn(),
}));

import AgendaTasksBuffer from './AgendaTasksBuffer.vue';

const QVirtualScrollStub = defineComponent({
  name: 'QVirtualScroll',
  props: { items: { type: Array, default: () => [] } },
  emits: ['virtual-scroll'],
  setup(props, { expose, slots }) {
    expose({ scrollTo });
    return () => h('div', props.items.flatMap((item) => slots.default?.({ item }) ?? []));
  },
});

const AgendaTaskGroupStub = defineComponent({
  name: 'AgendaTaskGroup',
  props: {
    group: { type: Object, required: true },
    expanded: { type: Boolean, default: true },
    expandedTaskId: String,
  },
  emits: ['update:expanded', 'update:expandedTaskId'],
  template: '<div class="agenda-task-group-stub" />',
});

const DefaultSlotStub = defineComponent({ template: '<div><slot /></div>' });
const BodySlotStub = defineComponent({
  template: '<div><slot name="header" /><slot name="body" /></div>',
});
const buffer = { uri: 'builtin:///agenda-tasks/day/2026-08-01' } as Buffer;
const globalStubs = {
  AgendaQuickAddContainer: true,
  AgendaTaskGroup: AgendaTaskGroupStub,
  AgendaTaskQueryBar: true,
  AppBufferContent: DefaultSlotStub,
  AppFlex: DefaultSlotStub,
  ContainerLayout: BodySlotStub,
  EmptyState: true,
  LoadingDots: true,
  QVirtualScroll: QVirtualScrollStub,
};

const mountBuffer = (viewState: BufferViewStateHandle<AgendaTasksViewState>) =>
  mount(AgendaTasksBuffer, {
    props: { buffer, viewState },
    global: { stubs: globalStubs },
  });

beforeEach(() => {
  scrollTo.mockClear();
});

test('AgendaTasksBuffer restores its group selection and virtual scroll anchor', async () => {
  const viewState: BufferViewStateHandle<AgendaTasksViewState> = {
    get: () => ({
      scrollAnchor: { filePath: '/project.org', fallbackIndex: 0 },
      collapsedFilePaths: ['/inbox.org'],
      expandedTaskByFilePath: { '/project.org': 'project-task' },
    }),
    set: vi.fn(),
    clear: vi.fn(),
  };

  const wrapper = mountBuffer(viewState);
  await flushPromises();
  const renderedGroups = wrapper.findAllComponents(AgendaTaskGroupStub);

  expect(renderedGroups[0]?.props('expanded')).toBe(false);
  expect(renderedGroups[1]?.props('expandedTaskId')).toBe('project-task');
  expect(scrollTo).toHaveBeenCalledWith(1, 'start-force');
});

test('AgendaTasksBuffer saves its group selection and virtual scroll anchor', async () => {
  const setState = vi.fn();
  const viewState: BufferViewStateHandle<AgendaTasksViewState> = {
    get: () => undefined,
    set: setState,
    clear: vi.fn(),
  };
  const wrapper = mountBuffer(viewState);
  await flushPromises();
  const renderedGroups = wrapper.findAllComponents(AgendaTaskGroupStub);

  wrapper.getComponent(QVirtualScrollStub).vm.$emit('virtual-scroll', { index: 1 });
  renderedGroups[0]?.vm.$emit('update:expanded', false);
  renderedGroups[1]?.vm.$emit('update:expandedTaskId', 'project-task');
  wrapper.unmount();

  expect(setState).toHaveBeenLastCalledWith({
    scrollAnchor: { filePath: '/project.org', fallbackIndex: 1 },
    collapsedFilePaths: ['/inbox.org'],
    expandedTaskByFilePath: { '/project.org': 'project-task' },
  });
  expect(() => structuredClone(setState.mock.lastCall?.[0])).not.toThrow();
});

test('AgendaTasksBuffer switches view state with the concrete Agenda buffer', async () => {
  const saveFirstState = vi.fn();
  const firstViewState: BufferViewStateHandle<AgendaTasksViewState> = {
    get: () => ({
      scrollAnchor: { filePath: '/inbox.org', fallbackIndex: 0 },
      collapsedFilePaths: ['/inbox.org'],
      expandedTaskByFilePath: {},
    }),
    set: saveFirstState,
    clear: vi.fn(),
  };
  const secondViewState: BufferViewStateHandle<AgendaTasksViewState> = {
    get: () => ({
      scrollAnchor: { filePath: '/project.org', fallbackIndex: 1 },
      collapsedFilePaths: ['/project.org'],
      expandedTaskByFilePath: { '/inbox.org': 'inbox-task' },
    }),
    set: vi.fn(),
    clear: vi.fn(),
  };
  const currentViewState = shallowRef(firstViewState);
  const Host = defineComponent({
    setup: () => () =>
      h(AgendaTasksBuffer, { buffer, viewState: currentViewState.value }),
  });
  const wrapper = mount(Host, { global: { stubs: globalStubs } });
  await flushPromises();

  currentViewState.value = secondViewState;
  await flushPromises();
  const renderedGroups = wrapper.findAllComponents(AgendaTaskGroupStub);

  expect(saveFirstState).toHaveBeenCalledOnce();
  expect(renderedGroups[0]?.props('expandedTaskId')).toBe('inbox-task');
  expect(renderedGroups[1]?.props('expanded')).toBe(false);
  expect(scrollTo).toHaveBeenLastCalledWith(1, 'start-force');
});
