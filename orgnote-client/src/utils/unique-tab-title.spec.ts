import { expect, test } from 'vitest';
import { getUniqueTabTitle } from './unique-tab-title';

test('should return base title when no existing titles', () => {
  const result = getUniqueTabTitle([]);
  expect(result).toBe('Untitled');
});

test('should return base title when not in existing titles', () => {
  const result = getUniqueTabTitle(['Other Tab', 'Another Tab']);
  expect(result).toBe('Untitled');
});

test('should return numbered title when base title exists', () => {
  const result = getUniqueTabTitle(['Untitled']);
  expect(result).toBe('Untitled 2');
});

test('should return next number after existing numbered titles', () => {
  const result = getUniqueTabTitle(['Untitled', 'Untitled 2']);
  expect(result).toBe('Untitled 3');
});

test('should find next number after max existing number', () => {
  const result = getUniqueTabTitle(['Untitled', 'Untitled 5', 'Untitled 2']);
  expect(result).toBe('Untitled 6');
});

test('should work with custom title prefix', () => {
  const result = getUniqueTabTitle(['Custom'], 'Custom');
  expect(result).toBe('Custom 2');
});

test('should work with custom prefix and existing numbered titles', () => {
  const result = getUniqueTabTitle(['Custom', 'Custom 3', 'Custom 1'], 'Custom');
  expect(result).toBe('Custom 4');
});

test('should ignore malformed numbered titles', () => {
  const result = getUniqueTabTitle(['Untitled', 'Untitled abc', 'Untitled 2.5']);
  expect(result).toBe('Untitled 2');
});

test('should handle mixed valid and invalid numbered titles', () => {
  const result = getUniqueTabTitle(['Untitled', 'Untitled 2', 'Untitled xyz', 'Untitled 4']);
  expect(result).toBe('Untitled 5');
});
