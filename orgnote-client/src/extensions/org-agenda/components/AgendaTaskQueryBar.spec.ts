import { beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import type * as VueI18n from 'vue-i18n';
import type { AgendaDateFilter } from '../models/agenda-task-query';
import { useAgendaFilterStore } from '../stores/agenda-filter-store';

vi.mock('vue-i18n', async () => ({
  ...((await vi.importActual('vue-i18n')) as typeof VueI18n),
  useI18n: () => ({ t: (key: string, params?: { count?: number }) => `${key}:${params?.count ?? ''}` }),
}));

const SearchInputStub = defineComponent({
  name: 'SearchInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup: (_, { slots }) => () => h('div', [slots.actions?.()]),
});

const DatePickerPopoverStub = defineComponent({
  name: 'DatePickerPopover',
  props: ['modelValue', 'selectionMode', 'confirmMode'],
  emits: ['confirm'],
  setup: (_, { slots }) => () => h('div', [slots.trigger?.({ open: vi.fn() })]),
});

const CommandActionButtonStub = defineComponent({
  name: 'CommandActionButton',
  props: ['command'],
  setup: () => () => h('button'),
});

const mountQueryBar = async (
  dateFilter: AgendaDateFilter = { kind: 'preset', value: 'all' },
) => {
  const { default: AgendaTaskQueryBar } = await import('./AgendaTaskQueryBar.vue');
  return mount(AgendaTaskQueryBar, {
    props: { dateFilter, resultCount: 4 },
    global: {
      stubs: {
        SearchInput: SearchInputStub,
        DatePickerPopover: DatePickerPopoverStub,
        CommandActionButton: CommandActionButtonStub,
      },
    },
  });
};

beforeEach(() => {
  setActivePinia(createPinia());
});

test('AgendaTaskQueryBar updates the shared Agenda search query', async () => {
  const wrapper = await mountQueryBar();

  await wrapper.findComponent(SearchInputStub).vm.$emit('update:modelValue', 'quarterly');

  expect(useAgendaFilterStore().searchQuery).toBe('quarterly');
});

test('AgendaTaskQueryBar requests a concrete selected day buffer', async () => {
  const wrapper = await mountQueryBar();

  await wrapper.findComponent(DatePickerPopoverStub).vm.$emit('confirm', '2026-05-18');

  expect(wrapper.emitted('select-date')).toEqual([['2026-05-18']]);
});

test('AgendaTaskQueryBar restores a day from its buffer-local filter', async () => {
  const wrapper = await mountQueryBar({ kind: 'day', value: '2026-05-20' });

  expect(wrapper.findComponent(DatePickerPopoverStub).props('modelValue')).toBe('2026-05-20');
});

test('AgendaTaskQueryBar requests the selected range buffer', async () => {
  const wrapper = await mountQueryBar();
  const picker = wrapper.findComponent(DatePickerPopoverStub);
  const selection = { from: '2026-05-14', to: '2026-05-18' };

  await picker.vm.$emit('confirm', selection);

  expect(picker.props('selectionMode')).toBe('both');
  expect(wrapper.emitted('select-date')).toEqual([[selection]]);
});

test('AgendaTaskQueryBar shows its buffer-local range and clear command', async () => {
  const wrapper = await mountQueryBar({
    kind: 'range',
    from: '2026-05-14',
    to: '2026-05-18',
  });
  const commands = wrapper
    .findAllComponents(CommandActionButtonStub)
    .map((button) => button.props('command'));

  expect(wrapper.text()).toContain('May 14, 2026 – May 18, 2026');
  expect(commands).toEqual(['agenda tasks: clear dates']);
});
