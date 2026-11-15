import type { ExtensionManifest } from 'orgnote-api';

export const orgAgendaManifest: ExtensionManifest = {
  name: 'Org Agenda',
  version: '0.0.1',
  category: 'extension',
  description: 'Agenda views for tasks, habits and pomodoro timer based on org-mode files',
  source: { type: 'builtin' },
  keywords: ['agenda', 'tasks', 'habits', 'pomodoro', 'org-mode'],
};
