import { computed, ref } from 'vue';
import { join } from 'orgnote-api';
import type { CreateTaskInput } from 'orgnote-api/utils';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';
import { fileBaseName } from 'src/utils/file-path';
import { AGENDA_DEFAULT_INBOX_FILENAME } from '../constants';
import { useAgendaTasksStore } from '../stores/agenda-tasks-store';

type QuickAddPayload = CreateTaskInput & { targetFile?: string };

interface UseAgendaQuickAddSubmitOptions {
  toastKey?: string;
}

export const useAgendaQuickAddSubmit = (options: UseAgendaQuickAddSubmitOptions = {}) => {
  const { t } = useI18n({ useScope: 'global', inheritLocale: true });
  const tasksStore = useAgendaTasksStore();
  const agendaConfig = tasksStore.agendaConfig;
  const quickAddLoading = ref(false);

  const knownOrgFiles = computed(() =>
    tasksStore.agendaFiles.map((file) => join('/', ...file.filePath)),
  );

  const resolvedInboxPath = computed(() => {
    if (agendaConfig.inboxFilePath) return agendaConfig.inboxFilePath;
    const base = agendaConfig.agendaFilesPath ?? '/';
    return join(base, AGENDA_DEFAULT_INBOX_FILENAME);
  });

  const notifyAdded = (payload: QuickAddPayload): void => {
    const key = options.toastKey ?? extensionI18nKeys.orgAgendaQuickAddToastAdded;
    const label = fileBaseName(payload.targetFile ?? resolvedInboxPath.value);
    api.core.useNotifications().notify({ message: t(key, { target: label }), level: 'info' });
  };

  const submitQuickAdd = async (payload: QuickAddPayload): Promise<void> => {
    quickAddLoading.value = true;
    const ok = await tasksStore.createTaskInFile(payload);
    quickAddLoading.value = false;
    if (!ok) return;
    notifyAdded(payload);
  };

  return { agendaConfig, knownOrgFiles, quickAddLoading, resolvedInboxPath, submitQuickAdd };
};
