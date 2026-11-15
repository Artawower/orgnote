import { afterEach, expect, test, vi } from 'vitest';
import { isOpenableExternalUrl, openExternalUrl } from './open-external-url';

afterEach(() => {
  vi.restoreAllMocks();
});

test('isOpenableExternalUrl reflects the shared external URL policy', () => {
  expect(isOpenableExternalUrl('https://example.com/path')).toBe(true);
  expect(isOpenableExternalUrl('javascript:alert(1)')).toBe(false);
});

test('open-external-url opens safe urls with isolation flags', () => {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

  openExternalUrl('https://example.com/path');

  expect(openSpy).toHaveBeenCalledWith('https://example.com/path', '_blank', 'noopener,noreferrer');
});

test('open-external-url does not open unsafe urls', () => {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

  openExternalUrl('javascript:alert(1)');

  expect(openSpy).not.toHaveBeenCalled();
});
