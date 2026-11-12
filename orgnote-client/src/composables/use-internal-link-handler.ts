import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import {
  resolveInternalNoteUri,
  resolveRelativeOrgFilePath,
  resolveBufferSchemeFromRouteName,
} from 'src/utils/org-link';
import { buildNoteContent } from 'src/utils/create-note-from-link';
import { buildBufferUri, isOrgFile, type BufferScheme, type BufferViewerStore } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { extractOrgTitleFromPath } from 'src/utils/extract-org-title-from-path';
import { createLinkedNote, persistLinkedNote } from 'src/composables/create-linked-note';

const DEFAULT_SCHEME = 'file';

const getCurrentFilePath = (): string | undefined => api.core.useEditor().activeContext?.filePath;
const shouldAutoCreateMissingNotes = (): boolean =>
  Boolean(api.core.useConfig().config.editor.autoCreateMissingNotes);

const resolveActiveScheme = (): BufferScheme => {
  const routeName = api.core.usePane().activeRoute?.name?.toString();
  return resolveBufferSchemeFromRouteName(routeName);
};

const createMissingNote = (noteId: string, title: string, currentFilePath: string) =>
  createLinkedNote(api, { noteId, title, currentFilePath }).map((note) =>
    buildBufferUri(DEFAULT_SCHEME, note.filePath),
  );

const createMissingOrgNoteByPath = (filePath: string) => {
  const id = crypto.randomUUID();
  const title = extractOrgTitleFromPath(filePath);
  const content = buildNoteContent(id, title);
  return persistLinkedNote(api, { id, title, filePath, content });
};

const createMissingFileByPath = (filePath: string) =>
  isOrgFile(filePath)
    ? createMissingOrgNoteByPath(filePath)
    : to(api.core.useFileSystem().writeFile, `Failed to create file: ${filePath}`)(filePath, '');

export type OpenLinkTarget = 'current' | 'new-tab' | 'adjacent-pane';

type BufferOpenMethod = keyof Pick<
  BufferViewerStore,
  'open' | 'openInNewTab' | 'openInAdjacentPane'
>;

const BUFFER_OPEN_METHODS: Record<OpenLinkTarget, BufferOpenMethod> = {
  current: 'open',
  'new-tab': 'openInNewTab',
  'adjacent-pane': 'openInAdjacentPane',
};

const openBufferUri = async (uri: string, target: OpenLinkTarget): Promise<void> => {
  const bufferViewer = api.core.useBufferViewer();
  const openMethod = bufferViewer[BUFFER_OPEN_METHODS[target]];
  const openResult = await to(openMethod.bind(bufferViewer))(uri);
  if (openResult.isErr()) {
    reporter.reportError(openResult.error);
  }
};

const ensureLocalLinkFileExists = async (scheme: BufferScheme, path: string): Promise<boolean> => {
  if (scheme !== DEFAULT_SCHEME) {
    return true;
  }

  const fileSystem = api.core.useFileSystem();
  const fileInfoResult = await to(fileSystem.fileInfo.bind(fileSystem))(path);
  if (fileInfoResult.isErr()) {
    reporter.reportError(fileInfoResult.error);
    return false;
  }

  if (fileInfoResult.value || !shouldAutoCreateMissingNotes()) {
    return true;
  }

  const createResult = await createMissingFileByPath(path);
  if (createResult.isErr()) {
    reporter.reportError(createResult.error);
    return false;
  }

  return true;
};

export const useInternalLinkHandler = () => {
  const handleClick = async (
    noteId: string,
    title: string,
    target: OpenLinkTarget = 'current',
  ): Promise<void> => {
    const result = await resolveInternalNoteUri(noteId, api.core.useFileMeta().getById);
    if (result.isErr()) {
      reporter.reportError(result.error);
      return;
    }
    if (result.value) {
      await openBufferUri(result.value, target);
      return;
    }
    if (!shouldAutoCreateMissingNotes()) {
      return;
    }
    const currentFilePath = getCurrentFilePath();
    if (!currentFilePath) {
      reporter.reportError(new Error('Cannot create note: current file path unknown'));
      return;
    }
    const createResult = await createMissingNote(noteId, title, currentFilePath);
    if (createResult.isErr()) {
      reporter.reportError(createResult.error);
      return;
    }
    await openBufferUri(createResult.value, target);
  };

  const handleFileLink = async (
    rawLink: string,
    target: OpenLinkTarget = 'current',
  ): Promise<void> => {
    const currentFilePath = getCurrentFilePath();
    if (!currentFilePath) {
      reporter.reportError(new Error('Cannot open link: current file path unknown'));
      return;
    }

    const scheme = resolveActiveScheme();
    const path = resolveRelativeOrgFilePath(rawLink, currentFilePath);
    const uri = buildBufferUri(scheme, path);

    const isFileReady = await ensureLocalLinkFileExists(scheme, path);
    if (!isFileReady) {
      return;
    }

    await openBufferUri(uri, target);
  };

  return { handleClick, handleFileLink };
};
