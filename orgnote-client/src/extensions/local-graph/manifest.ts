import type { ExtensionManifest } from 'orgnote-api';

export const localGraphManifest: ExtensionManifest = {
  name: 'local-graph',
  version: '0.0.1',
  category: 'extension',
  description: 'Local graph of the current note neighbors in the sidebar',
  source: { type: 'builtin' },
  keywords: ['graph', 'backlinks', 'links', 'sidebar'],
};
