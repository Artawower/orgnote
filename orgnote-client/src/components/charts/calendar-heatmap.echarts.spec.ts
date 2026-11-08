import { expect, test } from 'vitest';
import { createCalendarHeatmapOption } from './calendar-heatmap';
import type {
  CalendarHeatmapLabels,
  CalendarHeatmapPalette,
} from './calendar-heatmap-types';
import { init } from './echarts-runtime';

const labels: CalendarHeatmapLabels = {
  ariaLabel: 'Focus heatmap',
  less: 'Less',
  more: 'More',
  formatValue: (value) => `${value} min`,
};

const palette: CalendarHeatmapPalette = {
  background: '#ffffff',
  empty: '#eeeeee',
  levels: ['#ddddff', '#aaaaff', '#7777ff', '#4444ff'],
  label: '#333333',
  selectedBorder: '#111111',
  tooltipBackground: '#ffffff',
  tooltipBorder: '#cccccc',
  tooltipText: '#111111',
};

const option = createCalendarHeatmapOption({
  entries: [{ date: '2025-01-01', value: 25 }],
  labels,
  locale: 'en-US',
  month: 1,
  palette,
  view: 'year',
  year: 2025,
});

test('calendar heatmap renders through the actual ECharts SVG renderer', () => {
  const chart = init(null, undefined, {
    height: 176,
    renderer: 'svg',
    ssr: true,
    width: 800,
  });
  chart.setOption(option);
  const firstDay = chart.convertToPixel({ seriesIndex: 0 }, '2025-01-01');
  const nextDay = chart.convertToPixel({ seriesIndex: 0 }, '2025-01-02');
  const nextWeek = chart.convertToPixel({ seriesIndex: 0 }, '2025-01-08');
  if (!Array.isArray(firstDay) || !Array.isArray(nextDay) || !Array.isArray(nextWeek)) {
    throw new Error('Expected calendar pixel coordinates');
  }
  expect(Math.abs((nextDay[1] ?? 0) - (firstDay[1] ?? 0))).toBe(13);
  expect(Math.abs((nextWeek[0] ?? 0) - (firstDay[0] ?? 0))).toBe(13);
  expect(chart.renderToSVGString()).toContain('<svg');
  chart.dispose();
});

test('calendar heatmap displays its HTML tooltip', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const chart = init(root, undefined, { height: 176, renderer: 'svg', width: 800 });
  chart.setOption(option);
  chart.dispatchAction({ type: 'showTip', dataIndex: 0, seriesIndex: 0 });
  expect(root.textContent).toContain('Jan 1, 2025: 25 min');
  chart.dispose();
  root.remove();
});
