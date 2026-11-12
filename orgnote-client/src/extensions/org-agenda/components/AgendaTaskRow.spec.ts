import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { expect, test, vi } from 'vitest';

import AgendaTaskRow from './AgendaTaskRow.vue';
import type { AgendaTaskView } from '../composables/use-agenda-tasks';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useScreenDetection: () => ({ tabletBelow: { __v_isRef: true, value: false } }),
    },
  },
}));

const AgendaEntryRowStub = defineComponent({
  name: 'AgendaEntryRow',
  template: '<div><slot /><slot name="right" /></div>',
});

const OrgInlineEditorStub = defineComponent({
  name: 'OrgInlineEditor',
  props: { modelValue: String },
  emits: ['update:modelValue', 'submit', 'blur'],
  setup: (_, { expose }) => {
    expose({ focus: vi.fn() });
  },
  template: '<input class="title-editor-stub" />',
});

const task: AgendaTaskView = {
  id: 'first-task',
  kind: 'headline-todo',
  state: 'todo',
  text: 'First task',
  filePath: '/inbox.org',
  viewDate: new Date('2026-07-16'),
};

const mountRow = () =>
  mount(AgendaTaskRow, {
    props: { task },
    global: {
      stubs: {
        AgendaEntryRow: AgendaEntryRowStub,
        OrgInlineEditor: OrgInlineEditorStub,
        AgendaScheduleButton: true,
        ActionButton: true,
      },
    },
  });

const openTitleEditor = async (wrapper: ReturnType<typeof mountRow>): Promise<void> => {
  await wrapper.get('.task-title').trigger('click');
  await flushPromises();
};

test('AgendaTaskRow reports an opened title editor', async () => {
  const wrapper = mountRow();

  await openTitleEditor(wrapper);

  expect(wrapper.emitted('title-editing')).toEqual([[true]]);
});

test('AgendaTaskRow reports a closed title editor after submit', async () => {
  const wrapper = mountRow();
  await openTitleEditor(wrapper);

  wrapper.getComponent(OrgInlineEditorStub).vm.$emit('submit');
  await flushPromises();

  expect(wrapper.emitted('title-editing')).toEqual([[true], [false]]);
});

test('AgendaTaskRow reports a closed title editor when unmounted mid-edit', async () => {
  const onTitleEditing = vi.fn();
  const isRowMounted = ref(true);
  const Host = defineComponent({
    setup: () => () => (isRowMounted.value ? h(AgendaTaskRow, { task, onTitleEditing }) : null),
  });
  const wrapper = mount(Host, {
    global: {
      stubs: {
        AgendaEntryRow: AgendaEntryRowStub,
        OrgInlineEditor: OrgInlineEditorStub,
        AgendaScheduleButton: true,
        ActionButton: true,
      },
    },
  });
  await wrapper.get('.task-title').trigger('click');
  await flushPromises();

  isRowMounted.value = false;
  await flushPromises();

  expect(onTitleEditing.mock.calls).toEqual([[true], [false]]);
});
