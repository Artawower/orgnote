import { splitPath, type OrgNoteApi } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { buildNoteContent, buildNoteFilePath } from 'src/utils/create-note-from-link';

export interface LinkedNote {
  readonly id: string;
  readonly title: string;
  readonly filePath: string;
}

export interface PersistLinkedNoteParams extends LinkedNote {
  readonly content: string;
}

export interface CreateLinkedNoteParams {
  readonly noteId: string;
  readonly title: string;
  readonly currentFilePath: string;
}

export class LinkedNoteCreationError extends Error {
  public override readonly name = 'LinkedNoteCreationError';

  public constructor(filePath: string, cause: unknown) {
    super(`Failed to create linked note: ${filePath}`, { cause });
  }
}

const mapCreationError = (filePath: string) => (cause: unknown) =>
  cause instanceof LinkedNoteCreationError
    ? cause
    : new LinkedNoteCreationError(filePath, cause);

export const persistLinkedNote = (api: OrgNoteApi, params: PersistLinkedNoteParams) =>
  to(async () => {
    const fileSystem = api.core.useFileSystem();
    const existingFile = await fileSystem.fileInfo(params.filePath);
    if (existingFile) throw new LinkedNoteCreationError(params.filePath, 'File already exists');

    await fileSystem.writeFile(params.filePath, params.content);
    await api.core.useFileMeta().save({
      id: params.id,
      title: params.title,
      filePath: splitPath(params.filePath),
    });

    return { id: params.id, title: params.title, filePath: params.filePath } satisfies LinkedNote;
  }, mapCreationError(params.filePath))();

export const createLinkedNote = (api: OrgNoteApi, params: CreateLinkedNoteParams) => {
  const title = params.title.trim();
  const filePath = buildNoteFilePath(title, params.currentFilePath);
  const content = buildNoteContent(params.noteId, title);

  return persistLinkedNote(api, { id: params.noteId, title, filePath, content });
};
