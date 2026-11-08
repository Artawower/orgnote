import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const screen = vi.hoisted(() => ({ tabletBelow: { value: false } }));

const tasksStore = vi.hoisted(() => ({
  ensureLoaded: vi.fn(),
  loadFiles: vi.fn(),
  allFiles: [
    {
      id: 'project',
      filePath: ['notes', 'project.org'],
      title: 'Project',
      tasks: [
        {
          id: 'write-notes',
          text: 'Write notes',
          start: 42,
          clocks: [
            { date: '2026-07-29T08:00:00', to: '2026-07-29T08:25:00' },
            { date: '2026-07-29T10:00:00', to: '2026-07-29T10:25:00' },
            { date: '2026-07-30T09:00:00', to: '2026-07-30T09:30:00' },
          ],
        },
      ],
    },
  ],
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: { value: 'en-US' }, t: (key: string) => key }),
}));
vi.mock('src/boot/api', () => ({
  api: { ui: { useScreenDetection: () => screen } },
}));
vi.mock('./stores/agenda-tasks-store', () => ({ useAgendaTasksStore: () => tasksStore }));

import AgendaPomodoroStatsBuffer from './AgendaPomodoroStatsBuffer.vue';

const CalendarStub = defineComponent({
  name: 'AppCalendarHeatmapChart',
  props: ['entries', 'labels', 'locale', 'month', 'selectedDate', 'view', 'year'],
  emits: ['select-date'],
  template: '<button class="select-date" @click="$emit(\'select-date\', \'2026-07-30\')" />',
});

const TimeRangeStub = defineComponent({
  name: 'AppTimeRangeBarChart',
  props: ['entries', 'labels', 'locale', 'range'],
  template: '<div />',
});

const FocusRecordStub = defineComponent({
  name: 'AgendaFocusRecord',
  props: ['intervals'],
  template: '<div />',
});

const OverviewStub = defineComponent({ name: 'AgendaPomodoroOverview', template: '<div />' });
const DefaultSlotStub = defineComponent({ template: '<div><slot /></div>' });
const BodySlotStub = defineComponent({ template: '<div><slot name="body" /></div>' });

const mountBuffer = () =>
  mount(AgendaPomodoroStatsBuffer, {
    global: {
      stubs: {
        AgendaFocusRecord: FocusRecordStub,
        AgendaPomodoroOverview: OverviewStub,
        AppBufferContent: DefaultSlotStub,
        AppCalendarHeatmapChart: CalendarStub,
        AppFlex: DefaultSlotStub,
        AppTimeRangeBarChart: TimeRangeStub,
        AppTitle: DefaultSlotStub,
        ContainerLayout: BodySlotStub,
      },
    },
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-29T12:00:00'));
  screen.tabletBelow.value = false;
  tasksStore.ensureLoaded.mockClear();
  tasksStore.loadFiles.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

test('focus statistics default every daily view to today', () => {
  const wrapper = mountBuffer();
  const calendar = wrapper.getComponent(CalendarStub);
  expect(wrapper.findComponent(OverviewStub).exists()).toBe(true);
  expect(calendar.props()).toMatchObject({
    month: 7,
    selectedDate: '2026-07-29',
    view: 'year',
    year: 2026,
  });
  expect(calendar.props('entries')).toEqual(
    expect.arrayContaining([
      { date: '2026-07-29', value: 50 },
      { date: '2026-07-30', value: 30 },
    ]),
  );
  expect(wrapper.getComponent(TimeRangeStub).props('entries')).toHaveLength(2);
  expect(wrapper.getComponent(FocusRecordStub).props('intervals')).toHaveLength(2);
  expect(tasksStore.ensureLoaded).toHaveBeenCalledOnce();
  expect(tasksStore.loadFiles).not.toHaveBeenCalled();
});

test('focus statistics render one selected month on mobile', () => {
  screen.tabletBelow.value = true;
  const wrapper = mountBuffer();
  expect(wrapper.getComponent(CalendarStub).props()).toMatchObject({ month: 7, view: 'month' });
});

test('calendar selection updates the chart and focus records together', async () => {
  const wrapper = mountBuffer();
  await wrapper.get('.select-date').trigger('click');
  await nextTick();
  expect(wrapper.getComponent(CalendarStub).props('selectedDate')).toBe('2026-07-30');
  expect(wrapper.getComponent(TimeRangeStub).props('entries')).toHaveLength(1);
  expect(wrapper.getComponent(FocusRecordStub).props('intervals')).toHaveLength(1);
});
