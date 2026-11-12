import { test, expect } from 'vitest';
import { camelCaseToWords } from './camel-case-to-words';

test('converts camelCase to words', () => {
  const input = 'camelCase';
  const output = camelCaseToWords(input);
  expect(output).toBe('Camel Case');
});

test('handles single word input', () => {
  const input = 'word';
  const output = camelCaseToWords(input);
  expect(output).toBe('Word');
});

test('handles multiple uppercase letters', () => {
  const input = 'camelCaseTest';
  const output = camelCaseToWords(input);
  expect(output).toBe('Camel Case Test');
});

test('handles empty string input', () => {
  const input = '';
  const output = camelCaseToWords(input);
  expect(output).toBe('');
});

test('handles already spaced words', () => {
  const input = 'Camel Case Test';
  const output = camelCaseToWords(input);
  expect(output).toBe('Camel Case Test');
});
