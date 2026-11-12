import { test, expect } from 'vitest';
import { createTitleExtractor } from './extract-title';

const extractTitle = createTitleExtractor('Untitled');

test('createTitleExtractor strips extension from filename', () => {
  expect(extractTitle('/notes/projects/my-note.org')).toBe('my-note');
});

test('createTitleExtractor handles single-segment path', () => {
  expect(extractTitle('readme.org')).toBe('readme');
});

test('createTitleExtractor handles multiple extensions', () => {
  expect(extractTitle('/archive/notes.backup.org')).toBe('notes.backup');
});

test('createTitleExtractor returns fallback for trailing slash', () => {
  expect(extractTitle('/path/to/')).toBe('Untitled');
});

test('createTitleExtractor returns fallback for empty string', () => {
  expect(extractTitle('')).toBe('Untitled');
});

test('createTitleExtractor returns fallback for root path', () => {
  expect(extractTitle('/')).toBe('Untitled');
});

test('createTitleExtractor uses custom fallback', () => {
  const extractEmbedded = createTitleExtractor('Embedded note');
  expect(extractEmbedded('/')).toBe('Embedded note');
});

test('createTitleExtractor handles filename without extension', () => {
  expect(extractTitle('/notes/README')).toBe('README');
});

test('createTitleExtractor returns fallback for hidden files', () => {
  expect(extractTitle('/notes/.gitignore')).toBe('Untitled');
});

test('createTitleExtractor handles deeply nested path', () => {
  expect(extractTitle('/a/b/c/d/deep-note.org')).toBe('deep-note');
});
