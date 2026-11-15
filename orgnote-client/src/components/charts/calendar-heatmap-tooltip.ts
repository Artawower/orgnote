import type { TooltipComponentOption } from 'echarts/components';
import { format } from 'echarts/core';
import type {
  CalendarHeatmapLabels,
  CalendarHeatmapPalette,
  CalendarHeatmapSeriesValue,
} from './calendar-heatmap-types';

type TooltipFormatter = Exclude<TooltipComponentOption['formatter'], string | undefined>;
type TooltipItemParams = Exclude<Parameters<TooltipFormatter>[0], readonly unknown[]>;

export const formatCalendarHeatmapTooltip = (
  [dateKey, value]: CalendarHeatmapSeriesValue,
  labels: CalendarHeatmapLabels,
  locale: string,
): string => {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(`${dateKey}T00:00:00`),
  );
  const formattedValue = value > 0 ? labels.formatValue?.(value).trim() : undefined;
  return format.encodeHTML(formattedValue ? `${date}: ${formattedValue}` : date);
};

export const createCalendarHeatmapTooltip = (
  labels: CalendarHeatmapLabels,
  locale: string,
  palette: CalendarHeatmapPalette,
): TooltipComponentOption => ({
  backgroundColor: palette.tooltipBackground,
  borderColor: palette.tooltipBorder,
  confine: true,
  renderMode: 'html',
  textStyle: { color: palette.tooltipText },
  trigger: 'item',
  formatter: (params) =>
    formatCalendarHeatmapTooltip(
      (params as TooltipItemParams).value as CalendarHeatmapSeriesValue,
      labels,
      locale,
    ),
});
