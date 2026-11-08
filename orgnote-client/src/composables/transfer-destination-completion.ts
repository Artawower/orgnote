import { I18N, type DiskFile, type OrgNoteApi } from 'orgnote-api';
import { createDirItemsGetter } from 'src/utils/dir-items-getter';
import { getFileDirPath } from 'src/utils/get-file-dir-path';

export type TransferDestination = {
  destinationDir: string;
  explicitFilePath?: string;
};

const trimTrailingSlash = (path: string): string => {
  if (path === '/') {
    return path;
  }

  if (path.endsWith('/')) {
    return path.slice(0, -1);
  }

  return path;
};

const normalizeDestinationPath = async (
  api: OrgNoteApi,
  path: string,
): Promise<TransferDestination> => {
  const fs = api.core.useFileSystemManager().currentFs;
  if (!fs) {
    return {
      destinationDir: getFileDirPath(path),
    };
  }

  if (path.endsWith('/')) {
    return {
      destinationDir: trimTrailingSlash(path),
    };
  }

  if (await fs.isDirExist(path)) {
    return {
      destinationDir: path,
    };
  }

  return {
    destinationDir: getFileDirPath(path),
    explicitFilePath: path,
  };
};

const pickDestinationPath = async (api: OrgNoteApi, initialPath: string): Promise<string> => {
  const completion = api.core.useCompletion();

  return await completion.open<DiskFile, string>({
    type: 'input-choice',
    searchText: initialPath,
    placeholder: I18N.PICK_FOLDER,
    itemsGetter: createDirItemsGetter(api),
  });
};

export const useTransferDestinationCompletion = async (
  api: OrgNoteApi,
  initialPath: string,
): Promise<TransferDestination | undefined> => {
  const pickedPath = await pickDestinationPath(api, initialPath);

  if (!pickedPath) {
    return;
  }

  return await normalizeDestinationPath(api, pickedPath);
};
