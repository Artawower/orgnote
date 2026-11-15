import type { ExtensionManifest } from 'orgnote-api';

export const commandHistoryManifest: ExtensionManifest = {
  name: 'Command History',
  version: '0.0.1',
  category: 'extension',
  description: 'Sorts commands by recent usage in command palette',
  source: { type: 'builtin' },
  keywords: ['commands', 'history', 'recent', 'palette'],
};
