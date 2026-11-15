import { afterEach, expect, test } from 'vitest';
import { mixChartColors } from './chart-colors';
import { createChartPalette } from './chart-palette';

afterEach(() => {
  document.body.style.removeProperty('--floating-bg');
});

test('mixChartColors applies the requested foreground weight', () => {
  expect(mixChartColors('rgb(100, 150, 200)', 'rgb(200, 200, 200)', 0.5)).toBe(
    'rgba(150,175,200,1)',
  );
});

test('createChartPalette uses the shared floating surface color', () => {
  document.body.style.setProperty('--floating-bg', 'rgb(250, 251, 252)');
  expect(createChartPalette().surface).toBe('rgb(250, 251, 252)');
});
