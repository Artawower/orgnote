import { expect, test } from 'vitest';
import type { DiskFile } from 'orgnote-api';
import { getNextBrokenConfigIndex } from './get-next-broken-config-index';

const createDiskFile = (name: string): DiskFile => ({
  name,
  path: `/.orgnote/${name}`,
  type: 'file',
  size: 0,
  mtime: 0,
});

test('getNextBrokenConfigIndex returns 1 when no broken files exist', () => {
  const files = [createDiskFile('config.toml'), createDiskFile('extensions.toml')];

  expect(getNextBrokenConfigIndex(files)).toBe(1);
});

test('getNextBrokenConfigIndex returns max index + 1', () => {
  const files = [
    createDiskFile('config-broken-1.toml'),
    createDiskFile('config-broken-3.toml'),
    createDiskFile('config-broken-2.toml'),
  ];

  expect(getNextBrokenConfigIndex(files)).toBe(4);
});

test('getNextBrokenConfigIndex ignores unrelated file names', () => {
  const files = [
    createDiskFile('config-broken-10.toml'),
    createDiskFile('config-broken-.toml'),
    createDiskFile('config-broken-0.toml'),
    createDiskFile('config-broken-1.txt'),
    createDiskFile('config-broken-2.toml.bak'),
  ];

  expect(getNextBrokenConfigIndex(files)).toBe(11);
});

