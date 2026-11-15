import { expect, test } from 'vitest';
import { toOpenableExternalUrl } from './external-url-policy';

test('toOpenableExternalUrl accepts HTTP and HTTPS URLs', () => {
  expect(toOpenableExternalUrl('https://example.com/path')?.toString()).toBe(
    'https://example.com/path',
  );
  expect(toOpenableExternalUrl('http://example.com/path')?.toString()).toBe(
    'http://example.com/path',
  );
});

test('toOpenableExternalUrl rejects relative, unsafe, and malformed URLs', () => {
  expect(toOpenableExternalUrl('/settings')).toBeUndefined();
  expect(toOpenableExternalUrl('javascript:alert(1)')).toBeUndefined();
  expect(toOpenableExternalUrl('file:///tmp/note.org')).toBeUndefined();
  expect(toOpenableExternalUrl('not a url')).toBeUndefined();
});

test('toOpenableExternalUrl trims URLs before parsing', () => {
  expect(toOpenableExternalUrl('  https://example.com/path  ')?.toString()).toBe(
    'https://example.com/path',
  );
});
