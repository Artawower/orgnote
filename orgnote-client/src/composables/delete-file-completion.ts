import { getFileName, I18N, type DiskFile, type OrgNoteApi } from 'orgnote-api';
import { createDirItemsGetter } from 'src/utils/dir-items-getter';

export const deleteFileCompletion = async (
  api: OrgNoteApi,
  filePath?: string,
): Promise<string | undefined> => {
  const fm = api.core.useFileManager();
  const deletedFilePath = await getDeleteFileName(api, fm.focusFile?.path ?? filePath ?? '/');

  if (!deletedFilePath) {
    return;
  }

  const fs = api.core.useFileSystem();
  const { confirm } = api.ui.useConfirmationModal();

  const fileName = getFileName(deletedFilePath);
  const ok = await confirm({
    title: fileName,
    message: I18N.CONFIRM_FILE_DELETION,
  });

  if (ok) {
    await fs.deleteFile(deletedFilePath);
    return filePath;
  }
};

const getDeleteFileName = async (api: OrgNoteApi, filePath: string): Promise<string> => {
  const completion = api.core.useCompletion();

  return await completion.open<DiskFile, string>({
    type: 'choice',
    searchText: filePath,
    placeholder: I18N.FILE_NAME,
    itemsGetter: createDirItemsGetter(api, true),
  });
};
