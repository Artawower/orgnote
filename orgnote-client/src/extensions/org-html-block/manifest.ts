import type { ExtensionManifest } from 'orgnote-api';

export const orgHtmlBlockManifest: ExtensionManifest = {
  name: 'HTML block',
  description: 'Preview HTML blocks in editor',
  version: '0.0.1',
  category: 'extension',
  source: { type: 'builtin' },
  keywords: ['editor', 'widgets', 'html'],
};
