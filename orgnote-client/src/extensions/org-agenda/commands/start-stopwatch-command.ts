import type { Command } from 'orgnote-api';
import { AGENDA_POMODORO_START_STOPWATCH_COMMAND } from '../constants';
import { usePomodoroStore } from '../stores/pomodoro-store';
import { createStartSessionHandler } from './start-session';

export const startStopwatchCommand: Command = {
  command: AGENDA_POMODORO_START_STOPWATCH_COMMAND,
  group: 'agenda',
  icon: 'sym_o_hourglass_empty',
  disabled: () => usePomodoroStore().isTransitioning,
  handler: createStartSessionHandler(() => 'stopwatch'),
};
