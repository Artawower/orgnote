import type { Command, FileMeta, OrgNoteApi } from 'orgnote-api';
import { i18n } from 'src/boot/i18n';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { AGENDA_CREATE_TASK } from '../constants';
import { useAgendaTasksStore } from '../stores/agenda-tasks-store';
import { createAgendaFilesGetter } from '../utils/agenda-files-completion';
import { fileBaseName } from 'src/utils/file-path';

const t = i18n.global.t;

const promptTitle = async (api: OrgNoteApi): Promise<string | undefined> => {
  const result = await api.core.useCompletion().open<string, string>({
    type: 'input',
    placeholder: t(i18nKeys.orgAgendaCommandCreateTaskTitle),
  });
  return result || undefined;
};

const promptTargetFile = async (
  api: OrgNoteApi,
  agendaFilesPath: string,
  inboxLabel: string,
): Promise<string | undefined> => {
  const getter = createAgendaFilesGetter(api, agendaFilesPath, inboxLabel);
  const result = await api.core.useCompletion().open<FileMeta, string>({
    type: 'choice',
    placeholder: t(i18nKeys.orgAgendaCommandCreateTaskTarget),
    itemsGetter: getter,
  });
  return result || undefined;
};

const notifyCreated = (api: OrgNoteApi, targetFile: string): void => {
  api.core.useNotifications().notify({
    message: t(i18nKeys.orgAgendaQuickAddToastAdded, { target: fileBaseName(targetFile) }),
    level: 'info',
  });
};

const handleCreateTask = async (api: OrgNoteApi): Promise<void> => {
  const store = useAgendaTasksStore();
  const config = store.agendaConfig;

  const title = await promptTitle(api);
  if (!title) return;

  const agendaFilesPath = config.agendaFilesPath ?? '/';
  const inboxFilePath = config.inboxFilePath ?? `${agendaFilesPath}/inbox.org`;

  const targetFile = await promptTargetFile(api, agendaFilesPath, fileBaseName(inboxFilePath));

  const ok = await store.createTaskInFile({ title, targetFile });
  if (!ok) return;

  notifyCreated(api, targetFile ?? inboxFilePath);
};

export const createTaskCommand: Command = {
  command: AGENDA_CREATE_TASK,
  group: 'agenda',
  icon: 'sym_o_add_task',
  handler: handleCreateTask,
};
