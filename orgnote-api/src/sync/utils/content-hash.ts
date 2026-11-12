const bytesToHex = (bytes: Uint8Array): string => {
  let hex = '';

  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }

  return hex;
};

let subtleCrypto: SubtleCrypto | null = null;

const getSubtleCrypto = (): SubtleCrypto => {
  if (subtleCrypto) {
    return subtleCrypto;
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available');
  }

  subtleCrypto = globalThis.crypto.subtle;
  return subtleCrypto;
};

const toDigestSource = (content: Uint8Array): Uint8Array<ArrayBuffer> => {
  if (!(content.buffer instanceof ArrayBuffer)) {
    return new Uint8Array(content);
  }

  return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
};

export const hashContent = async (content: Uint8Array): Promise<string> => {
  const digestSource = toDigestSource(content);
  const digest = await getSubtleCrypto().digest('SHA-256', digestSource);
  return bytesToHex(new Uint8Array(digest));
};

export const hashBytes = hashContent;
