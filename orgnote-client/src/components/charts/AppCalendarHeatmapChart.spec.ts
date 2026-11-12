import { mount } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';

const echartsMock = vi.hoisted(() => {
  const callbacks = { click: undefined as ((event: unknown) => void) | undefined };
  const chart = {
    dispose: vi.fn(),
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      if (event === 'click') callbacks.click = handler;
    }),
    resize: vi.fn(),
    setOption: vi.fn(),
  };
  return {
    callbacks,
    chart,
    init: vi.fn(() => chart),
    use: vi.fn(),
  };
});

vi.mock('@vueuse/core', () => ({ useResizeObserver: vi.fn() }));
vi.mock('src/stores/theme', () => ({
  useThemeStore: () => ({ activeThemeName: null, effectiveMode: 'light' }),
}));
vi.mock('echarts/core', () => ({
  color: { lerp: (_weight: number, colors: string[]) => colors[0] },
  format: { encodeHTML: (value: string) => value },
  init: echartsMock.init,
  use: echartsMock.use,
}));
vi.mock('echarts/charts', () => ({ CustomChart: {}, HeatmapChart: {} }));
vi.mock('echarts/components', () => ({
  AriaComponent: {},
  CalendarComponent: {},
  GridComponent: {},
  TooltipComponent: {},
  VisualMapPiecewiseComponent: {},
}));
vi.mock('echarts/renderers', () => ({ SVGRenderer: {} }));

import AppCalendarHeatmapChart from './AppCalendarHeatmapChart.vue';
import type { CalendarHeatmapLabels } from './calendar-heatmap-types';

const labels: CalendarHeatmapLabels = {
  ariaLabel: 'Focus heatmap',
  less: 'Less',
  more: 'More',
  formatValue: (value) => `${value} min`,
};

const createWrapper = (view: 'month' | 'year' = 'year') =>
  mount(AppCalendarHeatmapChart, {
    props: {
      entries: [{ date: '2025-04-15', value: 50 }],
      labels,
      month: 4,
      selectedDate: '2025-04-15',
      view,
      year: 2025,
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  echartsMock.callbacks.click = undefined;
});

test('calendar heatmap initializes the SVG renderer', () => {
  const wrapper = createWrapper();
  const chartElement = wrapper.find('[role="img"]').element;
  expect(echartsMock.init).toHaveBeenCalledWith(chartElement, undefined, { renderer: 'svg' });
  expect(echartsMock.chart.setOption).toHaveBeenCalledOnce();
  expect(wrapper.text()).toContain('Less');
  expect(wrapper.text()).toContain('More');
  expect(wrapper.find('.legend').classes()).toContain('gap-sm');
  expect(wrapper.find('.swatches').classes()).toContain('gap-xs');
});

test('calendar heatmap emits the clicked date', () => {
  const wrapper = createWrapper();
  echartsMock.callbacks.click?.({ seriesType: 'heatmap', value: ['2025-02-03', 25] });
  expect(wrapper.emitted('selectDate')).toEqual([['2025-02-03']]);
});

test('calendar heatmap ignores clicks outside the heatmap series', () => {
  const wrapper = createWrapper();
  echartsMock.callbacks.click?.({ seriesType: 'line', value: ['2025-02-03', 25] });
  expect(wrapper.emitted('selectDate')).toBeUndefined();
});

test('calendar heatmap renders the requested month view', () => {
  createWrapper('month');
  const latestOption = echartsMock.chart.setOption.mock.calls.at(-1)?.[0] as {
    calendar?: unknown;
  };
  expect(latestOption.calendar).toHaveLength(1);
});

test('calendar heatmap updates its option after selection changes', async () => {
  const selectedDate = ref('2025-04-15');
  mount(
    defineComponent({
      components: { AppCalendarHeatmapChart },
      setup: () => ({ labels, selectedDate }),
      template:
        '<app-calendar-heatmap-chart :entries="[]" :labels="labels" :month="4" view="year" :selected-date="selectedDate" :year="2025" />',
    }),
  );
  await nextTick();
  const updateCount = echartsMock.chart.setOption.mock.calls.length;
  selectedDate.value = '2025-04-16';
  await nextTick();
  expect(echartsMock.chart.setOption.mock.calls.length).toBeGreaterThan(updateCount);
});

test('calendar heatmap disposes its renderer on unmount', () => {
  const wrapper = createWrapper();
  wrapper.unmount();
  expect(echartsMock.chart.dispose).toHaveBeenCalledOnce();
});
