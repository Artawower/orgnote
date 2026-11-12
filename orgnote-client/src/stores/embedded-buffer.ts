import { defineStore } from 'pinia';
import type { EmbeddedBufferStore } from 'orgnote-api';
import { textToUint8Array, uint8ArrayToText } from 'orgnote-api/utils';
import { v4 as uuid } from 'uuid';
import { EMBEDDED_PREFIX, EMBEDDED_SCHEME } from 'src/constants/embedded-buffer';

export const useEmbeddedBufferStore = defineStore<string, EmbeddedBufferStore>(
  'embedded-buffer',
  (): EmbeddedBufferStore => {
    const buffers = new Map<string, Uint8Array>();

    const buildEmbeddedPath = (id: string): string => `${EMBEDDED_PREFIX}/${id}.org`;

    const create = (text: string): string => {
      const id = uuid();
      const path = buildEmbeddedPath(id);
      buffers.set(path, textToUint8Array(text));
      return `${EMBEDDED_SCHEME}${path}`;
    };

    const get = (path: string): string | undefined => {
      const data = buffers.get(path);
      if (!data) return;
      return uint8ArrayToText(data);
    };

    const remove = (path: string): void => {
      buffers.delete(path);
    };

    return {
      create,
      get,
      remove,
    };
  },
);
