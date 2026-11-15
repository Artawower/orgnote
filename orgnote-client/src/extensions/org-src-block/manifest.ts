import type { ExtensionManifest } from 'orgnote-api';

export const orgSrcBlockManifest: ExtensionManifest = {
  name: 'Src block',
  description: 'Multiline widget for displaying SRC blocks with syntax highlighting',
  version: '0.0.1',
  category: 'extension',
  source: { type: 'builtin' },
  keywords: ['editor', 'widgets', 'code', 'syntax'],
};
