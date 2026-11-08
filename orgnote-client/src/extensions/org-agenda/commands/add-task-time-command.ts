import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import AgendaTaskTimeModal from '../components/AgendaTaskTimeModal.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { AGENDA_TASK_ADD_TIME_COMMAND } from '../constants';
import { appendClock } from '../mutations/clock';
import {
  createAgendaTaskClockRange,
  normalizeAgendaTaskTime,
  type AgendaTaskTime,
} from '../models/task-time';
import { applyAgendaFileMutation } from '../services/apply-agenda-file-mutation';
import { isAgendaTaskView } from '../utils/is-agenda-task-view';

type TaskTimeModalResult = AgendaTaskTime | undefined;

const openTaskTimeModal = async (api: OrgNoteApi): Promise<AgendaTaskTime | undefined> => {
  const result = await to(
    () =>
      api.ui.useModal().open<TaskTimeModalResult>(AgendaTaskTimeModal, {
        title: i18nKeys.orgAgendaTaskTimeTitle,
        mini: true,
      }),
    'Failed to open task time modal',
  )();
  if (result.isErr()) {
    reporter.reportError(result.error);
    return undefined;
  }
  if (!result.value) return undefined;
  return normalizeAgendaTaskTime(
    result.value.hours,
    result.value.minutes,
    result.value.startTime,
  );
};

const handleAddTaskTime = async (
  api: OrgNoteApi,
  params: CommandHandlerParams,
): Promise<void> => {
  if (!isAgendaTaskView(params.data)) return;
  const taskTime = await openTaskTimeModal(api);
  if (!taskTime) return;

  const currentTime = new Date();
  const clockRange = createAgendaTaskClockRange(taskTime, currentTime);
  if (clockRange.endedAt > currentTime) return;
  await applyAgendaFileMutation(api, params.data.filePath, (content) =>
    appendClock(content, params.data.start ?? 0, clockRange.startedAt, clockRange.endedAt),
  );
};

export const addTaskTimeCommand: Command = {
  command: AGENDA_TASK_ADD_TIME_COMMAND,
  group: 'agenda',
  icon: 'sym_o_more_time',
  interactive: true,
  handler: handleAddTaskTime,
};
