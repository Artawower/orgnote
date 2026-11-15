import type { OrgNode } from 'org-mode-ast';
import type { EditorView } from '@codemirror/view';

export interface ActiveEditorContext {
  orgNode: OrgNode | null;
  cursorPosition: number;
  selection: string;
  editorViewGetter: () => EditorView | undefined;
  filePath?: string;
  focused: boolean;
}
