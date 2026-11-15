import type { StyleVariant, ThemeVariable } from 'orgnote-api';

export const CARD_TYPE_TO_BACKGROUND: { [key in StyleVariant]?: ThemeVariable } = {
  plain: 'bg-elevated',
  info: 'blue',
  warning: 'yellow',
  danger: 'red',
  active: 'accent',
};
