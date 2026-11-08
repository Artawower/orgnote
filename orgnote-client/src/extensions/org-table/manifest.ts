import type { ExtensionManifest } from 'orgnote-api';

export const orgTableManifest: ExtensionManifest = {
  name: 'Table',
  description: 'Render org-mode tables.',
  version: '0.0.1',
  category: 'extension',
  source: { type: 'builtin' },
  keywords: ['editor', 'widgets', 'table'],
};
