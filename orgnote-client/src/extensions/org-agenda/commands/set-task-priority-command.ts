import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { isNullable, to } from 'orgnote-api/utils';
import { updateFileText } from 'src/utils/update-file-text';
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
  const result = await to(updateFileText)(api.core.useFileContent(), task.filePath, (content) =>
    changeTaskPriority(content, task.start ?? 0, priority || undefined),
  );
  if (result.isErr()) reporter.reportError(result.error);
};

export const setTaskPriorityCommand: Command = {
  command: AGENDA_TASK_SET_PRIORITY_COMMAND,
  group: 'agenda',
  icon: 'sym_o_flag',
  handler: handleSetTaskPriority,
};
