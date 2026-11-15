import type { BufferProvider, BufferContext } from 'orgnote-api';
import { textToUint8Array } from 'orgnote-api/utils';
import { createTitleExtractor } from './extract-title';

const extractTitleFromPath = createTitleExtractor('Builtin');

export const createBuiltinBufferProvider = (): BufferProvider => ({
  scheme: 'builtin',

  async read(_path: string): Promise<Uint8Array> {
    void _path;
    return textToUint8Array('');
  },

  getContext(path: string): BufferContext {
    return {
      title: extractTitleFromPath(path),
    };
  },
});
