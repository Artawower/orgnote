import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { isNullable, to, uint8ArrayToText, textToUint8Array } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { i18n } from 'src/boot/i18n';
import { AGENDA_TASK_SET_PRIORITY_COMMAND } from '../constants';
import { openOrgPriorityCompletion } from 'src/utils/org-priority-completion';
import { changeTaskPriority } from '../mutations/task-priority';
import { isAgendaTaskView } from '../utils/is-agenda-task-view';

const handleSetTaskPriority = async (
  api: OrgNoteApi,
  params: CommandHandlerParams,
): Promise<void> => {
  if (!isAgendaTaskView(params.data)) return;
  const task = params.data;
  const priority = await openOrgPriorityCompletion(api, i18n.global.t);
  if (isNullable(priority)) return;
  const fileContent = api.core.useFileContent();
  const readResult = await to(fileContent.read)(task.filePath);
  if (readResult.isErr()) {
    reporter.reportError(readResult.error);
    return;
  }
  const next = changeTaskPriority(
    uint8ArrayToText(readResult.value),
    task.start ?? 0,
    priority || undefined,
  );
  const writeResult = await to(fileContent.write)(task.filePath, textToUint8Array(next));
  if (writeResult.isErr()) reporter.reportError(writeResult.error);
};

export const setTaskPriorityCommand: Command = {
  command: AGENDA_TASK_SET_PRIORITY_COMMAND,
  group: 'agenda',
  icon: 'sym_o_flag',
  handler: handleSetTaskPriority,
};
