import { expect, test } from 'vitest';
import { isMergeableFile } from '../types';

test('accepts .org files within size limit', () => {
  expect(isMergeableFile('notes/todo.org', 1024)).toBe(true);
});

test('accepts .md files within size limit', () => {
  expect(isMergeableFile('readme.md', 2048)).toBe(true);
});

test('accepts OrgNote config TOML within size limit', () => {
  expect(isMergeableFile('/.orgnote/config.toml', 2048)).toBe(true);
});

test('rejects non-text extensions', () => {
  expect(isMergeableFile('photo.png', 1024)).toBe(false);
  expect(isMergeableFile('data.json', 500)).toBe(false);
  expect(isMergeableFile('archive.zip', 100)).toBe(false);
});

test('rejects files exceeding 512KB', () => {
  const overLimit = 512 * 1024 + 1;
  expect(isMergeableFile('big.org', overLimit)).toBe(false);
});

test('accepts files exactly at 512KB boundary', () => {
  const exactLimit = 512 * 1024;
  expect(isMergeableFile('exact.org', exactLimit)).toBe(true);
});

test('handles files without extension', () => {
  expect(isMergeableFile('README', 100)).toBe(false);
});

test('handles dotfiles', () => {
  expect(isMergeableFile('.gitignore', 100)).toBe(false);
});
