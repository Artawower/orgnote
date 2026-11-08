import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { expect, test, vi } from 'vitest';
import { DefaultCommands } from 'orgnote-api';

import MenuGroup from 'src/components/MenuGroup.vue';
import AgendaTaskGroup from './AgendaTaskGroup.vue';
import type { AgendaTaskGroup as AgendaTaskGroupView } from '../composables/use-agenda-tasks';
import { AGENDA_QUICK_ADD_TO_FILE_COMMAND } from '../constants';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useScreenDetection: () => ({ tabletBelow: { __v_isRef: true, value: false } }),
    },
    core: {
      useFileContent: () => ({ read: vi.fn() }),
    },
  },
}));

vi.mock('../composables/use-agenda-mini-editor', () => ({
  useAgendaMiniEditor: () => ({ openEdit: vi.fn() }),
}));

const AppSpoilerStub = defineComponent({
  name: 'AppSpoiler',
  props: {
    variant: String,
    defaultExpanded: Boolean,
    modelValue: { type: Boolean, default: undefined },
  },
  template:
    '<section><slot name="title" /><slot name="actions" /><slot name="body" /></section>',
});

const CommandActionButtonStub = defineComponent({
  name: 'CommandActionButton',
  props: { command: String, data: Object },
  template: '<button class="command-action-stub" />',
});

const AgendaTaskRowStub = defineComponent({
  name: 'AgendaTaskRow',
  props: { task: Object },
  emits: ['edit-expand'],
  template:
    '<button class="agenda-task-row-stub" @click="$emit(\'edit-expand\')">{{ task.text }}</button>',
});

const AgendaTaskFormStub = defineComponent({
  name: 'AgendaTaskForm',
  props: { title: String },
  template: '<div class="agenda-task-form-stub">{{ title }}</div>',
});

const group: AgendaTaskGroupView = {
  fileTitle: 'Inbox',
  filePath: '/inbox.org',
  tasks: [
    {
      id: 'first-task',
      kind: 'headline-todo',
      state: 'todo',
      text: 'First task',
      filePath: '/inbox.org',
      viewDate: new Date('2026-07-16'),
    },
    {
      id: 'second-task',
      kind: 'headline-todo',
      state: 'todo',
      text: 'Second task',
      filePath: '/inbox.org',
      viewDate: new Date('2026-07-16'),
    },
  ],
};

const mountTaskGroup = (
  props: { expanded?: boolean; expandedTaskId?: string | null } = {},
) =>
  mount(AgendaTaskGroup, {
    props: { group, ...props },
    global: {
      stubs: {
        AppSpoiler: AppSpoilerStub,
        AgendaTaskRow: AgendaTaskRowStub,
        AgendaTaskForm: AgendaTaskFormStub,
        CommandActionButton: CommandActionButtonStub,
      },
    },
  });

test('AgendaTaskGroup renders tasks as a flat menu group', () => {
  const wrapper = mountTaskGroup();

  expect(wrapper.getComponent(AppSpoilerStub).props('variant')).toBe('flat');
  expect(wrapper.getComponent(MenuGroup).findAll('.agenda-task-row-stub')).toHaveLength(2);
});

test('AgendaTaskGroup exposes quick-add and open-note commands for its file', () => {
  const wrapper = mountTaskGroup();
  const actions = wrapper.findAllComponents(CommandActionButtonStub);

  expect(actions.map((action) => action.props('command'))).toEqual([
    AGENDA_QUICK_ADD_TO_FILE_COMMAND,
    DefaultCommands.OPEN_NOTE,
  ]);
  expect(actions.map((action) => action.props('data'))).toEqual([
    { filePath: '/inbox.org' },
    { path: '/inbox.org' },
  ]);
});

test('AgendaTaskGroup combines an expanded task row and editor into one surface', async () => {
  const wrapper = mountTaskGroup();

  await wrapper.findAll('.agenda-task-row-stub')[0]?.trigger('click');

  const expandedTask = wrapper.get('.task-item.expanded');
  expect(expandedTask.get('.agenda-task-row-stub').text()).toBe('First task');
  expect(expandedTask.find('.edit-form').exists()).toBe(true);
  expect(expandedTask.find('.card-wrapper').exists()).toBe(false);
});

test('AgendaTaskGroup restores controlled group visibility', () => {
  const wrapper = mountTaskGroup({ expanded: false });

  expect(wrapper.getComponent(AppSpoilerStub).props('modelValue')).toBe(false);
});

test('AgendaTaskGroup restores a controlled expanded task', () => {
  const wrapper = mountTaskGroup({ expandedTaskId: 'second-task' });

  const expandedTask = wrapper.get('.task-item.expanded');
  expect(expandedTask.get('.agenda-task-row-stub').text()).toBe('Second task');
  expect(expandedTask.get('.agenda-task-form-stub').text()).toBe('Second task');
});
