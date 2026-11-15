import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { expect, test, vi } from 'vitest';
import { DefaultCommands } from 'orgnote-api';

import AgendaTaskGroupHeader from './AgendaTaskGroupHeader.vue';
import type { AgendaTaskGroup } from '../composables/use-agenda-tasks';
import { AGENDA_QUICK_ADD_TO_FILE_COMMAND } from '../constants';

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

const AppSpoilerStub = defineComponent({
  name: 'AppSpoiler',
  props: {
    variant: String,
    modelValue: { type: Boolean, default: undefined },
  },
  emits: ['update:modelValue'],
  template: '<section><slot name="title" /><slot name="actions" /></section>',
});

const CommandActionButtonStub = defineComponent({
  name: 'CommandActionButton',
  props: { command: String, data: Object },
  template: '<button class="command-action-stub" />',
});

const group: AgendaTaskGroup = {
  fileTitle: 'Inbox',
  filePath: '/inbox.org',
  tasks: [],
};

const mountHeader = (props: { expanded?: boolean } = {}) =>
  mount(AgendaTaskGroupHeader, {
    props: { group, ...props },
    global: {
      stubs: { AppSpoiler: AppSpoilerStub, CommandActionButton: CommandActionButtonStub },
    },
  });

test('AgendaTaskGroupHeader renders a flat spoiler with the file title', () => {
  const wrapper = mountHeader();

  expect(wrapper.getComponent(AppSpoilerStub).props('variant')).toBe('flat');
  expect(wrapper.text()).toContain('Inbox');
});

test('AgendaTaskGroupHeader exposes quick-add and open-note commands for its file', () => {
  const wrapper = mountHeader();
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

test('AgendaTaskGroupHeader restores controlled group visibility', () => {
  const wrapper = mountHeader({ expanded: false });

  expect(wrapper.getComponent(AppSpoilerStub).props('modelValue')).toBe(false);
});

test('AgendaTaskGroupHeader reports collapsing the group', async () => {
  const wrapper = mountHeader();

  wrapper.getComponent(AppSpoilerStub).vm.$emit('update:modelValue', false);

  expect(wrapper.emitted('update:expanded')).toEqual([[false]]);
});
