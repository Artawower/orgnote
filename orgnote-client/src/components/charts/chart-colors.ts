import { color } from 'echarts/core';

export const mixChartColors = (
  foreground: string,
  background: string,
  weight: number,
): string => color.lerp(weight, [background, foreground]);
