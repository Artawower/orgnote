import type { ExtensionManifest } from 'orgnote-api';

export const randomNoteManifest: ExtensionManifest = {
  name: 'Random Note',
  version: '0.0.1',
  category: 'extension',
  description: 'Open random notes with optional full-text filtering',
  source: { type: 'builtin' },
  keywords: ['random', 'note', 'search', 'discovery', 'dice'],
};
