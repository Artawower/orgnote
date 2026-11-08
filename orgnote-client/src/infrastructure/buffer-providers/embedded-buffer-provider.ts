import type { BufferProvider, BufferContext } from 'orgnote-api';
import { textToUint8Array } from 'orgnote-api/utils';
import { api } from 'src/boot/api';
import { createTitleExtractor } from './extract-title';

const extractTitleFromPath = createTitleExtractor('Embedded note');

export const createEmbeddedBufferProvider = (): BufferProvider => ({
  scheme: 'embedded',

  async read(path: string): Promise<Uint8Array> {
    const embedded = api.core.useEmbeddedBuffer();
    const text = embedded.get(path);
    if (!text) {
      return textToUint8Array('');
    }
    return textToUint8Array(text);
  },

  getContext(path: string): BufferContext {
    return {
      title: extractTitleFromPath(path),
    };
  },
});
