import { getFileName, I18N, type OrgNoteApi } from 'orgnote-api';

export interface NoteInfoModalData {
  title: string;
  filePath: string;
  description?: string;
  tags: string[];
  linksCount: number;
  backlinksCount: number;
  createdAt?: string;
  updatedAt?: string;
  touchedAt?: string;
  lastSyncAt?: string;
}

const getLastSyncAt = (api: OrgNoteApi, filePath: string): string | undefined => {
  const syncStore = api.core.useSync();
  const stateData = syncStore.stateData;
  const files = stateData?.files;

  if (!files) {
    return;
  }

  const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const absolutePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const candidates = [filePath, absolutePath, normalizedPath];

  const syncedFile = candidates.map((path) => files[path]).find((item) => !!item);
  return syncedFile?.syncedAt;
};

const normalizePath = (path: string): string[] => {
  return path.split('/').filter((part) => part.length > 0);
};

const getCurrentFilePath = (api: OrgNoteApi): string | undefined => {
  const editorPath = api.core.useEditor().activeContext?.filePath;
  if (editorPath) {
    return editorPath;
  }

  const routePath = api.core.usePane().activeTab?.router.currentRoute.value?.params?.path;
  if (!routePath) {
    return;
  }

  if (Array.isArray(routePath)) {
    return routePath.join('/');
  }

  return routePath;
};

export const getCurrentNoteInfo = async (
  api: OrgNoteApi,
): Promise<NoteInfoModalData | undefined> => {
  const filePath = getCurrentFilePath(api);
  if (!filePath) {
    return;
  }

  const meta = await api.core.useFileMeta().getByPath(normalizePath(filePath));
  const title = meta?.title?.trim() || getFileName(filePath) || I18N.UNTITLED;

  return {
    title,
    filePath,
    description: meta?.description,
    tags: meta?.tags ?? [],
    linksCount: meta?.links?.length ?? 0,
    backlinksCount: meta?.backlinks?.length ?? 0,
    createdAt: meta?.createdAt,
    updatedAt: meta?.updatedAt,
    touchedAt: meta?.touchedAt,
    lastSyncAt: getLastSyncAt(api, filePath),
  };
};
