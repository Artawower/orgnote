import { isPresent } from 'orgnote-api/utils';
import { SECONDS_PER_MINUTE } from '../constants';
import type { AgendaTask } from '../types';
import type { ContentInsertion } from './content-insertion';

export interface PomodoroTask {
  taskId: string;
  taskText: string;
  filePath: string;
  taskStart: number;
}

export interface ActiveSession extends PomodoroTask {
  segmentStartedAt: string;
  accumulatedSeconds: number;
  duration: number;
  type: 'pomo' | 'stopwatch';
  paused: boolean;
}

export const serializeSession = (session: ActiveSession): string => JSON.stringify(session);

const formatTwoDigits = (value: number): string =>
  String(Math.floor(value)).padStart(2, '0');

export const formatSessionTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)}`;
};

export const calculateSegmentElapsed = (
  session: ActiveSession,
  endedAt = new Date(),
): number =>
  Math.floor((endedAt.getTime() - new Date(session.segmentStartedAt).getTime()) / 1000);

export const toPomodoroTask = (task: AgendaTask): PomodoroTask => ({
  taskId: task.id,
  taskText: task.text,
  filePath: task.filePath,
  taskStart: task.start ?? 0,
});

export const adjustTaskForInsertion = (
  task: AgendaTask,
  session: ActiveSession,
  insertion: ContentInsertion | null,
): AgendaTask => {
  if (!insertion || task.filePath !== session.filePath || !isPresent(task.start)) return task;
  if (task.start < insertion.start) return task;
  return { ...task, start: task.start + insertion.length };
};

export const toSelectedTask = (task: PomodoroTask): AgendaTask => ({
  id: task.taskId,
  kind: 'headline-todo',
  state: 'todo',
  text: task.taskText,
  filePath: task.filePath,
  start: task.taskStart,
});

export const resolvePomodoroEnd = (session: ActiveSession): Date => {
  const remaining = session.duration * SECONDS_PER_MINUTE - session.accumulatedSeconds;
  const scheduledEnd = new Date(session.segmentStartedAt).getTime() + remaining * 1000;
  return new Date(Math.max(scheduledEnd, Date.now()));
};
