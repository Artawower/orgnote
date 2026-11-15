import type { ExtensionManifest } from 'orgnote-api';

export const orgImageManifest: ExtensionManifest = {
  name: 'Image preview',
  description: 'Render images from org links',
  version: '0.0.1',
  category: 'extension',
  source: { type: 'builtin' },
  keywords: ['editor', 'widgets', 'image', 'media'],
};
