import { test, expect, vi } from 'vitest';
import { createEmbeddedBufferProvider } from './embedded-buffer-provider';

const mockGet = vi.fn();

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useEmbeddedBuffer: () => ({
        get: mockGet,
      }),
    },
  },
}));

test('read returns embedded content as Uint8Array', async () => {
  mockGet.mockReturnValue('* Embedded Note');
  const provider = createEmbeddedBufferProvider();
  const result = await provider.read('/embedded/abc.org');
  expect(new TextDecoder().decode(result)).toBe('* Embedded Note');
});

test('read returns empty content when missing', async () => {
  mockGet.mockReturnValue(undefined);
  const provider = createEmbeddedBufferProvider();
  const result = await provider.read('/embedded/missing.org');
  expect(new TextDecoder().decode(result)).toBe('');
});

test('getContext uses filename without extension', () => {
  const provider = createEmbeddedBufferProvider();
  const context = provider.getContext!('/embedded/note.org');
  expect(context.title).toBe('note');
});

test('getContext uses default title for empty filename', () => {
  const provider = createEmbeddedBufferProvider();
  const context = provider.getContext!('/embedded/');
  expect(context.title).toBe('Embedded note');
});

test('provider has correct scheme', () => {
  const provider = createEmbeddedBufferProvider();
  expect(provider.scheme).toBe('embedded');
});
