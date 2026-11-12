import { ThemeVariable } from './theme-variables';

export type ThemeColors = {
  [key in ThemeVariable]?: string;
};

export type GetCssVar = (varName: string) => string | undefined;

export type GetCssTheme = (variableNames: string[]) => {
  [key in ThemeVariable]?: string;
};

export type GetNumericCssVar = (varName: string) => number | undefined;

export type GetCssProperty = (
  element: Element,
  propertyName: string
) => string | undefined;

export type GetCssNumericProperty = (
  element: Element,
  propertyName: string
) => number | undefined;

export type ApplyCSSVariables<T extends string> = (variables: {
  [key in T]?: string | number;
}) => void;

export type ResetCSSVariables<T extends string> = (variables: T[]) => void;

export type ApplyScopedStyles = (scopeName: string, styles: string) => void;

export type RemoveScopedStyles = (scopeName: string) => void;
