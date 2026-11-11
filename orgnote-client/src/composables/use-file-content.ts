import type { FileContent, FileContentTransform } from 'orgnote-api';
import { isOrgGpgFile } from 'orgnote-api';
import { uint8ArrayToText, textToUint8Array, isArmoredPgp } from 'orgnote-api/utils';
import { api } from 'src/boot/api';

export class EncryptionConfigRequiredError extends Error {
  constructor() {
    super(
      'This file is encrypted. Please configure encryption in Settings → Encryption to decrypt it.',
    );
  }
}

const isEncryptionEnabled = (): boolean =>
  api.core.useConfig().config.encryption.type !== 'disabled';

const decryptContent = async (content: Uint8Array): Promise<Uint8Array> => {
  if (!isEncryptionEnabled()) {
    throw new EncryptionConfigRequiredError();
  }
  const input: string | Uint8Array = isArmoredPgp(content) ? uint8ArrayToText(content) : content;
  const decrypted = await api.core.useEncryption().decrypt(input);
  return textToUint8Array(decrypted);
};

const encryptContent = async (content: Uint8Array): Promise<Uint8Array> => {
  if (!isEncryptionEnabled()) {
    throw new EncryptionConfigRequiredError();
  }
  const text = uint8ArrayToText(content);
  const encrypted = await api.core.useEncryption().encrypt(text);
  return textToUint8Array(encrypted);
};

const decodeStoredContent = async (path: string, raw: Uint8Array): Promise<Uint8Array> => {
  if (!raw.length || !isOrgGpgFile(path)) return raw;
  return decryptContent(raw);
};

const encodeContentForStorage = (path: string, content: Uint8Array): Promise<Uint8Array> =>
  isOrgGpgFile(path) ? encryptContent(content) : Promise.resolve(content);

export const useFileContent = (): FileContent => {
  const readFile = async (path: string): Promise<Uint8Array> => {
    const fm = api.core.useFileSystemManager();
    if (!fm.currentFs) {
      throw new Error('No file system selected');
    }
    const raw = await fm.currentFs.readFile<'binary', Uint8Array>(path, 'binary');
    return decodeStoredContent(path, raw ?? new Uint8Array());
  };

  const writeFile = async (path: string, content: Uint8Array): Promise<void> => {
    await api.core.useFileSystem().writeFile(path, await encodeContentForStorage(path, content));
  };

  const updateFile = (path: string, transform: FileContentTransform): Promise<boolean> =>
    api.core.useFileSystem().updateFile(path, async (raw) => {
      const nextContent = await transform(await decodeStoredContent(path, raw));
      if (!nextContent) return undefined;
      return encodeContentForStorage(path, nextContent);
    });

  return {
    read: readFile,
    write: writeFile,
    update: updateFile,
  };
};
