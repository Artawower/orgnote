import type { OrgRepeater } from 'org-mode-ast';

export interface MiniEditorSchedule {
  date: string;
  to?: string;
  repeater?: OrgRepeater;
  warning?: OrgRepeater;
}

export interface MiniEditorSession {
  title: string;
  body: string;
  tags: string[];
  priority?: string;
  scheduled?: MiniEditorSchedule;
  isHabit?: boolean;
  bodyLoaded: boolean;
  fullSize: boolean;
}
