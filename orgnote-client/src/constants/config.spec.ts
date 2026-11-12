import { test, expect } from 'vitest';
import { DEFAULT_CONFIG } from './config';

test('defaultCompletionLimit is at most 50 for reasonable first-open performance', () => {
  expect(DEFAULT_CONFIG.completion.defaultCompletionLimit).toBeLessThanOrEqual(50);
});

test('sidebar does not follow active buffers by default', () => {
  expect(DEFAULT_CONFIG.ui.followActiveBufferInSidebar).toBe(false);
});

test('buffer opening allows duplicate views by default', () => {
  expect(DEFAULT_CONFIG.ui.reuseExistingBuffers).toBe(false);
});
