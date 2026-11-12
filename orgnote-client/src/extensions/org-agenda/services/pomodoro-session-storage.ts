import { isPresent, to } from 'orgnote-api/utils';
import { api } from 'src/boot/api';
import { POMODORO_ACTIVE_SESSION_KEY, POMODORO_LAST_TASK_KEY } from '../constants';
import {
  serializeSession,
  type ActiveSession,
  type PomodoroTask,
} from './pomodoro-session';

const repository = () => api.infrastructure.keyValueRepository;

export const persistPomodoroSession = async (session: ActiveSession): Promise<void> => {
  await to(repository().set)(POMODORO_ACTIVE_SESSION_KEY, serializeSession(session));
};

export const clearPersistedPomodoroSession = async (): Promise<void> => {
  await to(repository().delete)(POMODORO_ACTIVE_SESSION_KEY);
};

export const clearStoppedPomodoroSession = async (
  stoppedSession: ActiveSession,
  getActiveSession: () => ActiveSession | null,
): Promise<void> => {
  if (isPresent(getActiveSession())) return;
  const raw = await to(repository().get)(POMODORO_ACTIVE_SESSION_KEY);
  const sessionChangedDuringRead = isPresent(getActiveSession());
  const storedMatchesStopped = raw.isOk() && raw.value === serializeSession(stoppedSession);
  if (sessionChangedDuringRead || !storedMatchesStopped) return;
  await clearPersistedPomodoroSession();
};

export const persistPomodoroTask = async (task: PomodoroTask): Promise<void> => {
  await to(repository().set)(POMODORO_LAST_TASK_KEY, JSON.stringify(task));
};

const clearPersistedPomodoroTask = async (): Promise<void> => {
  await to(repository().delete)(POMODORO_LAST_TASK_KEY);
};

const parseStoredValue = <T>(value: string): T | null => {
  const parsed = to(JSON.parse)(value);
  return parsed.isOk() ? (parsed.value as T) : null;
};

export const loadPersistedPomodoroSession = async (): Promise<ActiveSession | null> => {
  const raw = await to(repository().get)(POMODORO_ACTIVE_SESSION_KEY);
  if (raw.isErr() || !raw.value) return null;
  const session = parseStoredValue<ActiveSession>(raw.value);
  if (session) return session;
  await clearPersistedPomodoroSession();
  return null;
};

export const loadPersistedPomodoroTask = async (): Promise<PomodoroTask | null> => {
  const raw = await to(repository().get)(POMODORO_LAST_TASK_KEY);
  if (raw.isErr() || !raw.value) return null;
  const task = parseStoredValue<PomodoroTask>(raw.value);
  if (task) return task;
  await clearPersistedPomodoroTask();
  return null;
};
