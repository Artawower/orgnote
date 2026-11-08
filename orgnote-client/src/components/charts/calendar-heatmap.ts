import type { HeatmapSeriesOption } from 'echarts/charts';
import type {
  AriaComponentOption,
  CalendarComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from 'echarts/components';
import type { ComposeOption } from 'echarts/core';
import {
  createCalendarHeatmapSeriesData,
  createDailyHeatmapValues,
} from './calendar-heatmap-data';
import { createCalendarHeatmapTooltip } from './calendar-heatmap-tooltip';
import type {
  CalendarHeatmapEntry,
  CalendarHeatmapLabels,
  CalendarHeatmapPalette,
  CalendarHeatmapView,
} from './calendar-heatmap-types';

type CalendarHeatmapOption = ComposeOption<
  | AriaComponentOption
  | CalendarComponentOption
  | HeatmapSeriesOption
  | TooltipComponentOption
  | VisualMapComponentOption
>;

interface CalendarHeatmapOptionInput {
  readonly entries: readonly CalendarHeatmapEntry[];
  readonly labels: CalendarHeatmapLabels;
  readonly month: number;
  readonly view: CalendarHeatmapView;
  readonly locale: string;
  readonly palette: CalendarHeatmapPalette;
  readonly selectedDate?: string;
  readonly year: number;
}

const FIRST_DAY_OF_WEEK = 1;
const YEAR_CELL_SIZE = 13;
const MONTH_CELL_SIZE = 15;

const createLocalDate = (year: number, month: number, day: number): Date => {
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
};

const createDateLabels = (locale: string) => {
  const weekdays = Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(createLocalDate(2024, 0, 7 + day)),
  );
  const months = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(createLocalDate(2024, month, 1)),
  );
  return { months, weekdays };
};

const createBaseCalendar = (
  range: string,
  palette: CalendarHeatmapPalette,
  dateLabels: ReturnType<typeof createDateLabels>,
): CalendarComponentOption => ({
  range,
  cellSize: [YEAR_CELL_SIZE, YEAR_CELL_SIZE],
  splitLine: { show: false },
  itemStyle: { color: palette.empty, borderColor: palette.background, borderWidth: 1 },
  dayLabel: {
    color: palette.label,
    firstDay: FIRST_DAY_OF_WEEK,
    fontSize: 10,
    margin: 8,
    nameMap: dateLabels.weekdays,
  },
  monthLabel: { color: palette.label, fontSize: 10, nameMap: dateLabels.months },
  yearLabel: { show: false },
});

const createYearCalendars = (
  year: number,
  palette: CalendarHeatmapPalette,
  dateLabels: ReturnType<typeof createDateLabels>,
): CalendarComponentOption[] => [
  {
    ...createBaseCalendar(String(year), palette, dateLabels),
    left: 'center',
    top: 24,
  },
];

const createMonthCalendar = (
  year: number,
  month: number,
  palette: CalendarHeatmapPalette,
  dateLabels: ReturnType<typeof createDateLabels>,
): CalendarComponentOption[] => [
  {
    ...createBaseCalendar(`${year}-${String(month).padStart(2, '0')}`, palette, dateLabels),
    cellSize: [MONTH_CELL_SIZE, MONTH_CELL_SIZE],
    left: 'center',
    monthLabel: {
      color: palette.label,
      fontSize: 11,
      margin: 10,
      nameMap: dateLabels.months,
      position: 'start',
    },
    top: 28,
  },
];

const createVisualMap = (palette: CalendarHeatmapPalette): VisualMapComponentOption => ({
  type: 'piecewise',
  dimension: 2,
  pieces: [palette.empty, ...palette.levels].map((color, value) => ({ color, value })),
  show: false,
});

const createSeries = (
  data: ReturnType<typeof createCalendarHeatmapSeriesData>,
  view: CalendarHeatmapView,
  month: number,
): HeatmapSeriesOption[] => {
  if (view === 'year') {
    return [{ type: 'heatmap', coordinateSystem: 'calendar', data, emphasis: { disabled: true } }];
  }
  const monthKey = String(month).padStart(2, '0');
  return [
    {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: data.filter(
        ({ value }) => typeof value[0] === 'string' && value[0].slice(5, 7) === monthKey,
      ),
      emphasis: { disabled: true },
    },
  ];
};

export const createCalendarHeatmapOption = (
  input: CalendarHeatmapOptionInput,
): CalendarHeatmapOption => {
  const values = createDailyHeatmapValues(input.entries, input.year);
  const data = createCalendarHeatmapSeriesData(values, input.palette, input.selectedDate);
  const dateLabels = createDateLabels(input.locale);
  const calendar =
    input.view === 'year'
      ? createYearCalendars(input.year, input.palette, dateLabels)
      : createMonthCalendar(input.year, input.month, input.palette, dateLabels);
  return {
    animation: false,
    aria: { description: input.labels.ariaLabel, enabled: true },
    calendar,
    series: createSeries(data, input.view, input.month),
    tooltip: createCalendarHeatmapTooltip(input.labels, input.locale, input.palette),
    visualMap: createVisualMap(input.palette),
  };
};
