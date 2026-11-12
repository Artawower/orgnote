import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { expect, test, vi } from 'vitest';

import AgendaTaskItem from './AgendaTaskItem.vue';
import type { AgendaTaskView } from '../composables/use-agenda-tasks';

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

const AgendaTaskRowStub = defineComponent({
  name: 'AgendaTaskRow',
  props: { task: Object },
  emits: ['editExpand', 'toggle', 'titleEditing'],
  template:
    '<button class="agenda-task-row-stub" @click="$emit(\'editExpand\')">{{ task.text }}</button>',
});

const AgendaTaskFormStub = defineComponent({
  name: 'AgendaTaskForm',
  props: { title: String, body: String },
  emits: ['update:title', 'update:body', 'bodyBlur'],
  template: '<div class="agenda-task-form-stub">{{ title }}</div>',
});

const task: AgendaTaskView = {
  id: 'first-task',
  kind: 'headline-todo',
  state: 'todo',
  text: 'First task',
  filePath: '/inbox.org',
  viewDate: new Date('2026-07-16'),
};

const mountTaskItem = (props: { expanded?: boolean } = {}) =>
  mount(AgendaTaskItem, {
    props: { task, filePath: '/inbox.org', ...props },
    global: {
      stubs: { AgendaTaskRow: AgendaTaskRowStub, AgendaTaskForm: AgendaTaskFormStub },
    },
  });

test('AgendaTaskItem combines an expanded task row and editor into one surface', async () => {
  const wrapper = mountTaskItem();

  await wrapper.get('.agenda-task-row-stub').trigger('click');

  expect(wrapper.emitted('update:expanded')).toEqual([[true]]);
  await wrapper.setProps({ expanded: true });
  const expandedTask = wrapper.get('.task-item.expanded');
  expect(expandedTask.find('.edit-form').exists()).toBe(true);
  expect(expandedTask.find('.card-wrapper').exists()).toBe(false);
});

test('AgendaTaskItem restores a controlled expanded task with its draft', () => {
  const wrapper = mountTaskItem({ expanded: true });

  expect(wrapper.get('.task-item.expanded .agenda-task-form-stub').text()).toBe('First task');
});

test('AgendaTaskItem hides the editor while collapsed', () => {
  const wrapper = mountTaskItem();

  expect(wrapper.find('.edit-form').exists()).toBe(false);
});

test('AgendaTaskItem forwards a toggle with its file path', async () => {
  const wrapper = mountTaskItem();

  wrapper.getComponent(AgendaTaskRowStub).vm.$emit('toggle');

  expect(wrapper.emitted('taskToggle')).toEqual([[task, '/inbox.org']]);
});

test('AgendaTaskItem reports when its title editor opens and closes', () => {
  const wrapper = mountTaskItem();
  const row = wrapper.getComponent(AgendaTaskRowStub);

  row.vm.$emit('titleEditing', true);
  row.vm.$emit('titleEditing', false);

  expect(wrapper.emitted('titleEditing')).toEqual([[true], [false]]);
});

test('AgendaTaskItem saves the edited draft on body blur', async () => {
  const wrapper = mountTaskItem({ expanded: true });
  const form = wrapper.getComponent(AgendaTaskFormStub);

  form.vm.$emit('update:title', 'Renamed task');
  form.vm.$emit('update:body', 'Some notes');
  await wrapper.vm.$nextTick();
  form.vm.$emit('bodyBlur');

  expect(wrapper.emitted('taskEditSave')?.[0]).toEqual([
    task,
    '/inbox.org',
    {
      title: 'Renamed task',
      body: 'Some notes',
      tags: [],
      priority: undefined,
      scheduled: undefined,
      isHabit: false,
    },
  ]);
});
