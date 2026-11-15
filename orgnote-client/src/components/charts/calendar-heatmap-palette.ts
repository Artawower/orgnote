import { mixChartColors } from './chart-colors';
import { createChartPalette } from './chart-palette';
import type { CalendarHeatmapPalette } from './calendar-heatmap-types';

export const createCalendarHeatmapPalette = (): CalendarHeatmapPalette => {
  const palette = createChartPalette();
  return {
    background: palette.background,
    empty: mixChartColors(palette.foreground, palette.background, 0.08),
    levels: [
      mixChartColors(palette.accent, palette.background, 0.25),
      mixChartColors(palette.accent, palette.background, 0.45),
      mixChartColors(palette.accent, palette.background, 0.7),
      palette.accent,
    ],
    label: palette.muted,
    selectedBorder: palette.foreground,
    tooltipBackground: palette.surface,
    tooltipBorder: palette.border,
    tooltipText: palette.foreground,
  };
};
