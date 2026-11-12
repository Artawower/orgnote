import type { ExtensionManifest } from 'orgnote-api';

export const orgQuoteBlockManifest: ExtensionManifest = {
  name: 'Quote block',
  description: 'Pretty quote block multiline widget for editor',
  version: '0.0.1',
  category: 'extension',
  source: { type: 'builtin' },
  keywords: ['editor', 'widgets', 'quote'],
};
