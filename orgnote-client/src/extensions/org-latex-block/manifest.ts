import type { ExtensionManifest } from 'orgnote-api';

export const orgLatexBlockManifest: ExtensionManifest = {
  name: 'Latex blocks',
  description: 'Render LaTeX blocks and environments with KaTeX',
  version: '0.0.1',
  category: 'extension',
  source: { type: 'builtin' },
  keywords: ['editor', 'widgets', 'latex', 'math'],
};
