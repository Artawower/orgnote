import type {
  GetCssVar,
  GetCssTheme,
  GetNumericCssVar,
  GetCssProperty,
  GetCssNumericProperty,
  ApplyCSSVariables,
  ResetCSSVariables,
  ApplyScopedStyles,
  RemoveScopedStyles,
  ThemeVariable,
} from 'orgnote-api';

import { toKebabCase } from './to-kebab-case';
import { clientOnly } from './platform-specific';

export const normalizeCssVariable = (variable: string) => {
  return variable.startsWith('--') ? variable : `--${variable}`;
};

export const getCssVariableName = (variable: string): string => {
  if (!variable) return variable;
  return `var(${normalizeCssVariable(variable)})`;
};

export const getCssVar: GetCssVar = clientOnly((varName: string) => {
  const normalizedName = normalizeCssVariable(varName);
  return getComputedStyle(document.body).getPropertyValue(normalizedName);
}, '');

export const getCssTheme: GetCssTheme = (variableNames) =>
  variableNames.reduce(
    (acc, cur) => {
      const cssValue = getCssVar(toKebabCase(cur));
      if (cssValue) acc[cur as ThemeVariable] = cssValue;
      return acc;
    },
    {} as { [key in ThemeVariable]?: string },
  );

export const getNumericCssVar: GetNumericCssVar = (varName) => {
  const value = getCssVar(normalizeCssVariable(varName));
  if (!value) return;
  return +value.replace(/[^\d.]/g, '');
};

export const getCssProperty: GetCssProperty = clientOnly(
  (element: Element, propertyName: string) => {
    const defaultView = document.defaultView;
    if (!defaultView) return;
    return defaultView.getComputedStyle(element, null).getPropertyValue(propertyName);
  },
  undefined,
);

export const getCssNumericProperty: GetCssNumericProperty = (element, propertyName) => {
  const value = getCssProperty(element, propertyName);
  if (!value) return;
  return +value.replace(/[^\d.]/g, '');
};

export const applyCSSVariables: ApplyCSSVariables<string> = clientOnly(
  (variables: { [key in string]?: string | number }) => {
    const body = document.querySelector('body') as HTMLElement;
    Object.keys(variables).forEach((k) => {
      const value = variables[k];
      if (value === undefined) return;
      body.style.setProperty(`--${toKebabCase(k)}`, `${value}`);
    });
  },
  undefined,
);

export const resetCSSVariables: ResetCSSVariables<string> = clientOnly((variables: string[]) => {
  variables.forEach((k) => {
    document.body.style.removeProperty(`--${toKebabCase(k)}`);
  });
}, undefined);

export const removeScopedStyles: RemoveScopedStyles = clientOnly((scopeName: string) => {
  document.getElementById(scopeName)?.remove();
}, undefined);

export const applyScopedStyles: ApplyScopedStyles = clientOnly(
  (scopeName: string, styles: string) => {
    removeScopedStyles(scopeName);
    const styleElement = document.createElement('style');
    styleElement.setAttribute('id', scopeName);
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  },
  undefined,
);
