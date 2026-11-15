import type { Command } from 'orgnote-api';
import { AGENDA_POMODORO_STOP_COMMAND } from '../constants';
import { usePomodoroStore } from '../stores/pomodoro-store';
import {
  completePomodoroTaskAfterConfirmation,
  type PomodoroSessionSnapshot,
} from '../services/pomodoro-task-completion';

const createSessionSnapshot = (
  store: ReturnType<typeof usePomodoroStore>,
): PomodoroSessionSnapshot | null => {
  const session = store.session;
  if (!session) return null;
  return {
    taskId: session.taskId,
    taskText: session.taskText,
    filePath: session.filePath,
    taskStart: session.taskStart,
  };
};

export const stopPomodoroCommand: Command = {
  command: AGENDA_POMODORO_STOP_COMMAND,
  group: 'agenda',
  icon: 'sym_o_stop',
  disabled: () => {
    const store = usePomodoroStore();
    return store.isTransitioning || !store.hasSession;
  },
  handler: async (api) => {
    const store = usePomodoroStore();
    const snapshot = createSessionSnapshot(store);
    const completedAt = new Date();
    await store.stopSession();
    if (!snapshot) return;
    const result = await completePomodoroTaskAfterConfirmation(api, snapshot, completedAt);
    store.applyTaskCompletionResult(result);
  },
};
