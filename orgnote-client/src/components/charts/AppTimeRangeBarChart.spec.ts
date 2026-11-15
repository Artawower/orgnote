import { mount } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';

const echartsMock = vi.hoisted(() => {
  const chart = {
    dispose: vi.fn(),
    on: vi.fn(),
    resize: vi.fn(),
    setOption: vi.fn(),
  };
  return {
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

import AppTimeRangeBarChart from './AppTimeRangeBarChart.vue';
import type { TimeRangeBarEntry, TimeRangeBarLabels } from './time-range-bar-types';

const DAY_START = Date.UTC(2025, 0, 1);
const HOUR_MS = 60 * 60 * 1000;

const labels: TimeRangeBarLabels = {
  ariaLabel: 'Focus intervals',
  formatDuration: (duration) => `${duration / 60_000} min`,
};

const createWrapper = () =>
  mount(AppTimeRangeBarChart, {
    props: {
      entries: [
        {
          label: 'Write notes',
          startTime: DAY_START + HOUR_MS,
          endTime: DAY_START + 2 * HOUR_MS,
        },
      ],
      labels,
      range: { startTime: DAY_START, endTime: DAY_START + 24 * HOUR_MS },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
});

test('time range bar initializes the shared SVG renderer', () => {
  const wrapper = createWrapper();
  const chartElement = wrapper.find('[role="img"]').element;
  expect(echartsMock.init).toHaveBeenCalledWith(chartElement, undefined, { renderer: 'svg' });
  expect(echartsMock.chart.setOption).toHaveBeenCalled();
  expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe(labels.ariaLabel);
});

test('time range bar updates its option when entries change', async () => {
  const entries = ref<readonly TimeRangeBarEntry[]>([]);
  mount(
    defineComponent({
      components: { AppTimeRangeBarChart },
      setup: () => ({ entries, labels }),
      template:
        '<app-time-range-bar-chart :entries="entries" :labels="labels" :range="{ startTime: 0, endTime: 100 }" />',
    }),
  );
  await nextTick();
  const updateCount = echartsMock.chart.setOption.mock.calls.length;
  entries.value = [{ label: 'Write notes', startTime: 10, endTime: 20 }];
  await nextTick();
  expect(echartsMock.chart.setOption.mock.calls.length).toBeGreaterThan(updateCount);
});

test('time range bar disposes its renderer on unmount', () => {
  const wrapper = createWrapper();
  wrapper.unmount();
  expect(echartsMock.chart.dispose).toHaveBeenCalledOnce();
});
