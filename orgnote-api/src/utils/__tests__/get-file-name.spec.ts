import {
  getFileName,
  getFileNameWithoutExtension,
  getFileExtension,
} from '../get-file-name';
import { test, expect } from 'vitest';

test('Should return file name from path', () => {
  expect(getFileName('/some/path/foo.org')).toBe('foo.org');
});

test('Should return file name from file name', () => {
  expect(getFileName('foo.org')).toBe('foo.org');
});

test('Should return file name without extension', () => {
  expect(getFileNameWithoutExtension('foo.org')).toBe('foo');
});

test('Should return file name without extension from path', () => {
  expect(getFileNameWithoutExtension('/some/path/foo.org')).toBe('foo');
});

test('Should return extension from file name', () => {
  expect(getFileExtension('foo.org')).toBe('org');
});

test('Should return extension from path', () => {
  expect(getFileExtension('/some/path/foo.org')).toBe('org');
});

test('Should return empty extension when file has no extension', () => {
  expect(getFileExtension('/some/path/README')).toBe('');
});
