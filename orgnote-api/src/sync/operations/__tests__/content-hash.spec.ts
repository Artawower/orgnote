import { expect, test, vi } from 'vitest';
import type { FileSystem } from '../../../models/file-system';
import { ErrorFileNotFound } from '../../../models/file-system';
import { resolveContentHash } from '../content-hash';
import { SHA256_OF_ABC } from './fixtures';

test('resolveContentHash returns preferredHash without reading file', async () => {
  const fs = {
    readFile: vi.fn(async () => new TextEncoder().encode('abc')),
  } as unknown as FileSystem;

  const result = await resolveContentHash(fs, '/a.org', 'remote-hash');

  expect(result).toBe('remote-hash');
  expect(fs.readFile).toHaveBeenCalledTimes(0);
});

test('resolveContentHash computes hash when preferredHash is absent', async () => {
  const fs = {
    readFile: vi.fn(async () => new TextEncoder().encode('abc')),
  } as unknown as FileSystem;

  const result = await resolveContentHash(fs, '/a.org');

  expect(result).toBe(SHA256_OF_ABC);
  expect(fs.readFile).toHaveBeenCalledTimes(1);
});

test('resolveContentHash returns undefined for ErrorFileNotFound', async () => {
  const fs = {
    readFile: vi.fn(async () => {
      throw new ErrorFileNotFound('/missing.org');
    }),
  } as unknown as FileSystem;

  const result = await resolveContentHash(fs, '/missing.org');

  expect(result).toBeUndefined();
});

test('resolveContentHash rethrows unexpected errors', async () => {
  const fs = {
    readFile: vi.fn(async () => {
      throw new Error('permission denied');
    }),
  } as unknown as FileSystem;

  await expect(resolveContentHash(fs, '/a.org')).rejects.toThrow(
    'permission denied'
  );
});
