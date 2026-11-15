import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { expect, test, vi } from 'vitest';
import type * as VueI18n from 'vue-i18n';
import type {
  DatePickerSelection,
  DatePickerSelectionMode,
} from 'src/models/date-picker';
import DatePickerSheet from './DatePickerSheet.vue';

vi.mock('vue-i18n', async () => ({
  ...((await vi.importActual('vue-i18n')) as typeof VueI18n),
  useI18n: () => ({ t: (key: string) => key }),
}));

const ActionButtonStub = defineComponent({
  name: 'ActionButton',
  props: ['icon'],
  setup: () => () => h('button'),
});

const AppSegmentedControlStub = defineComponent({
  name: 'AppSegmentedControl',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  setup: () => () => h('div'),
});

const AppDatePickerStub = defineComponent({
  name: 'AppDatePicker',
  props: ['modelValue', 'mode'],
  emits: ['dateClick', 'rangeSelect'],
  setup: () => () => h('div'),
});

interface DatePickerSheetProps {
  modelValue?: DatePickerSelection;
  selectionMode?: DatePickerSelectionMode;
  confirmMode?: boolean;
  showShortcuts?: boolean;
}

const mountSheet = (props: DatePickerSheetProps) =>
  mount(DatePickerSheet, {
    props,
    global: {
      stubs: {
        ActionButton: ActionButtonStub,
        AppDatePicker: AppDatePickerStub,
        AppSegmentedControl: AppSegmentedControlStub,
        AppButton: { template: '<button><slot /></button>' },
      },
    },
  });

test('DatePickerSheet confirms a date range in range mode', async () => {
  const wrapper = mountSheet({
    modelValue: { from: '2026-05-14', to: '2026-05-18' },
    selectionMode: 'range',
    confirmMode: true,
    showShortcuts: false,
  });

  await wrapper.findComponent(AppDatePickerStub).vm.$emit('rangeSelect', {
    from: '2026/05/20',
    to: '2026/05/24',
  });
  await wrapper.findAll('.footer-button')[1]?.trigger('click');

  expect(wrapper.emitted('update:modelValue')).toEqual([
    [{ from: '2026-05-20', to: '2026-05-24' }],
  ]);
  expect(wrapper.emitted('confirm')).toEqual([
    [{ from: '2026-05-20', to: '2026-05-24' }],
  ]);
});

test('DatePickerSheet lets users switch from a single day to a range', async () => {
  const wrapper = mountSheet({
    modelValue: '2026-05-14',
    selectionMode: 'both',
    confirmMode: true,
    showShortcuts: false,
  });

  expect(wrapper.findComponent(AppDatePickerStub).props('mode')).toBe('single');

  await wrapper.findComponent(AppSegmentedControlStub).vm.$emit('update:modelValue', 'range');

  expect(wrapper.findComponent(AppDatePickerStub).props('mode')).toBe('range');
});

test('DatePickerSheet follows an externally selected range', async () => {
  const wrapper = mountSheet({
    modelValue: '2026-05-14',
    selectionMode: 'both',
    confirmMode: true,
  });

  await wrapper.setProps({
    modelValue: { from: '2026-05-14', to: '2026-05-18' },
  });

  expect(wrapper.findComponent(AppDatePickerStub).props('mode')).toBe('range');
});

test('DatePickerSheet ignores single-date events while range mode is active', async () => {
  const wrapper = mountSheet({
    modelValue: { from: '2026-05-14', to: '2026-05-18' },
    selectionMode: 'both',
    confirmMode: true,
    showShortcuts: false,
  });

  await wrapper.findComponent(AppDatePickerStub).vm.$emit('dateClick', {
    date: '2026/05/20',
  });
  await wrapper.findComponent(AppSegmentedControlStub).vm.$emit('update:modelValue', 'single');
  await wrapper.findAll('.footer-button')[1]?.trigger('click');

  expect(wrapper.emitted('confirm')).toEqual([['2026-05-14']]);
});

test('DatePickerSheet keeps the Next 7 Days shortcut as a single future date', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T12:00:00'));
  const wrapper = mountSheet({ selectionMode: 'single' });

  await wrapper.findAllComponents(ActionButtonStub)[2]?.trigger('click');

  expect(wrapper.emitted('update:modelValue')).toEqual([['2026-05-21']]);
  vi.useRealTimers();
});

test('DatePickerSheet confirms a cleared selection', async () => {
  const wrapper = mountSheet({
    modelValue: { from: '2026-05-14', to: '2026-05-18' },
    selectionMode: 'range',
    confirmMode: true,
    showShortcuts: false,
  });
  const footerButtons = wrapper.findAll('.footer-button');

  await footerButtons[0]?.trigger('click');
  await footerButtons[1]?.trigger('click');

  expect(wrapper.emitted('confirm')).toEqual([[undefined]]);
});
