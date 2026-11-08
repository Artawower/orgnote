import {
  BaseOrgNoteEncryption,
  OrgNoteEncryption,
  BaseOrgNoteDecryption,
} from './encryption';
import { StoreDefinition } from './store';

export interface EncryptionStore {
  encrypt: (
    text: string,
    format?: BaseOrgNoteEncryption['format'],
    encryptionConfig?: OrgNoteEncryption
  ) => Promise<string>;
  decrypt: (
    content: string | Uint8Array,
    format?: BaseOrgNoteDecryption['format'],
    encryptionConfig?: OrgNoteEncryption
  ) => Promise<string>;
}

export type EncryptionStoreDefinition = StoreDefinition<EncryptionStore>;
