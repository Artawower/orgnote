import type { FileContent } from 'orgnote-api';
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

export const useFileContent = (): FileContent => {
  const readFile = async (path: string): Promise<Uint8Array> => {
    const fm = api.core.useFileSystemManager();
    if (!fm.currentFs) {
      throw new Error('No file system selected');
    }
    const raw = await fm.currentFs.readFile<'binary', Uint8Array>(path, 'binary');
    if (!raw?.length || !isOrgGpgFile(path)) {
      return raw ?? new Uint8Array();
    }
    return decryptContent(raw);
  };

  const writeFile = async (path: string, content: Uint8Array): Promise<void> => {
    const toWrite = isOrgGpgFile(path) ? await encryptContent(content) : content;
    await api.core.useFileSystem().writeFile(path, toWrite);
  };

  return {
    read: readFile,
    write: writeFile,
  };
};
