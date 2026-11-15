import type { ThemeVariable } from 'orgnote-api';

export const EXTENSION_CATEGORY_ICONS: Record<string, string> = {
  theme: 'sym_o_palette',
  extension: 'sym_o_extension',
  'language pack': 'sym_o_translate',
  other: 'sym_o_widgets',
};

export const EXTENSION_CATEGORY_COLORS: Record<string, ThemeVariable> = {
  theme: 'violet',
  extension: 'blue',
  'language pack': 'cyan',
  other: 'fg-muted',
};

export const DEFAULT_EXTENSION_ICON = 'sym_o_extension';
export const DEFAULT_EXTENSION_COLOR: ThemeVariable = 'fg-muted';
