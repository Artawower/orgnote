import type { FileMeta, FileTask, OrgNoteApi } from 'orgnote-api';
import { isNullable, textToUint8Array, to, uint8ArrayToText } from 'orgnote-api/utils';
import { i18n } from 'src/boot/i18n';
import { reporter } from 'src/boot/report';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { completeRepeatingTask } from '../mutations/complete-repeating-task';
import { completeTask } from '../mutations/complete-task';
import { useAgendaTasksStore } from '../stores/agenda-tasks-store';
import { hasRepeater, isCompletedOn } from '../utils/agenda-filters';

export interface PomodoroSessionSnapshot {
  taskId: string;
  taskText: string;
  filePath: string;
  taskStart: number;
}

interface SessionTask extends FileTask {
  filePath: string;
}

export type PomodoroTaskCompletionResult = 'completed' | 'declined' | 'unavailable';

const t = i18n.global.t;

const normalizeFilePath = (filePath: string): string => filePath.replace(/^\/+/, '');

const resolveFilePath = (file: FileMeta): string => file.filePath.join('/');

const isSnapshotFile = (filePath: string, snapshot: PomodoroSessionSnapshot): boolean =>
  normalizeFilePath(filePath) === normalizeFilePath(snapshot.filePath);

const isSnapshotTask = (task: FileTask, snapshot: PomodoroSessionSnapshot): boolean =>
  task.id === snapshot.taskId ||
  (task.start !== undefined && task.start === snapshot.taskStart);

const toSessionTasks = (file: FileMeta, snapshot: PomodoroSessionSnapshot): SessionTask[] => {
  const filePath = resolveFilePath(file);
  if (!isSnapshotFile(filePath, snapshot)) return [];
  return (file.tasks ?? []).map((task) => ({ ...task, filePath: snapshot.filePath }));
};

const resolveSessionTask = async (
  snapshot: PomodoroSessionSnapshot,
): Promise<SessionTask | null> => {
  const tasksStore = useAgendaTasksStore();
  await tasksStore.loadFiles(true);
  return (
    tasksStore.allFiles
      .flatMap((file) => toSessionTasks(file, snapshot))
      .find((task) => isSnapshotTask(task, snapshot)) ?? null
  );
};

const confirmTaskCompletion = (api: OrgNoteApi): Promise<boolean> =>
  api.ui.useConfirmationModal().confirm({
    title: t(i18nKeys.orgAgendaPomodoroCompleteTaskTitle),
    message: t(i18nKeys.orgAgendaPomodoroCompleteTaskMessage),
    confirmText: t(i18nKeys.orgAgendaPomodoroCompleteTaskConfirm),
    cancelText: t(i18nKeys.orgAgendaPomodoroCompleteTaskCancel),
  });

const canCompletePomodoroTask = (task: FileTask, completedAt: Date): boolean =>
  task.kind === 'headline-todo' &&
  task.start !== undefined &&
  task.state !== 'done' &&
  !isCompletedOn(task, completedAt);

const completePomodoroTaskContent = (
  content: string,
  task: SessionTask,
  completedAt: Date,
): string => {
  const start = task.start;
  if (start === undefined || !canCompletePomodoroTask(task, completedAt)) return content;
  if (hasRepeater(task)) return completeRepeatingTask(content, start, completedAt);
  return completeTask(content, start, completedAt);
};

const readTaskFile = async (api: OrgNoteApi, task: SessionTask): Promise<string | null> => {
  const fileContent = api.core.useFileContent();
  const result = await to(fileContent.read, 'Failed to read Pomodoro task file')(task.filePath);
  if (result.isOk()) return uint8ArrayToText(result.value);
  reporter.reportError(result.error);
  return null;
};

const writeTaskFile = async (
  api: OrgNoteApi,
  task: SessionTask,
  content: string,
): Promise<boolean> => {
  const fileContent = api.core.useFileContent();
  const result = await to(fileContent.write, 'Failed to write Pomodoro task file')(
    task.filePath,
    textToUint8Array(content),
  );
  if (result.isOk()) return true;
  reporter.reportError(result.error);
  return false;
};

const writeCompletedTask = async (
  api: OrgNoteApi,
  task: SessionTask,
  completedAt: Date,
): Promise<boolean> => {
  const content = await readTaskFile(api, task);
  if (isNullable(content)) return false;
  const nextContent = to(completePomodoroTaskContent, 'Failed to complete Pomodoro task')(
    content,
    task,
    completedAt,
  );
  if (nextContent.isErr()) {
    reporter.reportError(nextContent.error);
    return false;
  }
  if (nextContent.value === content) return false;
  return writeTaskFile(api, task, nextContent.value);
};

export const completePomodoroTaskAfterConfirmation = async (
  api: OrgNoteApi,
  snapshot: PomodoroSessionSnapshot,
  completedAt: Date,
): Promise<PomodoroTaskCompletionResult> => {
  const task = await resolveSessionTask(snapshot);
  if (!task || !canCompletePomodoroTask(task, completedAt)) return 'unavailable';
  const confirmed = await confirmTaskCompletion(api);
  if (!confirmed) return 'declined';
  const completed = await writeCompletedTask(api, task, completedAt);
  return completed ? 'completed' : 'declined';
};
