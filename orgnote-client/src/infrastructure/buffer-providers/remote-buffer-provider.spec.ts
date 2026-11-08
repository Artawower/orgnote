import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRemoteBufferProvider } from './remote-buffer-provider';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const createMockResponse = (options: {
  ok: boolean;
  status?: number;
  arrayBuffer?: ArrayBuffer;
}): Response => ({
  ok: options.ok,
  status: options.status ?? (options.ok ? 200 : 500),
  arrayBuffer: vi.fn().mockResolvedValue(options.arrayBuffer ?? new ArrayBuffer(0)),
} as unknown as Response);

const textToArrayBuffer = (text: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(text).buffer as ArrayBuffer;
};

const mockFetch = (response: Response): void => {
  globalThis.fetch = vi.fn().mockResolvedValue(response) as unknown as typeof fetch;
};

const mockFetchRejection = (error: Error): void => {
  globalThis.fetch = vi.fn().mockRejectedValue(error) as unknown as typeof fetch;
};

test('read returns content from successful fetch', async () => {
  const content = '* Hello World';
  const mockArrayBuffer = textToArrayBuffer(content);

  mockFetch(createMockResponse({ ok: true, arrayBuffer: mockArrayBuffer }));

  const provider = createRemoteBufferProvider();
  const result = await provider.read('/docs/file.org');

  expect(fetch).toHaveBeenCalledWith('/docs/file.org');
  expect(result).toBeInstanceOf(Uint8Array);
  expect(new TextDecoder().decode(result)).toBe(content);
});

test('read throws on HTTP 404 error', async () => {
  mockFetch(createMockResponse({ ok: false, status: 404 }));

  const provider = createRemoteBufferProvider();

  await expect(provider.read('/missing.org')).rejects.toThrow('404');
});

test('read throws on HTTP 500 error', async () => {
  mockFetch(createMockResponse({ ok: false, status: 500 }));

  const provider = createRemoteBufferProvider();

  await expect(provider.read('/error.org')).rejects.toThrow('500');
});

test('read error message contains path', async () => {
  mockFetch(createMockResponse({ ok: false, status: 403 }));

  const provider = createRemoteBufferProvider();

  await expect(provider.read('/forbidden/file.org')).rejects.toThrow('/forbidden/file.org');
});

test('read propagates network errors', async () => {
  mockFetchRejection(new TypeError('Failed to fetch'));

  const provider = createRemoteBufferProvider();

  await expect(provider.read('/any.org')).rejects.toThrow('Failed to fetch');
});

test('getContext extracts title from filename', () => {
  const provider = createRemoteBufferProvider();

  const context = provider.getContext!('/path/to/my-note.org');

  expect(context.title).toBe('my-note');
});

test('getContext removes extension from filename', () => {
  const provider = createRemoteBufferProvider();

  const context = provider.getContext!('/docs/readme.md');

  expect(context.title).toBe('readme');
});

test('getContext handles filename with multiple dots', () => {
  const provider = createRemoteBufferProvider();

  const context = provider.getContext!('/archive/data.2024.tar.gz');

  expect(context.title).toBe('data.2024.tar');
});

test('getContext returns Untitled for path ending with slash', () => {
  const provider = createRemoteBufferProvider();

  const context = provider.getContext!('/path/to/');

  expect(context.title).toBe('Untitled');
});

test('getContext returns Untitled for empty path', () => {
  const provider = createRemoteBufferProvider();

  const context = provider.getContext!('');

  expect(context.title).toBe('Untitled');
});

test('getContext handles root path', () => {
  const provider = createRemoteBufferProvider();

  const context = provider.getContext!('/');

  expect(context.title).toBe('Untitled');
});

test('getContext handles filename without extension', () => {
  const provider = createRemoteBufferProvider();

  const context = provider.getContext!('/path/README');

  expect(context.title).toBe('README');
});

test('provider has correct scheme', () => {
  const provider = createRemoteBufferProvider();

  expect(provider.scheme).toBe('remote');
});

test('provider is readonly (no write method)', () => {
  const provider = createRemoteBufferProvider();

  expect(provider.write).toBeUndefined();
});
