import { expect, test } from 'vitest';
import { getHttpHeader, isRecord } from '../http-headers';

test('getHttpHeader reads case-insensitive record header', () => {
  expect(getHttpHeader({ 'Content-Type': 'application/json' }, 'content-type')).toBe(
    'application/json',
  );
});

test('getHttpHeader reads headers through getter', () => {
  const headers = { get: (name: string) => (name === 'content-type' ? 'text/html' : undefined) };

  expect(getHttpHeader(headers, 'content-type')).toBe('text/html');
});

test('getHttpHeader preserves numeric and boolean values', () => {
  expect(getHttpHeader({ retry: 3 }, 'retry')).toBe('3');
  expect(getHttpHeader({ cached: false }, 'cached')).toBe('false');
});

test('getHttpHeader rejects unsupported header containers and values', () => {
  expect(getHttpHeader(null, 'content-type')).toBeUndefined();
  expect(getHttpHeader({ 'content-type': ['text/html'] }, 'content-type')).toBeUndefined();
});

test('isRecord recognizes non-null objects including arrays', () => {
  expect(isRecord({ data: true })).toBe(true);
  expect(isRecord([])).toBe(true);
  expect(isRecord(null)).toBe(false);
});
