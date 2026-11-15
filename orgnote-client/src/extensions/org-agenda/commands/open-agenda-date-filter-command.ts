import type { Command, OrgNoteApi } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import DatePickerSheetModal from 'src/components/DatePickerSheetModal.vue';
import type { DatePickerSelection } from 'src/models/date-picker';
import {
  AGENDA_TASKS_CLEAR_DATE_FILTER_COMMAND,
  AGENDA_TASKS_DATE_FILTER_COMMAND,
  AGENDA_TASKS_URI,
} from '../constants';
import { showAgendaTaskBuffer } from '../services/show-agenda-task-buffer';
import {
  createAgendaDateFilter,
  resolveAgendaDateSelection,
} from '../utils/agenda-date-selection';
import { parseAgendaTaskBufferUri } from '../utils/agenda-task-buffer-uri';

type DateSheetResult = { selection: DatePickerSelection | null } | undefined;

const openDateFilterSheet = async (api: OrgNoteApi): Promise<DateSheetResult> => {
  const activeUri = api.core.usePane().activeBufferUri ?? AGENDA_TASKS_URI;
  const activeFilter = parseAgendaTaskBufferUri(activeUri) ?? createAgendaDateFilter(undefined);
  const result = await to(
    () =>
      api.ui.useModal().open<DateSheetResult>(DatePickerSheetModal, {
        mini: true,
        modalProps: {
          modelValue: resolveAgendaDateSelection(activeFilter),
          selectionMode: 'both',
          confirmMode: true,
        },
      }),
    'Failed to open Agenda date filter',
  )();
  if (result.isOk()) return result.value;
  reporter.reportError(result.error);
  return undefined;
};

const handleDateFilter = async (api: OrgNoteApi): Promise<void> => {
  const result = await openDateFilterSheet(api);
  if (!result) return;
  const selection = result.selection ?? undefined;
  await showAgendaTaskBuffer(api, createAgendaDateFilter(selection));
};

export const clearAgendaDateFilterCommand: Command = {
  command: AGENDA_TASKS_CLEAR_DATE_FILTER_COMMAND,
  group: 'agenda',
  icon: 'sym_o_close',
  handler: (api) => showAgendaTaskBuffer(api, { kind: 'preset', value: 'all' }),
};

export const openAgendaDateFilterCommand: Command = {
  command: AGENDA_TASKS_DATE_FILTER_COMMAND,
  group: 'agenda',
  icon: 'sym_o_calendar_month',
  interactive: true,
  handler: handleDateFilter,
};
