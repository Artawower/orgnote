import type { FileContentTransform } from 'orgnote-api';
import { vi } from 'vitest';

export const createAtomicFileContent = (initialFiles: Record<string, string>) => {
  const files = new Map(
    Object.entries(initialFiles).map(([path, text]) => [path, new TextEncoder().encode(text)]),
  );
  return {
    read: vi.fn(() => Promise.reject(new Error('read must not be used for file mutations'))),
    write: vi.fn(() => Promise.reject(new Error('write must not be used for file mutations'))),
    update: vi.fn(async (path: string, transform: FileContentTransform) => {
      const next = await transform(files.get(path) ?? new Uint8Array());
      if (!next) return false;
      files.set(path, next);
      return true;
    }),
    readText: (path: string): string => new TextDecoder().decode(files.get(path) ?? new Uint8Array()),
  };
};
