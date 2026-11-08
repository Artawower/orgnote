import { isOrgGpgFile, I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import { to } from 'orgnote-api/utils';

const hasEncryptedNotes = async (): Promise<boolean> => {
  const fileMeta = api.core.useFileMeta();
  const readResult = await to(() => fileMeta.getAll())();
  if (readResult.isErr()) return false;

  return readResult.value.some((file) => isOrgGpgFile(file.filePath.join('/')));
};

export const useEncryptedNotesWarning = () => {
  const confirmEncryptionChange = async (): Promise<boolean> => {
    const encrypted = await hasEncryptedNotes();
    if (!encrypted) return true;

    const { confirm } = api.ui.useConfirmationModal();
    return confirm({ message: I18N.ENCRYPTED_NOTES_KEY_CHANGE_WARNING });
  };

  return { confirmEncryptionChange };
};
