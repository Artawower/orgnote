import type { BufferProvider, BufferContext } from 'orgnote-api';
import { createTitleExtractor } from './extract-title';

const extractTitleFromPath = createTitleExtractor('Untitled');

export const createRemoteBufferProvider = (): BufferProvider => ({
  scheme: 'remote',

  async read(path: string): Promise<Uint8Array> {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${path} (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  },

  getContext(path: string): BufferContext {
    return {
      title: extractTitleFromPath(path),
    };
  },
});
