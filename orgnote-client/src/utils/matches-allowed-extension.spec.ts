import { expect, test } from 'vitest';
import { matchesAllowedExtension } from './matches-allowed-extension';

test('matchesAllowedExtension allows everything when no extensions provided', () => {
  expect(matchesAllowedExtension('note.txt')).toBe(true);
  expect(matchesAllowedExtension('note.txt', [])).toBe(true);
});

test('matchesAllowedExtension returns true when path ends with an allowed extension', () => {
  expect(matchesAllowedExtension('template.org.tmpl', ['.org.tmpl'])).toBe(true);
});

test('matchesAllowedExtension returns false when no extension matches', () => {
  expect(matchesAllowedExtension('note.txt', ['.org.tmpl'])).toBe(false);
});