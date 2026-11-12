import type { OrgDate, ClockEntry } from 'org-mode-ast';

export interface FileMetaFilter {
  limit?: number;
  offset?: number;
  tags?: string[];
}

export type OrgPriority = string;

export type FileTaskKind =
  | 'list-checkbox'
  | 'headline-checkbox'
  | 'headline-todo';

export type FileTaskState = 'todo' | 'done';

export interface FileTask {
  id: string;
  kind: FileTaskKind;
  state: FileTaskState;
  text: string;
  start?: number;
  end?: number;
  priority?: OrgPriority;
  tags?: string[];
  todoKeyword?: string;
  scheduled?: OrgDate;
  deadline?: OrgDate;
  closed?: OrgDate;
  clocks?: ClockEntry[];
  lastDoneAt?: string;
  doneDates?: string[];
  isHabit?: boolean;
}

export interface FileMeta {
  id: string;
  filePath: string[];
  title?: string;
  description?: string;
  tags?: string[];
  links?: string[];
  backlinks?: string[];
  tasks?: FileTask[];
  createdAt?: string;
  updatedAt?: string;
  touchedAt?: string;
  deletedAt?: string;
}
