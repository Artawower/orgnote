import { test, expect } from 'vitest';
import { toKebabCase } from './to-kebab-case';

test('converts spaces to hyphens and converts to lowercase', () => {
  expect(toKebabCase('Hello World')).toBe('hello-world');
  expect(toKebabCase('This is a test')).toBe('this-is-a-test');
  expect(toKebabCase('Another Example')).toBe('another-example');
});

test('handles empty string', () => {
  expect(toKebabCase('')).toBe('');
});

test('handles multiple spaces', () => {
  expect(toKebabCase('Multiple   Spaces')).toBe('multiple-spaces');
});

test('handles strings with no spaces', () => {
  expect(toKebabCase('NoSpaces')).toBe('no-spaces');
  expect(toKebabCase('camelCase')).toBe('camel-case');
  expect(toKebabCase('PascalCase')).toBe('pascal-case');
});

test('handles strings with special characters', () => {
  expect(toKebabCase('Special! @Characters#')).toBe('special!-@characters#');
  expect(toKebabCase('CamelCase With123Numbers')).toBe('camel-case-with-123-numbers');
});

test('handles leading and trailing spaces', () => {
  expect(toKebabCase('  Leading and Trailing  ')).toBe('leading-and-trailing');
});

test('handles strings with multiple uppercase letters in sequence', () => {
  expect(toKebabCase('HTMLCSSJavaScript')).toBe('htmlcss-java-script');
  expect(toKebabCase('APITest')).toBe('api-test');
});

test('handles strings with numbers', () => {
  expect(toKebabCase('Version2.0')).toBe('version-2.0');
  expect(toKebabCase('Test123Case')).toBe('test-123-case');
});
