import { test, expect, vi, beforeEach } from 'vitest';

const { mockGetAll, mockConfirm } = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockConfirm: vi.fn(),
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileMeta: () => ({
        getAll: mockGetAll,
      }),
    },
    ui: {
      useConfirmationModal: () => ({
        confirm: mockConfirm,
      }),
    },
  },
}));

import { useEncryptedNotesWarning } from './use-encrypted-notes-warning';
import { withSetup } from '../../test/with-setup';
import { I18N } from 'orgnote-api';

beforeEach(() => {
  vi.clearAllMocks();
});

test('useEncryptedNotesWarning confirmEncryptionChange returns true when no encrypted notes exist', async () => {
  mockGetAll.mockResolvedValue([
    { filePath: ['notes', 'plain.org'] },
    { filePath: ['docs', 'readme.org'] },
  ]);

  const [{ confirmEncryptionChange }] = withSetup(() =>
    useEncryptedNotesWarning(),
  );
  const result = await confirmEncryptionChange();

  expect(result).toBe(true);
  expect(mockConfirm).not.toHaveBeenCalled();
});

test('useEncryptedNotesWarning confirmEncryptionChange returns true when file list is empty', async () => {
  mockGetAll.mockResolvedValue([]);

  const [{ confirmEncryptionChange }] = withSetup(() =>
    useEncryptedNotesWarning(),
  );
  const result = await confirmEncryptionChange();

  expect(result).toBe(true);
  expect(mockConfirm).not.toHaveBeenCalled();
});

test('useEncryptedNotesWarning confirmEncryptionChange shows confirmation when encrypted notes exist', async () => {
  mockGetAll.mockResolvedValue([
    { filePath: ['notes', 'secret.org.gpg'] },
    { filePath: ['docs', 'readme.org'] },
  ]);
  mockConfirm.mockResolvedValue(true);

  const [{ confirmEncryptionChange }] = withSetup(() =>
    useEncryptedNotesWarning(),
  );
  const result = await confirmEncryptionChange();

  expect(result).toBe(true);
  expect(mockConfirm).toHaveBeenCalledWith({
    message: I18N.ENCRYPTED_NOTES_KEY_CHANGE_WARNING,
  });
});

test('useEncryptedNotesWarning confirmEncryptionChange returns false when user declines', async () => {
  mockGetAll.mockResolvedValue([{ filePath: ['vault', 'encrypted.org.gpg'] }]);
  mockConfirm.mockResolvedValue(false);

  const [{ confirmEncryptionChange }] = withSetup(() =>
    useEncryptedNotesWarning(),
  );
  const result = await confirmEncryptionChange();

  expect(result).toBe(false);
  expect(mockConfirm).toHaveBeenCalledTimes(1);
});

test('useEncryptedNotesWarning confirmEncryptionChange detects gpg files in nested paths', async () => {
  mockGetAll.mockResolvedValue([{ filePath: ['deep', 'nested', 'path', 'note.org.gpg'] }]);
  mockConfirm.mockResolvedValue(true);

  const [{ confirmEncryptionChange }] = withSetup(() =>
    useEncryptedNotesWarning(),
  );
  await confirmEncryptionChange();

  expect(mockConfirm).toHaveBeenCalledTimes(1);
});
