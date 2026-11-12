import { boolean, metadata, number, object, optional, pipe, string } from 'valibot';
import { AGENDA_DEFAULT_INBOX_FILENAME, POMODORO_DEFAULT_DURATION_MIN } from './constants';

export type AgendaConfig = Record<string, unknown> & {
  agendaFilesPath?: string;
  inboxFilePath?: string;
  pomoDuration: number;
  soundEnabled: boolean;
};

const agendaDefaults: AgendaConfig = {
  agendaFilesPath: undefined,
  inboxFilePath: undefined,
  pomoDuration: POMODORO_DEFAULT_DURATION_MIN,
  soundEnabled: true,
};

export const agendaSettingsSchema = object({
  agendaFilesPath: pipe(optional(string()), metadata({ directoryPicker: true })),
  inboxFilePath: pipe(
    optional(string()),
    metadata({ filePicker: true, defaultValue: AGENDA_DEFAULT_INBOX_FILENAME }),
  ),
  pomoDuration: pipe(optional(number()), metadata({ defaultValue: POMODORO_DEFAULT_DURATION_MIN })),
  soundEnabled: pipe(optional(boolean()), metadata({ defaultValue: agendaDefaults.soundEnabled })),
});

export const defaultAgendaSettings: Record<string, unknown> = agendaDefaults;

export const resolveAgendaConfig = (rawConfig: Record<string, unknown>): AgendaConfig => ({
  agendaFilesPath:
    (rawConfig.agendaFilesPath as string | undefined) ?? agendaDefaults.agendaFilesPath,
  inboxFilePath: (rawConfig.inboxFilePath as string | undefined) ?? agendaDefaults.inboxFilePath,
  pomoDuration: (rawConfig.pomoDuration as number | undefined) ?? agendaDefaults.pomoDuration,
  soundEnabled: (rawConfig.soundEnabled as boolean | undefined) ?? agendaDefaults.soundEnabled,
});
