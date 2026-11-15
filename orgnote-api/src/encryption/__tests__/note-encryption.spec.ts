import { expect, test } from 'vitest';
import { decryptNote, encryptNote, AbstractEncryptedNote } from '../note-encryption';
import {
  armoredPublicKey,
  armoredPrivateKey,
  privateKeyPassphrase,
} from './encryption-keys';
import { EncryptionType } from '../../models/encryption';

interface TestNote extends AbstractEncryptedNote {
  id: string;
}

const testNote: TestNote = {
  id: 'test-note-id',
  meta: {
    title: 'Test note',
    published: false,
  },
};

test('Should encrypt note via keys', async () => {
  const noteText = '#+title: Test note\n\nBody text';

  const [encryptedNote, encryptedNoteText] = await encryptNote(testNote, {
    content: noteText,
    type: EncryptionType.GpgKeys,
    publicKey: armoredPublicKey,
    privateKey: armoredPrivateKey,
    privateKeyPassphrase,
    format: 'armored',
  });

  expect(encryptedNoteText.startsWith('-----BEGIN PGP MESSAGE-----')).toBe(
    true
  );
  expect(encryptedNote.id).toBe(testNote.id);
});

test('Should decrypt note via keys', async () => {
  const noteText = '#+title: Test note\n\nBody text';

  const [, encryptedNoteText] = await encryptNote(testNote, {
    content: noteText,
    type: EncryptionType.GpgKeys,
    publicKey: armoredPublicKey,
    privateKey: armoredPrivateKey,
    privateKeyPassphrase,
    format: 'armored',
  });

  const [decryptedNote, decryptedText] = await decryptNote(
    testNote,
    {
      content: encryptedNoteText,
      type: EncryptionType.GpgKeys,
      publicKey: armoredPublicKey,
      privateKey: armoredPrivateKey,
      privateKeyPassphrase,
    }
  );

  expect(decryptedNote.id).toBe(testNote.id);
  expect(decryptedNote.meta?.title).toBe('Test note');
  expect(decryptedText).toBe(noteText);
});
