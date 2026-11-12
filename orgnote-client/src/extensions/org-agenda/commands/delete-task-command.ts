import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { applyAgendaFileMutation } from '../services/apply-agenda-file-mutation';
import { AGENDA_TASK_DELETE_COMMAND } from '../constants';
import { isAgendaTaskView } from '../utils/is-agenda-task-view';

const handleDeleteTask = async (api: OrgNoteApi, params: CommandHandlerParams): Promise<void> => {
  if (!isAgendaTaskView(params.data)) return;
  const task = params.data;
  const { deleteTask } = await import('../mutations/delete-task');
  await applyAgendaFileMutation(
    api,
    task.filePath,
    (content) => deleteTask(content, task.start ?? 0),
    { targetTask: task },
  );
};

export const deleteTaskCommand: Command = {
  command: AGENDA_TASK_DELETE_COMMAND,
  group: 'agenda',
  icon: 'sym_o_delete',
  handler: handleDeleteTask,
};
