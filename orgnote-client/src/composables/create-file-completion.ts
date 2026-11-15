import { I18N, type DiskFile, type OrgNoteApi } from 'orgnote-api';
import { createDirPath } from 'src/utils/create-dir-path';
import { createDirItemsGetter } from 'src/utils/dir-items-getter';
import { normalizeOrgFilePath } from 'src/utils/normalize-org-file-path';

const validateNewOrgFilePath = async (
  api: OrgNoteApi,
  value: string,
): Promise<{ valid: true } | { valid: false; message: string }> => {
  const filePath = normalizeOrgFilePath(value.trim());
  if (!filePath || filePath.endsWith('/')) return { valid: false, message: 'File name is required' };

  const existing = await api.core.useFileSystem().fileInfo(filePath);
  if (existing) return { valid: false, message: 'File already exists' };

  return { valid: true };
};

export const pickNewOrgFilePath = async (api: OrgNoteApi): Promise<string> => {
  const fm = api.core.useFileManager();
  const filePath = await getNewFileName(api, fm.focusDirPath);
  return normalizeOrgFilePath(filePath);
};

export const createFileCompletion = async (api: OrgNoteApi): Promise<string> => {
  const filePath = await pickNewOrgFilePath(api);

  if (!filePath) {
    return '';
  }

  const fs = api.core.useFileSystem();
  const existing = await fs.fileInfo(filePath);
  if (existing) return '';

  await fs.writeFile(filePath, '');
  return filePath;
};

const getNewFileName = async (api: OrgNoteApi, filePath: string): Promise<string> => {
  const completion = api.core.useCompletion();

  return await completion.open<DiskFile, string>({
    type: 'input-choice',
    searchText: createDirPath(filePath),
    placeholder: I18N.FILE_NAME,
    validateInput: (value) => validateNewOrgFilePath(api, value),
    itemsGetter: createDirItemsGetter(api),
  });
};
