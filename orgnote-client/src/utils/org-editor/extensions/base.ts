import { keymap } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

export interface BaseEditorExtensionsOptions {
  onContentUpdate?: (content: string) => void;
}

const createUpdateListener = (onUpdate: (content: string) => void): Extension =>
  EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    onUpdate(update.state.doc.toString());
  });

export const createBaseEditorExtensions = (opts: BaseEditorExtensionsOptions = {}): Extension[] => [
  history(),
  bracketMatching(),
  closeBrackets(),
  keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
  ...(opts.onContentUpdate ? [createUpdateListener(opts.onContentUpdate)] : []),
];
