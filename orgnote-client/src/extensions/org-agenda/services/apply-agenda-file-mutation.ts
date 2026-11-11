import type { OrgNoteApi } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { updateFileText } from 'src/utils/update-file-text';
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
  let result: AgendaFileMutationResult = NOT_APPLIED;
  const recordMutation = (content: string): string => {
    const nextContent = mutation(content);
    result = { wasWritten: true, previousContent: content, content: nextContent };
    return nextContent;
  };
  const updateResult = await to(updateFileText)(api.core.useFileContent(), filePath, recordMutation);
  if (updateResult.isErr()) {
    reporter.reportError(updateResult.error);
    return NOT_APPLIED;
  }
  return updateResult.value ? result : NOT_APPLIED;
};
