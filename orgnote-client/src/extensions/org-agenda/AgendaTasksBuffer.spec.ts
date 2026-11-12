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

const AppVirtualListStub = defineComponent({
  name: 'AppVirtualList',
  props: {
    items: { type: Array, default: () => [] },
    pinnedIndexes: { type: Array, default: () => [] },
  },
  emits: ['range'],
  setup(props, { expose, slots }) {
    expose({ scrollToIndex: scrollTo });
    return () => h('div', props.items.flatMap((item) => slots.default?.({ item }) ?? []));
  },
});

const AgendaTaskGroupHeaderStub = defineComponent({
  name: 'AgendaTaskGroupHeader',
  props: {
    group: { type: Object, required: true },
    expanded: { type: Boolean, default: true },
  },
  emits: ['update:expanded'],
  template: '<div class="agenda-task-group-header-stub" />',
});

const AgendaTaskItemStub = defineComponent({
  name: 'AgendaTaskItem',
  props: {
    task: { type: Object, required: true },
    filePath: String,
    expanded: Boolean,
  },
  emits: ['update:expanded', 'titleEditing'],
  template: '<div class="agenda-task-item-stub" />',
});

const DefaultSlotStub = defineComponent({ template: '<div><slot /></div>' });
const BodySlotStub = defineComponent({
  template: '<div><slot name="header" /><slot name="body" /></div>',
});
const buffer = { uri: 'builtin:///agenda-tasks/day/2026-08-01' } as Buffer;
const globalStubs = {
  AgendaQuickAddContainer: true,
  AgendaTaskGroupHeader: AgendaTaskGroupHeaderStub,
  AgendaTaskItem: AgendaTaskItemStub,
  AgendaTaskQueryBar: true,
  AppBufferContent: DefaultSlotStub,
  AppFlex: DefaultSlotStub,
  ContainerLayout: BodySlotStub,
  EmptyState: true,
  LoadingDots: true,
  AppVirtualList: AppVirtualListStub,
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
  const headers = wrapper.findAllComponents(AgendaTaskGroupHeaderStub);
  const tasks = wrapper.findAllComponents(AgendaTaskItemStub);

  expect(headers.map((header) => header.props('expanded'))).toEqual([false, true]);
  expect(tasks.map((task) => [task.props('task').id, task.props('expanded')])).toEqual([
    ['project-task', true],
  ]);
  expect(scrollTo).toHaveBeenCalledWith(1, 'start');
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
  const projectTask = wrapper
    .findAllComponents(AgendaTaskItemStub)
    .find((task) => task.props('task').id === 'project-task');

  wrapper.getComponent(AppVirtualListStub).vm.$emit('range', { start: 2, end: 3 });
  projectTask?.vm.$emit('update:expanded', true);
  wrapper.findAllComponents(AgendaTaskGroupHeaderStub)[0]?.vm.$emit('update:expanded', false);
  wrapper.unmount();

  expect(setState).toHaveBeenLastCalledWith({
    scrollAnchor: { rowKey: 'group:/project.org', filePath: '/project.org', fallbackIndex: 2 },
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
  const headers = wrapper.findAllComponents(AgendaTaskGroupHeaderStub);
  const tasks = wrapper.findAllComponents(AgendaTaskItemStub);

  expect(saveFirstState).toHaveBeenCalledOnce();
  expect(tasks.map((task) => [task.props('task').id, task.props('expanded')])).toEqual([
    ['inbox-task', true],
  ]);
  expect(headers.map((header) => header.props('expanded'))).toEqual([true, false]);
  expect(scrollTo).toHaveBeenLastCalledWith(2, 'start');
});

test('AgendaTasksBuffer keeps the expanded task row mounted', async () => {
  const viewState: BufferViewStateHandle<AgendaTasksViewState> = {
    get: () => ({
      collapsedFilePaths: [],
      expandedTaskByFilePath: { '/project.org': 'project-task' },
    }),
    set: vi.fn(),
    clear: vi.fn(),
  };

  const wrapper = mountBuffer(viewState);
  await flushPromises();

  expect(wrapper.getComponent(AppVirtualListStub).props('pinnedIndexes')).toEqual([3]);
});

test('AgendaTasksBuffer keeps a task row mounted while its title is being edited', async () => {
  const viewState: BufferViewStateHandle<AgendaTasksViewState> = {
    get: () => ({ collapsedFilePaths: [], expandedTaskByFilePath: {} }),
    set: vi.fn(),
    clear: vi.fn(),
  };
  const wrapper = mountBuffer(viewState);
  await flushPromises();
  const inboxTask = wrapper.findAllComponents(AgendaTaskItemStub)[0];

  inboxTask?.vm.$emit('titleEditing', true);
  await flushPromises();
  expect(wrapper.getComponent(AppVirtualListStub).props('pinnedIndexes')).toEqual([1]);

  inboxTask?.vm.$emit('titleEditing', false);
  await flushPromises();
  expect(wrapper.getComponent(AppVirtualListStub).props('pinnedIndexes')).toEqual([]);
});

test('AgendaTasksBuffer restores the scroll anchor to the saved task row', async () => {
  const viewState: BufferViewStateHandle<AgendaTasksViewState> = {
    get: () => ({
      scrollAnchor: {
        rowKey: 'task:/project.org:project-task',
        filePath: '/project.org',
        fallbackIndex: 0,
      },
      collapsedFilePaths: [],
      expandedTaskByFilePath: {},
    }),
    set: vi.fn(),
    clear: vi.fn(),
  };

  mountBuffer(viewState);
  await flushPromises();

  expect(scrollTo).toHaveBeenLastCalledWith(3, 'start');
});

test('AgendaTasksBuffer saves the task row it is scrolled to', async () => {
  const setState = vi.fn();
  const viewState: BufferViewStateHandle<AgendaTasksViewState> = {
    get: () => undefined,
    set: setState,
    clear: vi.fn(),
  };
  const wrapper = mountBuffer(viewState);
  await flushPromises();

  wrapper.getComponent(AppVirtualListStub).vm.$emit('range', { start: 3, end: 3 });
  wrapper.unmount();

  expect(setState.mock.lastCall?.[0].scrollAnchor).toEqual({
    rowKey: 'task:/project.org:project-task',
    filePath: '/project.org',
    fallbackIndex: 3,
  });
});
