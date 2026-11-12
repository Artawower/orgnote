import { getCssVar } from 'src/utils/css-utils';

export interface ChartPalette {
  readonly accent: string;
  readonly background: string;
  readonly border: string;
  readonly foreground: string;
  readonly muted: string;
  readonly surface: string;
}

const FALLBACK_BACKGROUND = 'rgb(255, 255, 255)';
const FALLBACK_FOREGROUND = 'rgb(31, 35, 40)';
const FALLBACK_MUTED = 'rgb(89, 99, 110)';
const FALLBACK_ACCENT = 'rgb(130, 80, 223)';
const FALLBACK_SURFACE = 'rgb(246, 248, 250)';
const FALLBACK_BORDER = 'rgb(208, 215, 222)';

const getChartColor = (variable: string, fallback: string): string =>
  getCssVar(variable)?.trim() || fallback;

export const createChartPalette = (): ChartPalette => ({
  accent: getChartColor('--accent', FALLBACK_ACCENT),
  background: getChartColor('--bg', FALLBACK_BACKGROUND),
  border: getChartColor('--border-color', FALLBACK_BORDER),
  foreground: getChartColor('--fg', FALLBACK_FOREGROUND),
  muted: getChartColor('--fg-muted', FALLBACK_MUTED),
  surface: getChartColor('--floating-bg', FALLBACK_SURFACE),
});
