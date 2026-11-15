import { expect, test } from 'vitest';
import type { ChartPalette } from './chart-palette';
import { createTimeRangeBarOption } from './time-range-bar';
import type { TimeRangeBarLabels, TimeRangeBarRange } from './time-range-bar-types';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_START = Date.UTC(2025, 0, 1, 8);

const range: TimeRangeBarRange = {
  startTime: DAY_START,
  endTime: DAY_START + 10 * HOUR_MS,
};

const formatTime = (timestamp: number): string => {
  const minutes = (timestamp - DAY_START) / MINUTE_MS + 8 * 60;
  const hour = Math.floor(minutes / 60);
  return `${hour}:${String(minutes % 60).padStart(2, '0')}`;
};

const labels: TimeRangeBarLabels = {
  ariaLabel: 'Focus intervals',
  formatDuration: (duration) => `${duration / MINUTE_MS} min`,
  formatTime,
};

const palette: ChartPalette = {
  accent: '#7654d8',
  background: '#ffffff',
  border: '#dddddd',
  foreground: '#222222',
  muted: '#777777',
  surface: '#f8f8f8',
};

const createOption = (
  overrides: Partial<Parameters<typeof createTimeRangeBarOption>[0]> = {},
) =>
  createTimeRangeBarOption({
    entries: [],
    labels,
    locale: 'en-US',
    palette,
    range,
    ...overrides,
  });

const getSeries = (option: ReturnType<typeof createOption>) => {
  const series = Array.isArray(option.series) ? option.series[0] : option.series;
  if (!series || series.type !== 'custom') throw new Error('Expected custom range series');
  return series;
};

const getAxis = <Axis>(axis: Axis | Axis[] | undefined): Axis => {
  const resolvedAxis = Array.isArray(axis) ? axis[0] : axis;
  if (!resolvedAxis) throw new Error('Expected chart axis');
  return resolvedAxis;
};

test('time range bars grow upward over their actual time intervals', () => {
  const option = createOption({
    entries: [
      {
        label: 'Write notes',
        startTime: DAY_START + 2 * HOUR_MS,
        endTime: DAY_START + 2 * HOUR_MS + 25 * MINUTE_MS,
      },
    ],
  });
  const series = getSeries(option);
  expect(series.data).toEqual([[2 * HOUR_MS, 2 * HOUR_MS + 25 * MINUTE_MS, 25 * MINUTE_MS]]);
  expect(getAxis(option.xAxis)).toMatchObject({ min: 0, type: 'value' });
  expect(getAxis(option.yAxis)).toMatchObject({ min: 0, type: 'value' });
  if (typeof series.renderItem !== 'function') throw new Error('Expected range bar renderer');
  const values = [10, 20, 10];
  const item = series.renderItem({} as never, {
    coord: ([x, y]: number[]) => [x ?? 0, 100 - (y ?? 0)],
    value: (dimension: number) => values[dimension],
  } as never);
  expect(item).toMatchObject({
    shape: { height: 10, width: 10, x: 10, y: 90 },
    style: { fill: palette.accent },
    type: 'rect',
  });
});

test('time range bars clip entries to the visible range and preserve gaps', () => {
  const option = createOption({
    entries: [
      {
        label: 'Late session',
        startTime: range.endTime - 30 * MINUTE_MS,
        endTime: range.endTime + HOUR_MS,
      },
      {
        label: 'Early session',
        startTime: range.startTime - HOUR_MS,
        endTime: range.startTime + 15 * MINUTE_MS,
      },
      {
        label: 'Outside',
        startTime: range.endTime + HOUR_MS,
        endTime: range.endTime + 2 * HOUR_MS,
      },
    ],
  });
  expect(getSeries(option).data).toEqual([
    [0, 15 * MINUTE_MS, 15 * MINUTE_MS],
    [range.endTime - range.startTime - 30 * MINUTE_MS, 10 * HOUR_MS, 30 * MINUTE_MS],
  ]);
});

test('time range bars exclude incomplete and reversed entries', () => {
  const option = createOption({
    entries: [
      { label: 'Equal', startTime: DAY_START, endTime: DAY_START },
      { label: 'Reversed', startTime: DAY_START + HOUR_MS, endTime: DAY_START },
      { label: 'Invalid', startTime: Number.NaN, endTime: DAY_START },
    ],
  });
  expect(getSeries(option).data).toEqual([]);
});

test('time range bars use an HTML tooltip with encoded entry details', () => {
  const option = createOption({
    entries: [
      {
        label: 'Write <notes>',
        startTime: DAY_START + HOUR_MS,
        endTime: DAY_START + HOUR_MS + 25 * MINUTE_MS,
      },
    ],
  });
  const tooltip = Array.isArray(option.tooltip) ? option.tooltip[0] : option.tooltip;
  if (!tooltip || typeof tooltip.formatter !== 'function') throw new Error('Expected tooltip formatter');
  const result = tooltip.formatter({ dataIndex: 0 } as never, '', () => undefined);
  expect(tooltip).toMatchObject({ renderMode: 'html', trigger: 'item' });
  expect(result).toBe('Write &lt;notes&gt;<br>9:00–9:25 · 25 min');
});

test('time range bars keep an empty invalid range renderable', () => {
  const option = createOption({ range: { startTime: DAY_START, endTime: DAY_START } });
  expect(getAxis(option.xAxis).max).toBe(1);
  expect(getSeries(option).data).toEqual([]);
});
