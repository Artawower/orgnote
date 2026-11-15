import { expect, test } from 'vitest';
import { resolveContentInsertion } from './content-insertion';

test('resolves a single content insertion', () => {
  expect(resolveContentInsertion('abcdef', 'abcCLOCKdef')).toEqual({ start: 3, length: 5 });
});

test('rejects a content replacement', () => {
  expect(resolveContentInsertion('abcXYZdef', 'abcUVWdef')).toBeNull();
});

test('rejects multiple content insertions', () => {
  expect(resolveContentInsertion('abcdef', 'aXbcdeYf')).toBeNull();
});

test('returns null for unchanged content', () => {
  expect(resolveContentInsertion('abcdef', 'abcdef')).toBeNull();
});
