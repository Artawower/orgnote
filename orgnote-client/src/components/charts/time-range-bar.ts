import type { CustomSeriesOption } from 'echarts/charts';
import type {
  AriaComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import { format, type ComposeOption } from 'echarts/core';
import type { ChartPalette } from './chart-palette';
import type {
  TimeRangeBarEntry,
  TimeRangeBarLabels,
  TimeRangeBarRange,
} from './time-range-bar-types';

type TimeRangeBarOption = ComposeOption<
  AriaComponentOption | CustomSeriesOption | GridComponentOption | TooltipComponentOption
>;
type CustomRenderItem = Exclude<NonNullable<CustomSeriesOption['renderItem']>, string>;

interface TimeRangeBarOptionInput {
  readonly entries: readonly TimeRangeBarEntry[];
  readonly labels: TimeRangeBarLabels;
  readonly locale: string;
  readonly palette: ChartPalette;
  readonly range: TimeRangeBarRange;
}

interface VisibleTimeRangeBarEntry extends TimeRangeBarEntry {
  readonly duration: number;
  readonly offset: number;
}

interface TimeRangeTooltipParams {
  readonly dataIndex: number;
}
const MINIMUM_RANGE_DURATION_MS = 1;
const MINIMUM_BAR_WIDTH = 2;
const RANGE_BAR_RADIUS = 4;
const GRID_INSET = 8;
const GRID_BOTTOM_INSET = 32;

const TIME_RANGE_GRID: GridComponentOption = {
  bottom: GRID_BOTTOM_INSET,
  left: GRID_INSET,
  outerBoundsContain: 'axisLabel',
  outerBoundsMode: 'same',
  right: GRID_INSET,
  top: GRID_INSET,
};

const hasValidRange = (range: TimeRangeBarRange): boolean =>
  Number.isFinite(range.startTime) &&
  Number.isFinite(range.endTime) &&
  range.endTime > range.startTime;

const intersectsRange = (entry: TimeRangeBarEntry, range: TimeRangeBarRange): boolean =>
  entry.startTime < range.endTime && entry.endTime > range.startTime;

const isValidEntry = (entry: TimeRangeBarEntry): boolean =>
  Number.isFinite(entry.startTime) &&
  Number.isFinite(entry.endTime) &&
  entry.endTime > entry.startTime;

const createVisibleEntries = (
  entries: readonly TimeRangeBarEntry[],
  range: TimeRangeBarRange,
): VisibleTimeRangeBarEntry[] => {
  if (!hasValidRange(range)) return [];
  return entries
    .filter((entry) => isValidEntry(entry) && intersectsRange(entry, range))
    .map((entry) => {
      const startTime = Math.max(entry.startTime, range.startTime);
      const endTime = Math.min(entry.endTime, range.endTime);
      return {
        ...entry,
        duration: endTime - startTime,
        endTime,
        offset: startTime - range.startTime,
        startTime,
      };
    })
    .sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime);
};

const createTimeFormatter = (labels: TimeRangeBarLabels, locale: string) => {
  if (labels.formatTime) return labels.formatTime;
  const formatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  return (timestamp: number): string => formatter.format(timestamp);
};

const createTooltip = (
  entries: readonly VisibleTimeRangeBarEntry[],
  labels: TimeRangeBarLabels,
  locale: string,
  palette: ChartPalette,
): TooltipComponentOption => {
  const formatTime = createTimeFormatter(labels, locale);
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    confine: true,
    renderMode: 'html',
    textStyle: { color: palette.foreground },
    trigger: 'item',
    formatter: (params) => {
      const { dataIndex } = params as TimeRangeTooltipParams;
      const entry = entries[dataIndex]!;
      const timeRange = `${formatTime(entry.startTime)}–${formatTime(entry.endTime)}`;
      const details = `${timeRange} · ${labels.formatDuration(entry.duration)}`;
      return [entry.label, details].map(format.encodeHTML).join('<br>');
    },
  };
};

const createRenderItem = (palette: ChartPalette): CustomRenderItem => (_params, api) => {
  const startOffset = Number(api.value(0));
  const endOffset = Number(api.value(1));
  const duration = Number(api.value(2));
  const startPoint = api.coord([startOffset, 0]);
  const endPoint = api.coord([endOffset, duration]);
  const startX = startPoint[0] ?? 0;
  const bottomY = startPoint[1] ?? 0;
  const endX = endPoint[0] ?? startX;
  const topY = endPoint[1] ?? bottomY;
  const intervalWidth = endX - startX;
  const width = Math.max(intervalWidth, MINIMUM_BAR_WIDTH);
  return {
    type: 'rect',
    emphasis: { style: { fill: palette.accent } },
    shape: {
      height: bottomY - topY,
      r: RANGE_BAR_RADIUS,
      width,
      x: startX - (width - intervalWidth) / 2,
      y: topY,
    },
    style: { fill: palette.accent },
  };
};

const createSeries = (
  entries: readonly VisibleTimeRangeBarEntry[],
  palette: ChartPalette,
): CustomSeriesOption => ({
  type: 'custom',
  clip: true,
  data: entries.map(({ duration, offset }) => [offset, offset + duration, duration]),
  dimensions: ['start', 'end', 'duration'],
  encode: { x: [0, 1], y: 2 },
  renderItem: createRenderItem(palette),
});

const createXAxis = (
  input: TimeRangeBarOptionInput,
  formatTime: (timestamp: number) => string,
  rangeDuration: number,
): NonNullable<TimeRangeBarOption['xAxis']> => {
  const axisStartTime = Number.isFinite(input.range.startTime) ? input.range.startTime : 0;
  return {
    type: 'value',
    min: 0,
    max: rangeDuration,
    axisLabel: {
      color: input.palette.muted,
      formatter: (offset: number) => formatTime(axisStartTime + offset),
    },
    axisLine: { lineStyle: { color: input.palette.border } },
    axisTick: { show: false },
    splitLine: { show: false },
  };
};

const createYAxis = (
  labels: TimeRangeBarLabels,
  palette: ChartPalette,
): NonNullable<TimeRangeBarOption['yAxis']> => ({
  type: 'value',
  min: 0,
  axisLabel: {
    color: palette.muted,
    formatter: (duration: number) => labels.formatDuration(duration),
  },
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: palette.border } },
});

export const createTimeRangeBarOption = (input: TimeRangeBarOptionInput): TimeRangeBarOption => {
  const entries = createVisibleEntries(input.entries, input.range);
  const formatTime = createTimeFormatter(input.labels, input.locale);
  const rangeDuration = hasValidRange(input.range)
    ? input.range.endTime - input.range.startTime
    : MINIMUM_RANGE_DURATION_MS;
  return {
    animation: false,
    aria: { description: input.labels.ariaLabel, enabled: true },
    grid: TIME_RANGE_GRID,
    series: [createSeries(entries, input.palette)],
    tooltip: createTooltip(entries, input.labels, input.locale, input.palette),
    xAxis: createXAxis(input, formatTime, rangeDuration),
    yAxis: createYAxis(input.labels, input.palette),
  };
};
