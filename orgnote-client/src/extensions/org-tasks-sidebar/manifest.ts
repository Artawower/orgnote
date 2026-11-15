import type { ExtensionManifest } from 'orgnote-api';

export const orgTasksSidebarManifest: ExtensionManifest = {
  name: 'Org Tasks Sidebar',
  version: '0.0.1',
  category: 'extension',
  description: 'Browse indexed tasks grouped by file in the right sidebar',
  source: { type: 'builtin' },
  keywords: ['tasks', 'sidebar', 'todo', 'navigation'],
};
