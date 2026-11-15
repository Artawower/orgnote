import type { CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { AGENDA_POMODORO_URI } from '../constants';
import { usePomodoroStore } from '../stores/pomodoro-store';
import { useConfirmationModal } from 'src/composables/use-confirmation-modal';
import { i18n } from 'src/boot/i18n';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { isPomodoroTaskData, type PomodoroTaskData } from '../utils/is-pomodoro-task';

const t = i18n.global.t;

type SessionType = 'pomo' | 'stopwatch';

export const resolveTask = async (data: unknown): Promise<PomodoroTaskData | null> => {
  if (isPomodoroTaskData(data)) return data;
  const store = usePomodoroStore();
  if (isPomodoroTaskData(store.selectedTask)) return store.selectedTask;
  return store.openTaskCompletion();
};

const confirmReplaceActiveSession = async (): Promise<boolean> => {
  const { confirm } = useConfirmationModal();
  return confirm({
    title: t(i18nKeys.orgAgendaPomodoroReplaceTitle),
    message: t(i18nKeys.orgAgendaPomodoroReplaceMessage),
  });
};

export const createStartSessionHandler =
  (resolveType: (store: ReturnType<typeof usePomodoroStore>) => SessionType) =>
  async (api: OrgNoteApi, params: CommandHandlerParams): Promise<void> => {
    const store = usePomodoroStore();
    const task = await resolveTask(params.data);
    if (!task) return;

    if (store.hasSession) {
      const confirmed = await confirmReplaceActiveSession();
      if (!confirmed) return;
      await store.stopSession();
    }

    await api.core.useBufferViewer().showOrOpen(AGENDA_POMODORO_URI);
    await store.startSession(task, resolveType(store));
  };
