import { test, expect } from 'vitest';
import { splitPath } from 'src/utils';

test('Should correctly split various paths with different formats', () => {
  const pathExpected = [
    ['/some/long/path/file.txt', ['some', 'long', 'path', 'file.txt']],
    ['/a/b/c/d.txt', ['a', 'b', 'c', 'd.txt']],
    ['/singlefile.txt', ['singlefile.txt']],
    ['/folder/', ['folder']],
    ['relative/path/to/file', ['relative', 'path', 'to', 'file']],
    ['/leading/slash/', ['leading', 'slash']],
    ['no/leading/slash', ['no', 'leading', 'slash']],
    ['/trailing/slash/', ['trailing', 'slash']],
  ] as const;

  pathExpected.forEach(([path, expected]) => {
    expect(splitPath(path)).toEqual(expected);
  });
});

test('Should handle edge cases like empty paths or root', () => {
  const pathExpected = [
    ['', []],
    ['/', []],
    ['//', []],
  ] as const;

  pathExpected.forEach(([path, expected]) => {
    expect(splitPath(path)).toEqual(expected);
  });
});
