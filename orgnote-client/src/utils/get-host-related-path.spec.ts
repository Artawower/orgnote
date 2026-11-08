import { test, expect, afterEach } from 'vitest';
import { getHostRelatedPath } from './get-host-related-path';

const originalLocation = window.location;

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
});

const mockLocation = (origin: string) => {
  Object.defineProperty(window, 'location', {
    value: { origin },
    writable: true,
    configurable: true,
  });
};

test('getHostRelatedPath constructs correct URL with path', () => {
  mockLocation('http://localhost:3000');

  const result = getHostRelatedPath('notes/today');
  expect(result).toBe('http://localhost:3000/notes/today');
});

test('getHostRelatedPath strips leading slashes from path', () => {
  mockLocation('https://example.com');

  const result = getHostRelatedPath('/notes/today');
  expect(result).toBe('https://example.com/notes/today');
});

test('getHostRelatedPath handles path with query string', () => {
  mockLocation('https://example.com');

  const result = getHostRelatedPath('?foo=bar');
  expect(result).toBe('https://example.com/?foo=bar');
});

test('getHostRelatedPath handles empty path', () => {
  mockLocation('https://example.com');

  const result = getHostRelatedPath('');
  expect(result).toBe('https://example.com/');
});

test('getHostRelatedPath handles multiple leading slashes', () => {
  mockLocation('https://example.com');

  const result = getHostRelatedPath('///dashboard');
  expect(result).toBe('https://example.com/dashboard');
});
