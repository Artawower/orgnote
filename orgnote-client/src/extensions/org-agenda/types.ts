import type { FileTask } from 'orgnote-api';
import type { OrgRepeater } from 'org-mode-ast';

export interface AgendaTask extends FileTask {
  filePath: string;
}

export interface AgendaScheduleDraft {
  date: string;
  to?: string;
  repeater?: OrgRepeater;
  warning?: OrgRepeater;
}

export interface AgendaTaskDraft {
  title: string;
  body: string;
  tags: string[];
  priority?: string;
  scheduled?: AgendaScheduleDraft;
  isHabit?: boolean;
}

export interface WeekDayCompletion {
  date: string;
  dayLabel: string;
  isToday: boolean;
  completionLevel: 'none' | 'partial' | 'full';
  completionRatio: number;
}

export interface AgendaHabitView extends AgendaTask {
  fileTitle: string;
  totalDays: number;
  currentStreak: number;
  completedToday: boolean;
}
