import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { defineComponent, h } from 'vue';
import AppDatePicker from './AppDatePicker.vue';
import type { DateMarker } from 'src/models/date-picker';
import { parseCalendarDate } from 'src/utils/org-date';

const QDateStub = defineComponent({
  name: 'QDate',
  props: {
    modelValue: { default: null },
    minimal: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    range: { type: Boolean, default: false },
    events: { default: undefined },
    eventColor: { default: undefined },
    options: { default: undefined },
    firstDayOfWeek: { default: undefined },
    defaultView: { default: 'Calendar' },
    navigationMinYearMonth: { default: undefined },
    navigationMaxYearMonth: { default: undefined },
    todayBtn: { type: Boolean, default: false },
    emitImmediately: { type: Boolean, default: false },
    flat: { type: Boolean, default: false },
    bordered: { type: Boolean, default: false },
  },
  emits: ['update:model-value', 'navigation', 'range-start', 'range-end'],
  setup(_, { expose }) {
    expose({
      setToday: () => {},
      setView: () => {},
    });
    return () => h('div', { class: 'q-date-stub' });
  },
});

const createWrapper = (props: Record<string, unknown> = {}) =>
  mount(AppDatePicker, {
    props: {
      modelValue: '2025/03/15',
      'onUpdate:modelValue': (v: unknown) => v,
      ...props,
    },
    global: {
      stubs: { QDate: QDateStub },
    },
  });

test('AppDatePicker renders QDate component', () => {
  const wrapper = createWrapper();
  expect(wrapper.find('.app-date-picker').exists()).toBe(true);
  expect(wrapper.findComponent(QDateStub).exists()).toBe(true);
});

test('AppDatePicker applies readonly class when readonly', () => {
  const wrapper = createWrapper({ readonly: true });
  expect(wrapper.find('.is-readonly').exists()).toBe(true);
});

test('AppDatePicker does not apply readonly class by default', () => {
  const wrapper = createWrapper();
  expect(wrapper.find('.is-readonly').exists()).toBe(false);
});

test('AppDatePicker applies minimal class when minimal', () => {
  const wrapper = createWrapper({ minimal: true });
  expect(wrapper.find('.is-minimal').exists()).toBe(true);
});

test('AppDatePicker applies marker type class', () => {
  const wrapper = createWrapper({ markerType: 'bar' });
  expect(wrapper.find('.marker-bar').exists()).toBe(true);
});

test('AppDatePicker applies dot marker type by default', () => {
  const wrapper = createWrapper();
  expect(wrapper.find('.marker-dot').exists()).toBe(true);
});

test('AppDatePicker passes range prop to QDate when mode is range', () => {
  const wrapper = createWrapper({
    mode: 'range',
    modelValue: { from: '2025/03/01', to: '2025/03/15' },
  });
  const qDate = wrapper.findComponent(QDateStub);
  expect(qDate.props('range')).toBe(true);
  expect(qDate.props('multiple')).toBe(false);
});

test('AppDatePicker passes multiple prop to QDate when mode is multiple', () => {
  const wrapper = createWrapper({
    mode: 'multiple',
    modelValue: ['2025/03/01', '2025/03/15'],
  });
  const qDate = wrapper.findComponent(QDateStub);
  expect(qDate.props('multiple')).toBe(true);
  expect(qDate.props('range')).toBe(false);
});

test('AppDatePicker single mode has no range or multiple', () => {
  const wrapper = createWrapper({ mode: 'single' });
  const qDate = wrapper.findComponent(QDateStub);
  expect(qDate.props('range')).toBe(false);
  expect(qDate.props('multiple')).toBe(false);
});

test('AppDatePicker passes minimal to QDate', () => {
  const wrapper = createWrapper({ minimal: true });
  const qDate = wrapper.findComponent(QDateStub);
  expect(qDate.props('minimal')).toBe(true);
});

test('AppDatePicker passes readonly to QDate', () => {
  const wrapper = createWrapper({ readonly: true });
  const qDate = wrapper.findComponent(QDateStub);
  expect(qDate.props('readonly')).toBe(true);
});

test('AppDatePicker passes firstDayOfWeek to QDate', () => {
  const wrapper = createWrapper({ firstDayOfWeek: 0 });
  const qDate = wrapper.findComponent(QDateStub);
  expect(qDate.props('firstDayOfWeek')).toBe(0);
});

test('AppDatePicker passes todayBtn to QDate', () => {
  const wrapper = createWrapper({ todayBtn: false });
  const qDate = wrapper.findComponent(QDateStub);
  expect(qDate.props('todayBtn')).toBe(false);
});

test('AppDatePicker passes defaultView to QDate', () => {
  const wrapper = createWrapper({ defaultView: 'Months' });
  const qDate = wrapper.findComponent(QDateStub);
  expect(qDate.props('defaultView')).toBe('Months');
});

test('AppDatePicker computes event dates from markers', () => {
  const markers: DateMarker[] = [
    { date: '2025/03/10', color: 'red' },
    { date: '2025/03/15', color: 'green' },
  ];
  const wrapper = createWrapper({ markers });
  const qDate = wrapper.findComponent(QDateStub);
  const eventsFn = qDate.props('events') as unknown as (date: string) => boolean;
  expect(eventsFn('2025/03/10')).toBe(true);
  expect(eventsFn('2025/03/15')).toBe(true);
  expect(eventsFn('2025/03/20')).toBe(false);
});

