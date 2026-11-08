import type { OrgNoteApi } from 'orgnote-api';
import { textToUint8Array, to, uint8ArrayToText } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';

export type AgendaFileMutationResult =
  | { wasWritten: false }
  | { wasWritten: true; previousContent: string; content: string };

const NOT_APPLIED: AgendaFileMutationResult = { wasWritten: false };

export const applyAgendaFileMutation = async (
  api: OrgNoteApi,
  filePath: string,
  mutation: (content: string) => string,
): Promise<AgendaFileMutationResult> => {
  const fileContent = api.core.useFileContent();
  const readResult = await to(fileContent.read)(filePath);
  if (readResult.isErr()) {
    reporter.reportError(readResult.error);
    return NOT_APPLIED;
  }

  const content = uint8ArrayToText(readResult.value);
  const nextContent = mutation(content);
  if (nextContent === content) return NOT_APPLIED;

  const writeResult = await to(fileContent.write)(filePath, textToUint8Array(nextContent));
  if (writeResult.isErr()) {
    reporter.reportError(writeResult.error);
    return NOT_APPLIED;
  }
  return { wasWritten: true, previousContent: content, content: nextContent };
};
