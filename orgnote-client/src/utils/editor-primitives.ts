import type { EditorView } from '@codemirror/view';
import type { SelectionRange } from '@codemirror/state';

export interface InsertTemplateOptions {
  template: string;
  focusOffset?: number;
  overrideLine?: boolean;
  wrapSelection?: 'inline' | 'block';
  selectionInsertOffset?: number;
  prependToLine?: boolean;
}

interface TextRange {
  from: number;
  to: number;
}

interface EditorContext {
  view: EditorView;
  selection: SelectionRange;
  selectedText: string;
  lineRange: TextRange;
}

const focusEditorAsync = (view: EditorView): void => {
  requestAnimationFrame(() => view.focus());
};

const hasSelection = (selection: SelectionRange): boolean => selection.from !== selection.to;

const createEditorContext = (view: EditorView): EditorContext => {
  const selection = view.state.selection.main;
  const line = view.state.doc.lineAt(selection.head);
  return {
    view,
    selection,
    selectedText: view.state.doc.sliceString(selection.from, selection.to),
    lineRange: { from: line.from, to: line.to },
  };
};

const dispatchChange = (
  view: EditorView,
  range: TextRange,
  text: string,
  anchor: number,
  head?: number,
): void => {
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: { anchor, head: head ?? anchor },
  });
  focusEditorAsync(view);
};

const handleInlineWrap = (ctx: EditorContext, template: string): void => {
  const wrapChar = template.slice(0, template.length / 2);
  const { selectedText, selection } = ctx;
  const wrappedText = `${wrapChar}${selectedText}${wrapChar}`;
  const selectStart = selection.from + wrapChar.length;
  const selectEnd = selectStart + selectedText.length;

  dispatchChange(
    ctx.view,
    { from: selection.from, to: selection.to },
    wrappedText,
    selectStart,
    selectEnd,
  );
};

const handlePrependToLine = (ctx: EditorContext, template: string): void => {
  const cursorPos = ctx.lineRange.to + template.length;
  dispatchChange(
    ctx.view,
    { from: ctx.lineRange.from, to: ctx.lineRange.from },
    template,
    cursorPos,
  );
};

const handleBlockWrap = (
  ctx: EditorContext,
  template: string,
  insertOffset: number,
  range: TextRange,
): void => {
  const before = template.slice(0, insertOffset);
  const after = template.slice(insertOffset);
  const text = `${before}${ctx.selectedText}${after}`;
  const selectStart = range.from + insertOffset;
  const selectEnd = selectStart + ctx.selectedText.length;

  dispatchChange(ctx.view, range, text, selectStart, selectEnd);
};

const handleDefaultInsert = (
  ctx: EditorContext,
  template: string,
  focusOffset: number | undefined,
  range: TextRange,
): void => {
  const cursorPos = range.from + (focusOffset ?? template.length);
  dispatchChange(ctx.view, range, template, cursorPos);
};

export const insertTemplate = (view: EditorView, options: InsertTemplateOptions): void => {
  const { template, overrideLine, wrapSelection, selectionInsertOffset, prependToLine } = options;
  const ctx = createEditorContext(view);
  const isTextSelected = hasSelection(ctx.selection);

  if (wrapSelection === 'inline' && isTextSelected) {
    handleInlineWrap(ctx, template);
    return;
  }

  if (prependToLine) {
    handlePrependToLine(ctx, template);
    return;
  }

  const range = overrideLine
    ? ctx.lineRange
    : { from: ctx.selection.from, to: ctx.selection.to };

  if (wrapSelection === 'block' && isTextSelected) {
    const insertOffset = selectionInsertOffset ?? options.focusOffset ?? 0;
    handleBlockWrap(ctx, template, insertOffset, range);
    return;
  }

  handleDefaultInsert(ctx, template, options.focusOffset, range);
};

export const insertText = (view: EditorView, text: string, position: number): void => {
  view.dispatch({
    changes: { from: position, to: position, insert: text },
    selection: { anchor: position + text.length },
  });
  focusEditorAsync(view);
};

export const deleteRange = (view: EditorView, from: number, to: number): void => {
  view.dispatch({
    changes: { from, to, insert: '' },
    selection: { anchor: from },
  });
  focusEditorAsync(view);
};

export const clearEditorContent = (view: EditorView): void => {
  if (!view.state.doc.length) return;
  deleteRange(view, 0, view.state.doc.length);
};

export const replaceRange = (view: EditorView, from: number, to: number, text: string): void => {
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  });
  focusEditorAsync(view);
};

export const moveCursorTo = (view: EditorView, position: number): void => {
  view.dispatch({
    selection: { anchor: position },
    scrollIntoView: true,
  });
  focusEditorAsync(view);
};

export const getCursorPosition = (view: EditorView): number =>
  view.state.selection.main.head;

export const getSelection = (view: EditorView): { from: number; to: number; text: string } => {
  const selection = view.state.selection.main;
  return {
    from: selection.from,
    to: selection.to,
    text: view.state.doc.sliceString(selection.from, selection.to),
  };
};

export const getCurrentLine = (view: EditorView): { from: number; to: number; text: string } => {
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  return {
    from: line.from,
    to: line.to,
    text: line.text,
  };
};

export const blurEditor = (view: EditorView): void => {
  view.contentDOM.blur();
};

export const focusEditor = (view: EditorView): void => {
  focusEditorAsync(view);
};

export const suspendEditorInput = (view: EditorView): void => {
  view.dom.setAttribute('inert', '');
  view.contentDOM.setAttribute('contenteditable', 'false');
};

export const resumeEditorInput = (view: EditorView): void => {
  view.dom.removeAttribute('inert');
  view.contentDOM.setAttribute('contenteditable', 'true');
}
