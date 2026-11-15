import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import {
  clearAgendaDateFilterCommand,
  openAgendaDateFilterCommand,
} from './open-agenda-date-filter-command';
import type { AgendaDateFilter, AgendaFilter } from '../models/agenda-task-query';
import { useAgendaFilterStore } from '../stores/agenda-filter-store';
import {
  AGENDA_TASKS_URI,
  AGENDA_TASKS_TODAY_COMMAND,
  AGENDA_TASKS_TOMORROW_COMMAND,
  AGENDA_TASKS_NEXT7DAYS_COMMAND,
  AGENDA_TASKS_OVERDUE_COMMAND,
  AGENDA_TASKS_ALL_COMMAND,
  AGENDA_TASKS_FILE_FILTER_COMMAND,
} from '../constants';
import { showAgendaTaskBuffer } from '../services/show-agenda-task-buffer';
import { parseAgendaTaskBufferUri } from '../utils/agenda-task-buffer-uri';

const openAgendaWithFilter = async (filter: AgendaFilter, api: OrgNoteApi): Promise<void> => {
  await showAgendaTaskBuffer(api, { kind: 'preset', value: filter });
};

const activeAgendaDateFilter = (api: OrgNoteApi): AgendaDateFilter =>
  parseAgendaTaskBufferUri(api.core.usePane().activeBufferUri ?? AGENDA_TASKS_URI) ?? {
    kind: 'preset',
    value: 'all',
  };

interface AgendaFileFilterCommandData {
  readonly filePath?: string;
}

export const openAgendaFileFilterCommand: Command<AgendaFileFilterCommandData> = {
  command: AGENDA_TASKS_FILE_FILTER_COMMAND,
  group: 'agenda',
  icon: 'sym_o_description',
  system: true,
  handler: async (
    api: OrgNoteApi,
    params: CommandHandlerParams<AgendaFileFilterCommandData>,
  ): Promise<void> => {
    useAgendaFilterStore().setFileFilter(params.data?.filePath);
    await showAgendaTaskBuffer(api, activeAgendaDateFilter(api));
  },
};

const buildFilterCommand = (
  command: string,
  icon: string,
  filter: AgendaFilter,
): Command => ({
  command,
  group: 'agenda',
  icon,
  interactive: true,
  handler: (api) => openAgendaWithFilter(filter, api),
});

export const agendaFilterCommands: readonly Command[] = [
  buildFilterCommand(AGENDA_TASKS_TODAY_COMMAND, 'sym_o_today', 'today'),
  buildFilterCommand(AGENDA_TASKS_TOMORROW_COMMAND, 'sym_o_wb_sunny', 'tomorrow'),
  buildFilterCommand(AGENDA_TASKS_NEXT7DAYS_COMMAND, 'sym_o_date_range', 'next7days'),
  buildFilterCommand(AGENDA_TASKS_OVERDUE_COMMAND, 'sym_o_running_with_errors', 'overdue'),
  buildFilterCommand(AGENDA_TASKS_ALL_COMMAND, 'sym_o_checklist', 'all'),
  openAgendaFileFilterCommand,
  openAgendaDateFilterCommand,
  clearAgendaDateFilterCommand,
];
