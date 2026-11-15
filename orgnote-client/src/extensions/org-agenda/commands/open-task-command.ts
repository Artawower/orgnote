import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { AGENDA_TASK_OPEN_COMMAND } from '../constants';
import { openNoteAtPosition } from 'src/utils/editor-navigation';
import { isAgendaTaskView } from '../utils/is-agenda-task-view';

const handleOpenTask = async (api: OrgNoteApi, params: CommandHandlerParams): Promise<void> => {
  if (!isAgendaTaskView(params.data)) return;
  const task = params.data;
  const result = await to(() => openNoteAtPosition(api, task.filePath, task.start))();
  if (result.isErr()) reporter.reportError(result.error);
};

export const openTaskCommand: Command = {
  command: AGENDA_TASK_OPEN_COMMAND,
  group: 'agenda',
  icon: 'sym_o_open_in_new',
  handler: handleOpenTask,
};
