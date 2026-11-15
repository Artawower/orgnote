import type { Command } from 'orgnote-api';
import { AGENDA_POMODORO_START_COMMAND } from '../constants';
import { usePomodoroStore } from '../stores/pomodoro-store';
import { createStartSessionHandler } from './start-session';

export const startPomodoroCommand: Command = {
  command: AGENDA_POMODORO_START_COMMAND,
  group: 'agenda',
  icon: 'sym_o_timer',
  disabled: () => usePomodoroStore().isTransitioning,
  handler: createStartSessionHandler(() => 'pomo'),
};
