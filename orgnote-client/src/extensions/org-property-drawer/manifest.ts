import type { ExtensionManifest } from 'orgnote-api';

export const orgPropertyDrawerManifest: ExtensionManifest = {
  name: 'Property drawer',
  description: 'Collapsible property drawer widget for editor',
  version: '0.0.1',
  category: 'extension',
  source: { type: 'builtin' },
  keywords: ['editor', 'widgets', 'properties'],
};
