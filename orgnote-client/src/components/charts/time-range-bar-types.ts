export interface TimeRangeBarEntry {
  readonly label: string;
  readonly startTime: number;
  readonly endTime: number;
}

export interface TimeRangeBarRange {
  readonly startTime: number;
  readonly endTime: number;
}

export interface TimeRangeBarLabels {
  readonly ariaLabel: string;
  readonly formatDuration: (durationMs: number) => string;
  readonly formatTime?: (timestamp: number) => string;
}

export interface AppTimeRangeBarChartProps {
  entries: readonly TimeRangeBarEntry[];
  labels: TimeRangeBarLabels;
  range: TimeRangeBarRange;
  locale?: string;
}
