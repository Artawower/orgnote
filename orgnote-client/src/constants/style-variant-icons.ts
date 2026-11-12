import type { StyleVariant } from 'orgnote-api';

export const STYLE_VARIANT_ICONS: Partial<Record<StyleVariant, string>> = {
  clear: 'info',
  plain: 'info',
  info: 'info',
  warning: 'warning',
  danger: 'error',
  active: 'check_circle',
};
