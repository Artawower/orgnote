import { test, expect } from 'vitest';
import { sortFiles } from './sort-files';
import type { DiskFile } from '../models/file-system';
import type { FileSortConfig } from '../models/file-sort';
import { DEFAULT_FILE_SORT_CONFIG } from '../constants/file-sort-defaults';

const createFile = (overrides: Partial<DiskFile>): DiskFile => ({
  name: 'file.org',
  path: '/file.org',
  type: 'file',
  size: 100,
  mtime: 1000,
  ...overrides,
});

const DIR_ALPHA = createFile({ name: 'alpha', path: '/alpha', type: 'directory', size: 0, mtime: 3000 });
const DIR_BETA = createFile({ name: 'beta', path: '/beta', type: 'directory', size: 0, mtime: 1000 });
const FILE_A = createFile({ name: 'a.org', path: '/a.org', size: 200, mtime: 2000 });
const FILE_B = createFile({ name: 'b.org', path: '/b.org', size: 50, mtime: 5000 });
const FILE_C = createFile({ name: 'c.org', path: '/c.org', size: 300, mtime: 1000 });

test('sortFiles returns empty array for empty input', () => {
  expect(sortFiles([], DEFAULT_FILE_SORT_CONFIG)).toEqual([]);
});

test('sortFiles does not mutate original array', () => {
  const original = [FILE_B, FILE_A];
  const sorted = sortFiles(original, DEFAULT_FILE_SORT_CONFIG);

  expect(sorted).not.toBe(original);
  expect(original[0]).toBe(FILE_B);
});

test('sortFiles sorts by name ascending with directories first by default', () => {
  const files = [FILE_B, DIR_BETA, FILE_A, DIR_ALPHA];
  const sorted = sortFiles(files, DEFAULT_FILE_SORT_CONFIG);

  expect(sorted.map((f) => f.name)).toEqual(['alpha', 'beta', 'a.org', 'b.org']);
});

test('sortFiles sorts by name descending with directories first', () => {
  const config: FileSortConfig = { field: 'name', direction: 'desc', directoriesFirst: true };
  const files = [FILE_A, DIR_ALPHA, FILE_B, DIR_BETA];
  const sorted = sortFiles(files, config);

  expect(sorted.map((f) => f.name)).toEqual(['beta', 'alpha', 'b.org', 'a.org']);
});

test('sortFiles sorts by name ascending without directories first', () => {
  const config: FileSortConfig = { field: 'name', direction: 'asc', directoriesFirst: false };
  const files = [FILE_B, DIR_BETA, FILE_A, DIR_ALPHA];
  const sorted = sortFiles(files, config);

  expect(sorted.map((f) => f.name)).toEqual(['a.org', 'alpha', 'b.org', 'beta']);
});

test('sortFiles sorts by mtime ascending', () => {
  const config: FileSortConfig = { field: 'mtime', direction: 'asc', directoriesFirst: false };
  const files = [FILE_B, FILE_A, FILE_C];
  const sorted = sortFiles(files, config);

  expect(sorted.map((f) => f.name)).toEqual(['c.org', 'a.org', 'b.org']);
});

test('sortFiles sorts by mtime descending with directories first', () => {
  const config: FileSortConfig = { field: 'mtime', direction: 'desc', directoriesFirst: true };
  const files = [FILE_A, DIR_BETA, FILE_B, DIR_ALPHA];
  const sorted = sortFiles(files, config);

  expect(sorted.map((f) => f.name)).toEqual(['alpha', 'beta', 'b.org', 'a.org']);
});

test('sortFiles sorts by size ascending', () => {
  const config: FileSortConfig = { field: 'size', direction: 'asc', directoriesFirst: false };
  const files = [FILE_C, FILE_A, FILE_B];
  const sorted = sortFiles(files, config);

  expect(sorted.map((f) => f.name)).toEqual(['b.org', 'a.org', 'c.org']);
});

test('sortFiles sorts by size descending', () => {
  const config: FileSortConfig = { field: 'size', direction: 'desc', directoriesFirst: false };
  const files = [FILE_A, FILE_C, FILE_B];
  const sorted = sortFiles(files, config);

  expect(sorted.map((f) => f.name)).toEqual(['c.org', 'a.org', 'b.org']);
});

test('sortFiles handles single file', () => {
  const sorted = sortFiles([FILE_A], DEFAULT_FILE_SORT_CONFIG);

  expect(sorted).toEqual([FILE_A]);
});

test('sortFiles handles all directories', () => {
  const sorted = sortFiles([DIR_BETA, DIR_ALPHA], DEFAULT_FILE_SORT_CONFIG);

  expect(sorted.map((f) => f.name)).toEqual(['alpha', 'beta']);
});

test('sortFiles handles all files (no directories)', () => {
  const sorted = sortFiles([FILE_C, FILE_A, FILE_B], DEFAULT_FILE_SORT_CONFIG);

  expect(sorted.map((f) => f.name)).toEqual(['a.org', 'b.org', 'c.org']);
});

test('sortFiles name comparison is case-insensitive', () => {
  const upper = createFile({ name: 'Zebra.org', path: '/Zebra.org' });
  const lower = createFile({ name: 'apple.org', path: '/apple.org' });
  const sorted = sortFiles([upper, lower], DEFAULT_FILE_SORT_CONFIG);

  expect(sorted.map((f) => f.name)).toEqual(['apple.org', 'Zebra.org']);
});
