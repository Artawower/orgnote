import { CustomChart, HeatmapChart } from 'echarts/charts';
import {
  AriaComponent,
  CalendarComponent,
  GridComponent,
  TooltipComponent,
  VisualMapPiecewiseComponent,
} from 'echarts/components';
import { init, use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

use([
  AriaComponent,
  CalendarComponent,
  CustomChart,
  GridComponent,
  HeatmapChart,
  SVGRenderer,
  TooltipComponent,
  VisualMapPiecewiseComponent,
]);

export { init };
export type { ECElementEvent, EChartsCoreOption, EChartsType } from 'echarts/core';
