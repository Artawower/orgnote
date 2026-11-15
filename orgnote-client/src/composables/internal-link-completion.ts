import {
  i18n,
  type CompletionCandidate,
  type CompletionSearchResult,
  type FileMeta,
  type OrgNoteApi,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { createFileItemsGetter } from 'src/composables/note-search-completion';
import { createLinkedNote } from 'src/composables/create-linked-note';
import { buildNoteFilePath } from 'src/utils/create-note-from-link';

const CREATE_NOTE_LABEL = 'Create note';

interface InternalLinkEditor {
  insertInternalLink: (id: string, title: string) => void;
}

type InternalLinkSelection =
  | { readonly kind: 'existing'; readonly file: FileMeta }
  | { readonly kind: 'create'; readonly title: string };

type CompletionStore = ReturnType<OrgNoteApi['core']['useCompletion']>;

const getFileTitle = (file: FileMeta): string =>
  file.title ?? file.filePath.at(-1) ?? i18n.UNTITLED;

const closeWithSelection = (
  completion: CompletionStore,
  selection: InternalLinkSelection,
): void => {
  void completion.close(selection);
};

const createExistingCandidate = (
  completion: CompletionStore,
  file: FileMeta,
): CompletionCandidate<InternalLinkSelection> => ({
  title: getFileTitle(file),
  description: file.filePath.join('/'),
  icon: 'sym_o_article',
  data: { kind: 'existing', file },
  commandHandler: (selection) => closeWithSelection(completion, selection),
});

const createNoteCandidate = (
  completion: CompletionStore,
  title: string,
): CompletionCandidate<InternalLinkSelection> => ({
  title: `${CREATE_NOTE_LABEL} “${title}”`,
  icon: 'sym_o_note_add',
  data: { kind: 'create', title },
  commandHandler: (selection) => closeWithSelection(completion, selection),
});

const resolveFilePagination = (
  hasCreationCandidate: boolean,
  limit?: number,
  offset?: number,
) => {
  if (!hasCreationCandidate) return { limit, offset };
  if (offset) return { limit, offset: offset - 1 };
  return { limit: limit === undefined ? undefined : Math.max(0, limit - 1), offset };
};

const isCreationAvailable = async (api: OrgNoteApi, title: string): Promise<boolean> => {
  const currentFilePath = api.core.useEditor().activeContext?.filePath;
  if (!title || !currentFilePath) return false;

  const filePath = buildNoteFilePath(title, currentFilePath);
  const fileSystem = api.core.useFileSystem();
  const result = await to(fileSystem.fileInfo.bind(fileSystem))(filePath);
  if (result.isErr()) {
    reporter.reportError(result.error);
    return false;
  }
  return !result.value;
};

const addCreationCandidate = (
  completion: CompletionStore,
  title: string,
  offset: number | undefined,
  result: CompletionSearchResult<InternalLinkSelection>,
): CompletionSearchResult<InternalLinkSelection> => ({
  result: offset ? result.result : [createNoteCandidate(completion, title), ...result.result],
  total: (result.total ?? result.result.length) + 1,
});

const createInternalLinkItemsGetter = (api: OrgNoteApi, completion: CompletionStore) => {
  const getFiles = createFileItemsGetter<InternalLinkSelection>(api, (file) =>
    createExistingCandidate(completion, file),
  );

  return async (
    query: string,
    limit?: number,
    offset?: number,
  ): Promise<CompletionSearchResult<InternalLinkSelection>> => {
    const title = query.trim();
    const hasCreationCandidate = await isCreationAvailable(api, title);
    const filePagination = resolveFilePagination(hasCreationCandidate, limit, offset);
    const result = await getFiles(query, filePagination.limit, filePagination.offset);
    if (!hasCreationCandidate) return result;
    return addCreationCandidate(completion, title, offset, result);
  };
};

const insertExistingLink = (editor: InternalLinkEditor, file: FileMeta): void => {
  editor.insertInternalLink(file.id ?? '', getFileTitle(file));
};

const createAndInsertLink = async (
  api: OrgNoteApi,
  editor: InternalLinkEditor,
  title: string,
): Promise<void> => {
  const currentFilePath = api.core.useEditor().activeContext?.filePath;
  if (!currentFilePath) {
    reporter.reportError(new LinkedNoteContextError());
    return;
  }

  const result = await createLinkedNote(api, {
    noteId: crypto.randomUUID(),
    title,
    currentFilePath,
  });
  if (result.isErr()) {
    reporter.reportError(result.error);
    return;
  }

  editor.insertInternalLink(result.value.id, result.value.title);
};

class LinkedNoteContextError extends Error {
  public override readonly name = 'LinkedNoteContextError';

  public constructor() {
    super('Cannot create linked note without an active file path');
  }
}

const applyInternalLinkSelection = async (
  api: OrgNoteApi,
  editor: InternalLinkEditor,
  selection: InternalLinkSelection,
): Promise<void> => {
  if (selection.kind === 'existing') {
    insertExistingLink(editor, selection.file);
    return;
  }

  await createAndInsertLink(api, editor, selection.title);
};

export const openInternalLinkCompletion = async (
  api: OrgNoteApi,
  editor: InternalLinkEditor,
): Promise<void> => {
  const completion = api.core.useCompletion();
  const selection = await completion.open<InternalLinkSelection, InternalLinkSelection | undefined>({
    type: 'choice',
    placeholder: i18n.PICK_NOTE_TO_LINK,
    itemsGetter: createInternalLinkItemsGetter(api, completion),
  });
  if (!selection) return;

  await applyInternalLinkSelection(api, editor, selection);
};
