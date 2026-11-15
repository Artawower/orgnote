import { eachDayOfInterval, format } from 'date-fns';
import type { CalendarHeatmapEntry, CalendarHeatmapPalette } from './calendar-heatmap-types';

export interface DailyHeatmapValue {
  readonly date: string;
  readonly value: number;
}

const DATE_FORMAT = 'yyyy-MM-dd';
const EMPTY_INTENSITY_LEVEL = 0;
const ACTIVE_INTENSITY_LEVEL_COUNT = 4;
const INTENSITY_LEVEL_PERCENTILES = Array.from(
  { length: ACTIVE_INTENSITY_LEVEL_COUNT - 1 },
  (_, index) => (index + 1) / ACTIVE_INTENSITY_LEVEL_COUNT,
);

const createLocalDate = (year: number, month: number, day: number): Date => {
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
};

const aggregateEntries = (entries: readonly CalendarHeatmapEntry[]): Map<string, number> =>
  entries.reduce((values, entry) => {
    if (!Number.isFinite(entry.value) || entry.value <= 0) return values;
    values.set(entry.date, (values.get(entry.date) ?? 0) + entry.value);
    return values;
  }, new Map<string, number>());

export const createDailyHeatmapValues = (
  entries: readonly CalendarHeatmapEntry[],
  year: number,
): DailyHeatmapValue[] => {
  const values = aggregateEntries(entries);
  const days = eachDayOfInterval({
    start: createLocalDate(year, 0, 1),
    end: createLocalDate(year, 11, 31),
  });
  return days.map((date) => {
    const dateKey = format(date, DATE_FORMAT);
    return { date: dateKey, value: values.get(dateKey) ?? 0 };
  });
};

const quantileThreshold = (values: readonly number[], quantile: number): number => {
  if (!values.length) return 0;
  const index = Math.max(0, Math.ceil(values.length * quantile) - 1);
  return values[index] ?? 0;
};

const createThresholds = (values: readonly DailyHeatmapValue[]): readonly number[] => {
  const positiveValues = values
    .map(({ value }) => value)
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  return INTENSITY_LEVEL_PERCENTILES.map((percentile) =>
    quantileThreshold(positiveValues, percentile),
  );
};

export const resolveCalendarHeatmapLevel = (
  value: number,
  thresholds: readonly number[],
): number => {
  if (value <= 0) return EMPTY_INTENSITY_LEVEL;
  const thresholdIndex = thresholds.findIndex((threshold) => value <= threshold);
  return thresholdIndex < 0 ? ACTIVE_INTENSITY_LEVEL_COUNT : thresholdIndex + 1;
};

export const createCalendarHeatmapSeriesData = (
  values: readonly DailyHeatmapValue[],
  palette: CalendarHeatmapPalette,
  selectedDate: string | undefined,
) => {
  const thresholds = createThresholds(values);
  return values.map(({ date, value }) => {
    const level = resolveCalendarHeatmapLevel(value, thresholds);
    const isSelected = date === selectedDate;
    return {
      value: [date, value, level],
      itemStyle: {
        borderColor: isSelected ? palette.selectedBorder : palette.background,
        borderRadius: 2,
        borderWidth: isSelected ? 2 : 1,
      },
    };
  });
};
