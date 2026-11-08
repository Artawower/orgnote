import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ORG_PRIORITY_LETTERS } from 'src/constants/org-mode';

export const orgSelectionTheme = EditorView.theme({
  '.cm-selectionBackground, &.cm-focused .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'var(--editor-selection-bg) !important',
  },
  '.cm-content ::selection, .cm-line::selection, .cm-line *::selection': {
    backgroundColor: 'var(--editor-selection-bg) !important',
    color: 'var(--editor-selection-fg) !important',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'color-mix(in srgb, var(--editor-selection-bg) 40%, transparent)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--editor-cursor-color) !important',
    borderLeftWidth: 'var(--editor-cursor-width) !important',
  },
});

export const orgInlineBulletStyle = EditorView.baseTheme({
  '.org-list-bullet-inline': {
    display: 'inline',
    color: 'var(--fg-muted)',
    marginRight: '0.3em',
  },
});

export const orgMultilineTheme: Extension = EditorView.theme({
  '&': {
    minHeight: 'var(--org-inline-min-height, 60px)',
    maxHeight: 'var(--org-inline-max-height, 200px)',
    overflow: 'auto',
  },
});

export const orgInlineModeTheme: Extension = EditorView.theme({
  '&': { color: 'var(--fg)', outline: 'none' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { caretColor: 'var(--accent)' },
  '.cm-placeholder': { color: 'var(--fg-muted)' },
  '.cm-headline-warning': { textDecoration: 'underline wavy var(--red)' },
});

export const orgSingleLineTheme: Extension = EditorView.theme({
  '&': { maxHeight: 'none !important', overflow: 'hidden' },
  '.cm-scroller': { overflow: 'hidden' },
  '.cm-content': { whiteSpace: 'nowrap' },
});

export const orgEditorTheme: Extension = [
  orgSelectionTheme,
  EditorView.theme({
    '&': {
      background: 'transparent !important',
      fontFamily: 'inherit',
      fontSize: 'inherit',
    },
    '.cm-scroller': {
      fontFamily: 'inherit',
      fontSize: 'inherit',
    },
    '.cm-content': {
      fontFamily: 'inherit',
      fontSize: 'inherit',
      padding: '0 !important',
    },
    '.cm-line': {
      padding: '0 !important',
      fontFamily: 'inherit',
      fontSize: 'inherit',
    },
    '.org-link': {
      color: 'var(--accent)',
      textDecoration: 'underline',
      cursor: 'pointer',
    },
    ...Object.fromEntries(
      ORG_PRIORITY_LETTERS.map((l) => [
        `.org-priority-${l.toLowerCase()}`,
        {
          color: `var(--priority-${l.toLowerCase()})`,
          fontWeight: 'var(--font-weight-medium)',
          cursor: 'pointer',
        },
      ]),
    ),
  }),
];
