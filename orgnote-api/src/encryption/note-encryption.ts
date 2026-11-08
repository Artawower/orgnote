import { decrypt, encrypt } from './encryption';
import { EncryptionType } from '../models/encryption';
import {
  OrgNoteEncryption,
  WithDecryptionContent,
  WithEncryptionContent,
  WithNoteDecryptionContent,
} from '../models/encryption';
import { parse, withMetaInfo } from 'org-mode-ast';
import { isGpgEncrypted } from '..';

export interface AbstractEncryptedNote {
  encrypted?: boolean;
  meta?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
    published?: boolean;
  };
}

export type EncryptionResult<T> = Promise<[T, string]>;
export type DecryptionResult<T> = Promise<[T, string | Uint8Array]>;

// TODO: master change signature for encrypt notes without content
export async function encryptNote<T extends AbstractEncryptedNote>(
  note: T,
  encryptionParams: WithEncryptionContent<OrgNoteEncryption>
): EncryptionResult<T> {
  note.encrypted = false;
  if (
    !encryptionParams.type ||
    encryptionParams.type === EncryptionType.Disabled ||
    note.meta?.published
  ) {
    return [note, encryptionParams.content];
  }

  note.meta = { id: note.meta?.id, published: note.meta?.published };

  const encryptedContent = await encrypt(encryptionParams);

  const encryptedNote = { ...note, encrypted: true };

  return [encryptedNote, encryptedContent];
}

export async function decryptNote<T extends AbstractEncryptedNote>(
  note: T,
  encryptionParams: WithNoteDecryptionContent<OrgNoteEncryption>
): DecryptionResult<T> {
  const isContentEncrypted = isGpgEncrypted(encryptionParams.content);
  if (
    note.meta?.published ||
    !encryptionParams.type ||
    encryptionParams.type === EncryptionType.Disabled ||
    !isContentEncrypted
  ) {
    note.encrypted = isContentEncrypted;
    return [note, encryptionParams.content];
  }
  note.encrypted = true;
  const decryptionParams = {
    ...encryptionParams,
    format: 'utf8',
  } as WithDecryptionContent<OrgNoteEncryption>;

  const decryptedNoteText = await decrypt(decryptionParams);
  const parsed = withMetaInfo(parse(decryptedNoteText));

  return [
    {
      ...note,
      encrypted: false,
      meta: parsed.meta,
    },
    decryptedNoteText,
  ];
}
