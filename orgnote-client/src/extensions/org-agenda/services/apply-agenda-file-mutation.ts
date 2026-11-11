import type { OrgNoteApi } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { updateFileText } from 'src/utils/update-file-text';
import { reporter } from 'src/boot/report';
import { isTaskLineAt } from 'src/utils/is-task-line-at';

export type AgendaFileMutationResult =
  | { wasWritten: false }
  | { wasWritten: true; previousContent: string; content: string };

export interface AgendaTaskTarget {
  start?: number;
  text: string;
}

export interface AgendaFileMutationOptions {
  targetTask?: AgendaTaskTarget;
}

class AgendaTaskMovedError extends Error {
  constructor(filePath: string, target: AgendaTaskTarget) {
    super(`Task "${target.text}" is no longer at its position in ${filePath}`);
    this.name = 'AgendaTaskMovedError';
  }
}

const NOT_APPLIED: AgendaFileMutationResult = { wasWritten: false };

const reportFailure = (error: Error): void => {
  if (error instanceof AgendaTaskMovedError) return reporter.reportWarning(error.message);
  reporter.reportError(error);
};

export const applyAgendaFileMutation = async (
  api: OrgNoteApi,
  filePath: string,
  mutation: (content: string) => string,
  options: AgendaFileMutationOptions = {},
): Promise<AgendaFileMutationResult> => {
  let result: AgendaFileMutationResult = NOT_APPLIED;
  const recordMutation = (content: string): string => {
    const { targetTask } = options;
    if (targetTask && !isTaskLineAt(content, targetTask.start, targetTask.text)) {
      throw new AgendaTaskMovedError(filePath, targetTask);
    }
    const nextContent = mutation(content);
    result = { wasWritten: true, previousContent: content, content: nextContent };
    return nextContent;
  };
  const updateResult = await to(updateFileText)(api.core.useFileContent(), filePath, recordMutation);
  if (updateResult.isErr()) {
    reportFailure(updateResult.error);
    return NOT_APPLIED;
  }
  return updateResult.value ? result : NOT_APPLIED;
};