test('AppDatePicker computes event colors from markers', () => {
  const markers: DateMarker[] = [{ date: '2025/03/10', color: 'red' }, { date: '2025/03/15' }];
  const wrapper = createWrapper({ markers });
  const qDate = wrapper.findComponent(QDateStub);
  const colorFn = qDate.props('eventColor') as unknown as (date: string) => string;
  expect(colorFn('2025/03/10')).toBe('red');
  expect(colorFn('2025/03/15')).toBe('');
});

test('AppDatePicker handles disabledDates as array', () => {
  const wrapper = createWrapper({
    disabledDates: ['2025/03/01', '2025/03/02'],
  });
  const qDate = wrapper.findComponent(QDateStub);
  const optionsFn = qDate.props('options') as unknown as (date: string) => boolean;
  expect(optionsFn('2025/03/01')).toBe(false);
  expect(optionsFn('2025/03/02')).toBe(false);
  expect(optionsFn('2025/03/03')).toBe(true);
});

test('AppDatePicker handles disabledDates as function', () => {
  const isWeekend = (value: string) => {
    const date = parseCalendarDate(value);
    if (!date) return false;
    const day = date.getDay();
    return day === 0 || day === 6;
  };
  const wrapper = createWrapper({ disabledDates: isWeekend });
  const qDate = wrapper.findComponent(QDateStub);
  const optionsFn = qDate.props('options') as unknown as (date: string) => boolean;
  expect(optionsFn('2025/03/17')).toBe(true);
  expect(optionsFn('2025/03/15')).toBe(false);
});

test('AppDatePicker emits navigate on QDate navigation', async () => {
  const wrapper = createWrapper();
  const qDate = wrapper.findComponent(QDateStub);
  await qDate.vm.$emit('navigation', { year: 2025, month: 4 });
  expect(wrapper.emitted('navigate')).toBeTruthy();
  expect(wrapper.emitted('navigate')![0]).toEqual([{ year: 2025, month: 4 }]);
});

test('AppDatePicker emits rangeSelect on QDate range-end', async () => {
  const wrapper = createWrapper({ mode: 'range' });
  const qDate = wrapper.findComponent(QDateStub);
  await qDate.vm.$emit('range-end', {
    from: { year: 2025, month: 3, day: 1 },
    to: { year: 2025, month: 3, day: 15 },
  });
  expect(wrapper.emitted('rangeSelect')).toBeTruthy();
  expect(wrapper.emitted('rangeSelect')![0]).toEqual([{ from: '2025/03/01', to: '2025/03/15' }]);
});

test('AppDatePicker emits dateClick on model update', async () => {
  const wrapper = createWrapper();
  const qDate = wrapper.findComponent(QDateStub);
  await qDate.vm.$emit('update:model-value', '2025/03/20', 'add-day', {
    year: 2025,
    month: 3,
    day: 20,
  });
  expect(wrapper.emitted('dateClick')).toBeTruthy();
  expect(wrapper.emitted('dateClick')![0]).toEqual([{ date: '2025/03/20', markers: [] }]);
});

test('AppDatePicker dateClick includes markers for the clicked date', async () => {
  const markers: DateMarker[] = [{ date: '2025/03/20', color: 'blue', label: 'Meeting' }];
  const wrapper = createWrapper({ markers });
  const qDate = wrapper.findComponent(QDateStub);
  await qDate.vm.$emit('update:model-value', '2025/03/20', 'add-day', {
    year: 2025,
    month: 3,
    day: 20,
  });
  expect(wrapper.emitted('dateClick')![0]).toEqual([
    {
      date: '2025/03/20',
      markers: [{ date: '2025/03/20', color: 'blue', label: 'Meeting' }],
    },
  ]);
});

test('AppDatePicker groups multiple markers for same date', () => {
  const markers: DateMarker[] = [
    { date: '2025/03/10', color: 'red', label: 'Task 1' },
    { date: '2025/03/10', color: 'blue', label: 'Task 2' },
    { date: '2025/03/15', color: 'green' },
  ];
  const wrapper = createWrapper({ markers });
  const qDate = wrapper.findComponent(QDateStub);
  const eventsFn = qDate.props('events') as unknown as (date: string) => boolean;
  expect(eventsFn('2025/03/10')).toBe(true);
  const colorFn = qDate.props('eventColor') as unknown as (date: string) => string;
  expect(colorFn('2025/03/10')).toBe('red');
});

test('AppDatePicker passes navigation bounds to QDate', () => {
  const wrapper = createWrapper({
    minDate: '2025/01',
    maxDate: '2025/12',
  });
  const qDate = wrapper.findComponent(QDateStub);
  expect(qDate.props('navigationMinYearMonth')).toBe('2025/01');
  expect(qDate.props('navigationMaxYearMonth')).toBe('2025/12');
});

test('AppDatePicker exposes setToday method', () => {
  const wrapper = createWrapper();
  expect(wrapper.vm.setToday).toBeDefined();
  expect(typeof wrapper.vm.setToday).toBe('function');
});

test('AppDatePicker exposes setView method', () => {
  const wrapper = createWrapper();
  expect(wrapper.vm.setView).toBeDefined();
  expect(typeof wrapper.vm.setView).toBe('function');
});
