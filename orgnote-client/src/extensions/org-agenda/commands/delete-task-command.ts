import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { to, uint8ArrayToText, textToUint8Array } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { AGENDA_TASK_DELETE_COMMAND } from '../constants';
import { isAgendaTaskView } from '../utils/is-agenda-task-view';

const handleDeleteTask = async (api: OrgNoteApi, params: CommandHandlerParams): Promise<void> => {
  if (!isAgendaTaskView(params.data)) return;
  const task = params.data;
  const { deleteTask } = await import('../mutations/delete-task');
  const fileContent = api.core.useFileContent();
  const readResult = await to(fileContent.read)(task.filePath);
  if (readResult.isErr()) {
    reporter.reportError(readResult.error);
    return;
  }
  const next = deleteTask(uint8ArrayToText(readResult.value), task.start ?? 0);
  const writeResult = await to(fileContent.write)(task.filePath, textToUint8Array(next));
  if (writeResult.isErr()) reporter.reportError(writeResult.error);
};

export const deleteTaskCommand: Command = {
  command: AGENDA_TASK_DELETE_COMMAND,
  group: 'agenda',
  icon: 'sym_o_delete',
  handler: handleDeleteTask,
};
