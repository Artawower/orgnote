import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { updateFileText } from 'src/utils/update-file-text';
import { reporter } from 'src/boot/report';
import { AGENDA_TASK_DELETE_COMMAND } from '../constants';
import { isAgendaTaskView } from '../utils/is-agenda-task-view';

const handleDeleteTask = async (api: OrgNoteApi, params: CommandHandlerParams): Promise<void> => {
  if (!isAgendaTaskView(params.data)) return;
  const task = params.data;
  const { deleteTask } = await import('../mutations/delete-task');
  const result = await to(updateFileText)(api.core.useFileContent(), task.filePath, (content) =>
    deleteTask(content, task.start ?? 0),
  );
  if (result.isErr()) reporter.reportError(result.error);
};

export const deleteTaskCommand: Command = {
  command: AGENDA_TASK_DELETE_COMMAND,
  group: 'agenda',
  icon: 'sym_o_delete',
  handler: handleDeleteTask,
};
