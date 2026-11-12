import type { FontCategoryConfig, FontDefinition } from 'orgnote-api';

export const FONT_FAMILY_SYSTEM_UI =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

export const FONT_FAMILY_SERIF = 'Georgia, Cambria, "Times New Roman", Times, serif';

export const FONT_FAMILY_MONOSPACE =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export const FONT_FAMILY_MENLO = 'Menlo';

export const FONT_FAMILY_JETBRAINS_MONO = "'JetBrains Mono'";

export const DEFAULT_FONT_FAMILIES: FontCategoryConfig = {
  main: FONT_FAMILY_SYSTEM_UI,
  editor: FONT_FAMILY_MENLO,
  headline: FONT_FAMILY_SYSTEM_UI,
  code: FONT_FAMILY_JETBRAINS_MONO,
};

export const DEFAULT_FONTS: FontDefinition[] = [
  {
    id: 'system-ui',
    name: 'System UI',
    family: FONT_FAMILY_SYSTEM_UI,
  },
  {
    id: 'menlo',
    name: 'Menlo',
    family: FONT_FAMILY_MENLO,
  },
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    family: FONT_FAMILY_JETBRAINS_MONO,
  },
  {
    id: 'serif',
    name: 'Serif',
    family: FONT_FAMILY_SERIF,
  },
  {
    id: 'monospace',
    name: 'Monospace',
    family: FONT_FAMILY_MONOSPACE,
  },
];
