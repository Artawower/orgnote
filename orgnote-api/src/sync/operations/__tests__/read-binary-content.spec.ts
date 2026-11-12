import { expect, test, vi } from 'vitest';
import type { FileSystem } from '../../../models/file-system';
import { readBinaryContent } from '../read-binary-content';

test('returns Uint8Array as-is', async () => {
  const content = new TextEncoder().encode('hello');
  const fs = { readFile: vi.fn(async () => content) } as unknown as FileSystem;

  const result = await readBinaryContent(fs, '/test.org');

  expect(result).toBe(content);
});

test('converts string to Uint8Array', async () => {
  const fs = {
    readFile: vi.fn(async () => 'hello'),
  } as unknown as FileSystem;

  const result = await readBinaryContent(fs, '/test.org');

  expect(new TextDecoder().decode(result)).toBe('hello');
});

test('handles empty content', async () => {
  const fs = {
    readFile: vi.fn(async () => ''),
  } as unknown as FileSystem;

  const result = await readBinaryContent(fs, '/test.org');

  expect(result.length).toBe(0);
});
