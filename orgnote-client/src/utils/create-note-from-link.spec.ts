import { test, expect } from 'vitest';
import { buildNoteContent, buildNoteFilePath } from './create-note-from-link';

test('buildNoteContent generates PROPERTIES drawer with note id', () => {
  const content = buildNoteContent('5264A16B-73C0-4AD5-8A33-4AA8CA850159', 'Test Title');
  expect(content).toContain(':PROPERTIES:');
  expect(content).toContain(':ID: 5264A16B-73C0-4AD5-8A33-4AA8CA850159');
  expect(content).toContain(':END:');
});

test('buildNoteContent generates TITLE keyword', () => {
  const content = buildNoteContent('abc-123', '"Голая обезьяна" Десмонда Морриса.');
  expect(content).toContain('#+TITLE: "Голая обезьяна" Десмонда Морриса.');
});

test('buildNoteContent places PROPERTIES before TITLE', () => {
  const content = buildNoteContent('abc-123', 'My Note');
  const propsIndex = content.indexOf(':PROPERTIES:');
  const titleIndex = content.indexOf('#+TITLE:');
  expect(propsIndex).toBeLessThan(titleIndex);
});

test('buildNoteContent produces valid org structure', () => {
  const content = buildNoteContent('test-id', 'Test');
  const expected = ':PROPERTIES:\n:ID: test-id\n:END:\n#+TITLE: Test\n';
  expect(content).toBe(expected);
});

test('buildNoteFilePath places file in same directory as current note', () => {
  const path = buildNoteFilePath('New Note', 'notes/current.org');
  expect(path).toMatch(/^notes\//);
  expect(path).toContain('New Note');
  expect(path).toMatch(/\.org$/);
});

test('buildNoteFilePath handles root directory file', () => {
  const path = buildNoteFilePath('Root Note', 'current.org');
  expect(path).toBe('Root Note.org');
});

test('buildNoteFilePath handles nested directory', () => {
  const path = buildNoteFilePath('Deep Note', 'a/b/c/current.org');
  expect(path).toMatch(/^a\/b\/c\//);
  expect(path).toMatch(/\.org$/);
});

test('buildNoteFilePath sanitizes path separators from title', () => {
  const path = buildNoteFilePath('Title/With/Slashes', 'notes/current.org');
  expect(path.split('/').length).toBe(2);
});
