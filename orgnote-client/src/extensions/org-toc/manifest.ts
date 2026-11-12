import type { ExtensionManifest } from 'orgnote-api';

export const orgTocManifest: ExtensionManifest = {
  name: 'Org Table of Contents',
  version: '0.0.1',
  category: 'extension',
  description: 'Table of contents navigation for org-mode headlines',
  source: { type: 'builtin' },
  keywords: ['toc', 'headlines', 'navigation', 'outline'],
};
