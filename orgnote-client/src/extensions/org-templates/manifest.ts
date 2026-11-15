import type { ExtensionManifest } from 'orgnote-api';

export const orgTemplatesManifest: ExtensionManifest = {
  name: 'Org Templates',
  version: '0.0.1',
  category: 'extension',
  description: 'Create org notes from vault-local templates',
  source: { type: 'builtin' },
  keywords: ['templates', 'notes', 'org-mode'],
};
