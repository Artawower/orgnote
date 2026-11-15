import type { ExtensionManifest } from 'orgnote-api';

export const orgSmartEditingManifest: ExtensionManifest = {
  name: 'Smart editing',
  description:
    'Smart Enter handling (auto-continue lists, exit blocks) and auto-pair markup symbols (*, /, =, ~, +, [)',
  version: '0.0.1',
  category: 'extension',
  source: { type: 'builtin' },
  keywords: ['editor', 'editing', 'lists', 'blocks', 'markup', 'pairs'],
};
