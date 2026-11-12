import { I18N, type OrgNoteApi } from 'orgnote-api';

export const useFileRenameCompletion = async (
  api: OrgNoteApi,
  filePath: string,
): Promise<string> => {
  const result = await getNewFileName(api, filePath);
  const filePathDoesNotChanged = filePath === result || !result;

  if (filePathDoesNotChanged) {
    return '';
  }

  const fm = api.core.useFileSystem();
  await fm.rename(filePath, result);
  return result;
};

const getNewFileName = async (api: OrgNoteApi, filePath: string) => {
  const completion = api.core.useCompletion();
  return await completion.open<void, string>({
    type: 'input',
    searchText: filePath,
    placeholder: I18N.RENAME_FILE,
  });
};
