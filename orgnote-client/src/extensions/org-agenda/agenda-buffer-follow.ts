import type { BufferActivatedEvent, BufferActivationUnsubscribe, OrgNoteApi } from 'orgnote-api';
import {
  AGENDA_HABITS_URI,
  AGENDA_POMODORO_STATS_URI,
  AGENDA_POMODORO_URI,
} from './constants';
import { AgendaSidebarRef } from './agenda-sidebar-ref';
import { parseAgendaTaskBufferUri } from './utils/agenda-task-buffer-uri';

const AGENDA_BUFFER_URIS = new Set([
  AGENDA_HABITS_URI,
  AGENDA_POMODORO_URI,
  AGENDA_POMODORO_STATS_URI,
]);

let unsubscribeBufferActivation: BufferActivationUnsubscribe | undefined;

const isAgendaBufferUri = (uri: string): boolean =>
  AGENDA_BUFFER_URIS.has(uri) || Boolean(parseAgendaTaskBufferUri(uri));

const followAgendaBuffer = (api: OrgNoteApi, event: BufferActivatedEvent): void => {
  if (!api.core.useConfig().config.ui.followActiveBufferInSidebar) return;
  if (!event.current.uri || !isAgendaBufferUri(event.current.uri)) return;
  api.ui.useSidebar().setComponent(AgendaSidebarRef);
};

export const disposeAgendaBufferFollow = (): void => {
  unsubscribeBufferActivation?.();
  unsubscribeBufferActivation = undefined;
};

export const registerAgendaBufferFollow = (api: OrgNoteApi): void => {
  disposeAgendaBufferFollow();
  unsubscribeBufferActivation = api.core
    .usePane()
    .afterBufferActivated((event) => followAgendaBuffer(api, event), { immediate: true });
};
