import { defineStore } from 'pinia';
import { encrypt as _encrypt, decrypt as _decrypt } from 'orgnote-api/encryption';
import type {
  BaseOrgNoteDecryption,
  BaseOrgNoteEncryption,
  EncryptionStore,
  OrgNoteEncryption,
} from 'orgnote-api';
import { armor } from 'orgnote-api';
import { useConfigStore } from './config';

export const useEncryptionStore = defineStore<'encryption', EncryptionStore>('encryption', () => {
  const { config } = useConfigStore();

  const encrypt = async (
    text: string,
    format: BaseOrgNoteEncryption['format'] = 'armored',
    encryptionConfig?: OrgNoteEncryption,
  ): Promise<string> => {
    encryptionConfig ??= config.encryption;
    return await _encrypt({
      content: text,
      format,
      ...encryptionConfig,
    });
  };

  const decrypt = async (
    content: string | Uint8Array,
    format: BaseOrgNoteDecryption['format'] = 'utf8',
    encryptionConfig?: OrgNoteEncryption,
  ): Promise<string> => {
    encryptionConfig ??= config.encryption;
    const text = typeof content === 'string' ? content : armor(content);
    return await _decrypt({
      content: text,
      format,
      ...encryptionConfig,
    });
  };

  return {
    encrypt,
    decrypt,
  };
});
