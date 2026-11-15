import { expect, test } from 'vitest';
import { extractOrgTitleFromPath } from './extract-org-title-from-path';

test('extractOrgTitleFromPath strips .org extension', () => {
  const result = extractOrgTitleFromPath('/notes/daily-note.org');
  expect(result).toBe('daily-note');
});

test('extractOrgTitleFromPath strips .org.gpg extension', () => {
  const result = extractOrgTitleFromPath('/notes/secure-note.org.gpg');
  expect(result).toBe('secure-note');
});

test('extractOrgTitleFromPath keeps non-org extension unchanged', () => {
  const result = extractOrgTitleFromPath('/notes/image.png');
  expect(result).toBe('image.png');
});

test('extractOrgTitleFromPath returns empty string for empty path', () => {
  const result = extractOrgTitleFromPath('');
  expect(result).toBe('');
});
