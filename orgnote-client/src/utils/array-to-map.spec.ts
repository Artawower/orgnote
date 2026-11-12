import { expect, test } from 'vitest';
import { arrayToMap } from './array-to-map';

test('arrayToMap converts array with id field to map', () => {
  const array = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ];

  const result = arrayToMap(array);

  expect(result).toEqual({
    '1': { id: '1', name: 'Alice' },
    '2': { id: '2', name: 'Bob' },
  });
});

test('arrayToMap uses custom key when provided', () => {
  const array = [
    { userId: 'u1', name: 'Alice' },
    { userId: 'u2', name: 'Bob' },
  ];

  const result = arrayToMap(array, 'userId');

  expect(result).toEqual({
    u1: { userId: 'u1', name: 'Alice' },
    u2: { userId: 'u2', name: 'Bob' },
  });
});

test('arrayToMap skips items with undefined key', () => {
  const array = [
    { id: '1', name: 'Alice' },
    { id: undefined, name: 'Ghost' },
    { id: '2', name: 'Bob' },
  ];

  const result = arrayToMap(array as { id: string; name: string }[]);

  expect(result).toEqual({
    '1': { id: '1', name: 'Alice' },
    '2': { id: '2', name: 'Bob' },
  });
});

test('arrayToMap skips items with null key', () => {
  const array = [
    { id: '1', name: 'Alice' },
    { id: null, name: 'Ghost' },
    { id: '2', name: 'Bob' },
  ];

  const result = arrayToMap(array as { id: string; name: string }[]);

  expect(result).toEqual({
    '1': { id: '1', name: 'Alice' },
    '2': { id: '2', name: 'Bob' },
  });
});

test('arrayToMap handles empty array', () => {
  const array: { id: string; name: string }[] = [];

  const result = arrayToMap(array);

  expect(result).toEqual({});
});

test('arrayToMap overwrites duplicates with last item', () => {
  const array = [
    { id: '1', name: 'First' },
    { id: '1', name: 'Second' },
  ];

  const result = arrayToMap(array);

  expect(result).toEqual({
    '1': { id: '1', name: 'Second' },
  });
});

test('arrayToMap handles numeric keys by converting to string', () => {
  const array = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  const result = arrayToMap(array);

  expect(result).toEqual({
    '1': { id: 1, name: 'Alice' },
    '2': { id: 2, name: 'Bob' },
  });
});

test('arrayToMap handles single item array', () => {
  const array = [{ id: 'only', value: 42 }];

  const result = arrayToMap(array);

  expect(result).toEqual({
    only: { id: 'only', value: 42 },
  });
});
