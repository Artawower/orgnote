import { MINUTES_PER_HOUR } from '../constants';

const MILLISECONDS_PER_MINUTE = 60_000;
const START_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export interface AgendaTaskTime {
  hours: number;
  minutes: number;
  startTime?: string;
}

export interface AgendaTaskClockRange {
  startedAt: Date;
  endedAt: Date;
}

type TaskTimeUnit = string | number | undefined;

const parseTaskTimeUnit = (value: TaskTimeUnit): number | undefined => {
  const parsed = Number(value ?? 0);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return undefined;
  return parsed;
};

export const normalizeAgendaTaskTime = (
  hoursValue: TaskTimeUnit,
  minutesValue: TaskTimeUnit,
  startTimeValue?: string,
): AgendaTaskTime | undefined => {
  const hours = parseTaskTimeUnit(hoursValue);
  const minutes = parseTaskTimeUnit(minutesValue);
  const startTime = startTimeValue?.trim() || undefined;
  if (hours === undefined || minutes === undefined) return undefined;
  if (startTime && !START_TIME_PATTERN.test(startTime)) return undefined;
  if (minutes >= MINUTES_PER_HOUR) return undefined;
  const totalMinutes = hours * MINUTES_PER_HOUR + minutes;
  if (!Number.isSafeInteger(totalMinutes) || totalMinutes === 0) return undefined;
  if (!startTime) return { hours, minutes };
  return { hours, minutes, startTime };
};

const getDurationMilliseconds = (taskTime: AgendaTaskTime): number =>
  (taskTime.hours * MINUTES_PER_HOUR + taskTime.minutes) * MILLISECONDS_PER_MINUTE;

const getExplicitStart = (currentTime: Date, startTime: string): Date => {
  const [hours = 0, minutes = 0] = startTime.split(':').map(Number);
  const startedAt = new Date(currentTime);
  startedAt.setHours(hours, minutes, 0, 0);
  if (startedAt <= currentTime) return startedAt;
  startedAt.setDate(startedAt.getDate() - 1);
  return startedAt;
};

export const createAgendaTaskClockRange = (
  taskTime: AgendaTaskTime,
  currentTime: Date,
): AgendaTaskClockRange => {
  const duration = getDurationMilliseconds(taskTime);
  if (!taskTime.startTime) {
    return {
      startedAt: new Date(currentTime.getTime() - duration),
      endedAt: currentTime,
    };
  }
  const startedAt = getExplicitStart(currentTime, taskTime.startTime);
  return {
    startedAt,
    endedAt: new Date(startedAt.getTime() + duration),
  };
};
