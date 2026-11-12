import { expect, test } from 'vitest';
import { resolveCalendarHeatmapLevel } from './calendar-heatmap-data';
import { createCalendarHeatmapOption } from './calendar-heatmap';
import {
  createCalendarHeatmapTooltip,
  formatCalendarHeatmapTooltip,
} from './calendar-heatmap-tooltip';
import type {
  CalendarHeatmapLabels,
  CalendarHeatmapPalette,
} from './calendar-heatmap-types';

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

const createOption = (
  overrides: Partial<Parameters<typeof createCalendarHeatmapOption>[0]> = {},
) =>
  createCalendarHeatmapOption({
    entries: [],
    labels,
    locale: 'en-US',
    month: 6,
    palette,
    view: 'year',
    year: 2025,
    ...overrides,
  });

const getSeriesData = (option: ReturnType<typeof createOption>, seriesIndex = 0) => {
  const series = Array.isArray(option.series) ? option.series[seriesIndex] : option.series;
  if (!series || series.type !== 'heatmap' || !Array.isArray(series.data)) {
    throw new Error('Expected heatmap series data');
  }
  return series.data;
};

const getDataItem = (option: ReturnType<typeof createOption>, date: string) => {
  const item = getSeriesData(option).find(
    (candidate) => !Array.isArray(candidate) && candidate.value[0] === date,
  );
  if (!item || Array.isArray(item)) throw new Error(`Expected data for ${date}`);
  return item;
};

test('calendar heatmap includes every day of a leap year', () => {
  const option = createOption({ year: 2024 });
  expect(getSeriesData(option)).toHaveLength(366);
  expect(getDataItem(option, '2024-02-29').value).toEqual(['2024-02-29', 0, 0]);
});

test('calendar heatmap aggregates duplicate daily values', () => {
  const option = createOption({
    entries: [
      { date: '2025-03-10', value: 20 },
      { date: '2025-03-10', value: 30 },
      { date: '2025-03-10', value: Number.NaN },
    ],
  });
  expect(getDataItem(option, '2025-03-10').value).toEqual(['2025-03-10', 50, 1]);
});

test('calendar heatmap marks the selected date', () => {
  const option = createOption({ selectedDate: '2025-07-08' });
  const item = getDataItem(option, '2025-07-08');
  expect(item.itemStyle?.borderColor).toBe(palette.selectedBorder);
  expect(item.itemStyle?.borderWidth).toBe(2);
});

test('calendar heatmap uses square cells for the year view', () => {
  const option = createOption();
  const calendar = Array.isArray(option.calendar) ? option.calendar[0] : option.calendar;
  expect(calendar?.cellSize).toEqual([13, 13]);
  expect(calendar?.left).toBe('center');
  expect(calendar?.bottom).toBeUndefined();
  expect(calendar?.right).toBeUndefined();
});

test('calendar heatmap centers one requested month', () => {
  const option = createOption({ month: 6, view: 'month' });
  expect(option.calendar).toHaveLength(1);
  expect(option.series).toHaveLength(1);
  if (!Array.isArray(option.calendar)) throw new Error('Expected monthly calendar');
  expect(option.calendar[0]).toMatchObject({
    cellSize: [15, 15],
    left: 'center',
    range: '2025-06',
  });
  expect(getSeriesData(option)).toHaveLength(30);
});

test('calendar heatmap formats a date-only tooltip for empty days', () => {
  const tooltip = formatCalendarHeatmapTooltip(['2025-01-01', 0, 0], labels, 'en-US');
  expect(tooltip).toBe('Jan 1, 2025');
});

test('calendar heatmap appends a formatted positive value to its tooltip', () => {
  const tooltip = formatCalendarHeatmapTooltip(['2025-01-01', 25, 1], labels, 'en-US');
  expect(tooltip).toBe('Jan 1, 2025: 25 min');
});

test('calendar heatmap uses an HTML tooltip with encoded values', () => {
  const htmlLabels = { ...labels, formatValue: () => '<strong>25 min</strong>' };
  expect(createCalendarHeatmapTooltip(htmlLabels, 'en-US', palette).renderMode).toBe('html');
  expect(
    formatCalendarHeatmapTooltip(['2025-01-01', 25, 1], htmlLabels, 'en-US'),
  ).toBe('Jan 1, 2025: &lt;strong&gt;25 min&lt;/strong&gt;');
});

test('calendar heatmap configures a hidden piecewise visual map', () => {
  const option = createOption();
  expect(option.visualMap).toMatchObject({
    dimension: 2,
    pieces: [palette.empty, ...palette.levels].map((color, value) => ({ color, value })),
    show: false,
    type: 'piecewise',
  });
});

test('calendar heatmap maps positive values into four relative levels', () => {
  const thresholds = [25, 50, 75];
  expect([0, 10, 30, 60, 100].map((value) => resolveCalendarHeatmapLevel(value, thresholds))).toEqual([
    0, 1, 2, 3, 4,
  ]);
});
