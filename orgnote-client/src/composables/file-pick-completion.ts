import type { DiskFile } from 'orgnote-api';
import { I18N, type OrgNoteApi } from 'orgnote-api';
import { createDirItemsGetter } from 'src/utils/dir-items-getter';

export const useNotePickCompletion = async (api: OrgNoteApi, filePath: string): Promise<string> => {
  const completion = api.core.useCompletion();

  return await completion.open<DiskFile, string>({
    type: 'choice',
    searchText: filePath,
    placeholder: I18N.PICK_NOTE,
    itemsGetter: createDirItemsGetter(api, true),
  });
};
