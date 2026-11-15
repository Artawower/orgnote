import { expect, test } from 'vitest';
import type { ChartPalette } from './chart-palette';
import { init } from './echarts-runtime';
import { createTimeRangeBarOption } from './time-range-bar';
import type { TimeRangeBarLabels } from './time-range-bar-types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_START = Date.UTC(2025, 0, 1);

const labels: TimeRangeBarLabels = {
  ariaLabel: 'Focus intervals',
  formatDuration: (duration) => `${duration / 60_000} min`,
};

const palette: ChartPalette = {
  accent: '#7654d8',
  background: '#ffffff',
  border: '#dddddd',
  foreground: '#222222',
  muted: '#777777',
  surface: '#f8f8f8',
};

const option = createTimeRangeBarOption({
  entries: [
    {
      label: 'Write notes',
      startTime: DAY_START + 9 * HOUR_MS,
      endTime: DAY_START + 10 * HOUR_MS,
    },
  ],
  labels,
  locale: 'en-US',
  palette,
  range: { startTime: DAY_START, endTime: DAY_START + 24 * HOUR_MS },
});

test('time range bars render upward through the actual ECharts SVG renderer', () => {
  const chart = init(null, undefined, {
    height: 320,
    renderer: 'svg',
    ssr: true,
    width: 900,
  });
  chart.setOption(option);
  const svg = chart.renderToSVGString();
  expect(svg).toContain('<svg');
  expect(svg).toContain(palette.accent);
  chart.dispose();
});

test('time range bars display their HTML tooltip', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const chart = init(root, undefined, { height: 320, renderer: 'svg', width: 900 });
  chart.setOption(option);
  chart.dispatchAction({ type: 'showTip', dataIndex: 0, seriesIndex: 0 });
  expect(root.textContent).toContain('Write notes');
  expect(root.textContent).toContain('60 min');
  chart.dispose();
  root.remove();
});
