import { DefaultCommands, type OrgNoteApi } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import type { AgendaDateFilter } from '../models/agenda-task-query';
import { buildAgendaTaskBufferUri } from '../utils/agenda-task-buffer-uri';

export const showAgendaTaskBuffer = async (
  api: OrgNoteApi,
  filter: AgendaDateFilter,
): Promise<void> => {
  const result = await to(
    () =>
      api.core.useCommands().execute(DefaultCommands.SHOW_OR_OPEN_BUFFER, {
        uri: buildAgendaTaskBufferUri(filter),
      }),
    'Failed to show Agenda task buffer',
  )();
  if (result.isErr()) reporter.reportError(result.error);
};
