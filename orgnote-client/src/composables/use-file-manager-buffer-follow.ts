import {
  parseBufferUri,
  type BufferActivatedEvent,
  type BufferActivationUnsubscribe,
  type OrgNoteApi,
} from 'orgnote-api';
import { onScopeDispose } from 'vue';
import { api } from 'src/boot/api';
import { getFileDirPath } from 'src/utils/get-file-dir-path';
import { FILE_MANAGER_SIDEBAR_CONFIG, FileManagerRef } from 'src/containers/file-manager-ref';

const getFileBufferPath = (uri: string | undefined): string | undefined => {
  if (!uri) return;
  const parsedUri = parseBufferUri(uri);
  if (parsedUri.scheme !== 'file') return;
  return parsedUri.path;
};

const selectActiveFile = (api: OrgNoteApi, event: BufferActivatedEvent): void => {
  if (!api.core.useConfig().config.ui.followActiveBufferInSidebar) return;
  const filePath = getFileBufferPath(event.current.uri);
  if (!filePath) return;
  const fileManager = api.core.useFileManager();
  fileManager.path = getFileDirPath(filePath);
  fileManager.searchQuery = '';
  api.ui.useSidebar().setComponent(FileManagerRef, FILE_MANAGER_SIDEBAR_CONFIG);
};

export const registerFileManagerBufferFollow = (
  api: OrgNoteApi,
): BufferActivationUnsubscribe =>
  api.core
    .usePane()
    .afterBufferActivated((event) => selectActiveFile(api, event), { immediate: true });

export const useFileManagerBufferFollow = (): void => {
  const unsubscribe = registerFileManagerBufferFollow(api);
  onScopeDispose(unsubscribe);
};
