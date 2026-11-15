export type CalendarHeatmapSeriesValue = readonly [string, number, number];

export interface CalendarHeatmapEntry {
  readonly date: string;
  readonly value: number;
}

export interface CalendarHeatmapLabels {
  readonly ariaLabel: string;
  readonly less: string;
  readonly more: string;
  readonly formatValue?: (value: number) => string;
}

export interface CalendarHeatmapPalette {
  readonly background: string;
  readonly empty: string;
  readonly levels: readonly [string, string, string, string];
  readonly label: string;
  readonly selectedBorder: string;
  readonly tooltipBackground: string;
  readonly tooltipBorder: string;
  readonly tooltipText: string;
}

export type CalendarHeatmapView = 'year' | 'month';

export interface AppCalendarHeatmapChartProps {
  entries: readonly CalendarHeatmapEntry[];
  labels: CalendarHeatmapLabels;
  month: number;
  year: number;
  selectedDate?: string;
  view?: CalendarHeatmapView;
  locale?: string;
}
