import { expect, test } from 'vitest';
import { withRoot } from '../with-root';

test('adds root to path without leading slash', () => {
  expect(withRoot('test')).toBe('/test');
});

test('leaves path unchanged if starts with slash', () => {
  expect(withRoot('/test')).toBe('/test');
});

test('handles empty string', () => {
  expect(withRoot('')).toBe('/');
});

test('handles multiple leading slashes', () => {
  expect(withRoot('//test')).toBe('//test');
});

test('handles path with trailing slash', () => {
  expect(withRoot('test/')).toBe('/test/');
});

test('handles root path', () => {
  expect(withRoot('/')).toBe('/');
});
