import type { ExtensionManifest } from 'orgnote-api';

export const orgFoldingManifest: ExtensionManifest = {
  name: 'Org Folding',
  version: '1.0.0',
  category: 'extension',
  description: 'Folding support for org-mode headlines with #+STARTUP options',
  source: { type: 'builtin' },
  keywords: ['folding', 'headlines', 'collapse', 'expand'],
};
