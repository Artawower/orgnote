import { test, expect } from 'vitest';
import { omitSchemeKeys, pickSchemeKeys, valibotScheme } from './valibot-scheme';

const baseScheme = valibotScheme({
  type: 'object',
  entries: {
    name: { type: 'string' },
    age: { type: 'number' },
    isActive: { type: 'boolean' },
    role: { type: 'string' },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const schemeWithEntries = baseScheme as any;

test('pickSchemeKeys > should pick only specified keys', () => {
  const result = pickSchemeKeys(schemeWithEntries, ['name', 'age']);

  expect(Object.keys(result.entries || {})).toHaveLength(2);
  expect(result.entries).toHaveProperty('name');
  expect(result.entries).toHaveProperty('age');
  expect(result.entries).not.toHaveProperty('isActive');
  expect(result.entries).not.toHaveProperty('role');
});

test('pickSchemeKeys > should return empty entries if no keys are picked', () => {
  const result = pickSchemeKeys(schemeWithEntries, []);

  expect(Object.keys(result.entries || {})).toHaveLength(0);
});

test('pickSchemeKeys > should handle non-existent keys gracefully', () => {
  const result = pickSchemeKeys(schemeWithEntries, ['name', 'nonExistent']);

  expect(Object.keys(result.entries || {})).toHaveLength(1);
  expect(result.entries).toHaveProperty('name');
});

test('omitSchemeKeys > should omit specified keys', () => {
  const result = omitSchemeKeys(schemeWithEntries, ['isActive', 'role']);

  expect(Object.keys(result.entries || {})).toHaveLength(2);
  expect(result.entries).toHaveProperty('name');
  expect(result.entries).toHaveProperty('age');
  expect(result.entries).not.toHaveProperty('isActive');
  expect(result.entries).not.toHaveProperty('role');
});

test('omitSchemeKeys > should return original entries if no keys are omitted', () => {
  const result = omitSchemeKeys(schemeWithEntries, []);

  expect(Object.keys(result.entries || {})).toEqual(Object.keys(baseScheme.entries || {}));
});

test('omitSchemeKeys > should return empty entries if all keys are omitted', () => {
  const result = omitSchemeKeys(schemeWithEntries, ['name', 'age', 'isActive', 'role']);

  expect(Object.keys(result.entries || {})).toHaveLength(0);
});

test('pickSchemeKeys > should return empty entries if all specified keys do not exist', () => {
  const result = pickSchemeKeys(schemeWithEntries, ['nonExistent1', 'nonExistent2']);

  expect(Object.keys(result.entries || {})).toHaveLength(0);
});

test('omitSchemeKeys > should ignore non-existent keys and return original entries', () => {
  const result = omitSchemeKeys(schemeWithEntries, ['nonExistent1', 'nonExistent2']);

  expect(Object.keys(result.entries || {})).toEqual(Object.keys(baseScheme.entries || {}));
});

test('omitSchemeKeys > should handle mixed existing and non-existent keys', () => {
  const result = omitSchemeKeys(schemeWithEntries, ['name', 'nonExistent']);

  expect(Object.keys(result.entries || {})).toHaveLength(3);
  expect(result.entries).not.toHaveProperty('name');
  expect(result.entries).toHaveProperty('age');
  expect(result.entries).toHaveProperty('isActive');
  expect(result.entries).toHaveProperty('role');
});
