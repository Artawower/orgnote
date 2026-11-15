import type { ExtensionManifest } from 'orgnote-api';

export const orgInlineMarkupManifest: ExtensionManifest = {
  name: 'Inline markup',
  description: 'Bundle of predefined inline markup widgets for editor.',
  version: '0.0.1',
  category: 'extension',
  source: { type: 'builtin' },
  keywords: ['editor', 'widgets'],
};
