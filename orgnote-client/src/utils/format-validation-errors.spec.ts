import { test, expect } from 'vitest';
import { formatValidationErrors, type ValiError } from './format-validation-errors';

test('returns unknownErrorMessage if error is not an object', () => {
  const result = formatValidationErrors(null);
  expect(result).toEqual(['Unknown error. Please try again later.']);
});

test('returns message if issues are missing', () => {
  const error = {
    message: 'Something went wrong',
    name: 'ValiError',
  } as Partial<ValiError>;
  const result = formatValidationErrors(error);
  expect(result).toEqual(['Something went wrong']);
});

test('returns default message if issues and message are missing', () => {
  const error = {
    name: 'ValiError',
  } as Partial<ValiError>;
  const result = formatValidationErrors(error);
  expect(result).toEqual(['Validation error']);
});

test('formats issues when they exist', () => {
  const error = {
    name: 'ValiError',
    issues: [
      {
        kind: 'schema',
        type: 'union',
        expected: 'string',
        received: 'undefined',
        message: 'Invalid type: Expected string but received undefined',
        path: [
          {
            type: 'object',
            origin: 'value',
            input: { name: 'Test Extension' },
            key: 'category',
          },
        ],
        issues: [
          {
            kind: 'schema',
            type: 'string',
            expected: 'string',
            received: 'undefined',
            message: 'theme',
          },
          {
            kind: 'schema',
            type: 'string',
            expected: 'string',
            received: 'undefined',
            message: 'extension',
          },
        ],
      },
    ],
  } as ValiError;

  const result = formatValidationErrors(error);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatch(/category:/);
  expect(result[0]).toMatch(/Allowed values: theme, extension/);
});

test('handles multiple issues', () => {
  const error = {
    name: 'ValiError',
    issues: [
      {
        kind: 'schema',
        type: 'union',
        expected: 'string',
        received: 'undefined',
        message: 'Invalid type: Expected string but received undefined',
        path: [
          {
            type: 'object',
            origin: 'value',
            input: { key: 'value' },
            key: 'fieldA',
          },
        ],
        issues: [
          {
            kind: 'schema',
            type: 'string',
            expected: 'string',
            received: 'undefined',
            message: 'option1',
          },
        ],
      },
      {
        kind: 'schema',
        type: 'union',
        expected: 'number',
        received: 'undefined',
        message: 'Invalid type: Expected number but received undefined',
        path: [
          {
            type: 'object',
            origin: 'value',
            input: { anotherKey: 'anotherValue' },
            key: 'fieldB',
          },
        ],
        issues: [
          {
            kind: 'schema',
            type: 'number',
            expected: 'number',
            received: 'undefined',
            message: 'option2',
          },
        ],
      },
    ],
  } as ValiError;

  const result = formatValidationErrors(error);
  expect(result).toHaveLength(2);
  expect(result[0]).toMatch(/fieldA:/);
  expect(result[1]).toMatch(/fieldB:/);
});
