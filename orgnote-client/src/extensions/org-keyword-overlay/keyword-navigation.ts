import type { EditorExtension } from 'orgnote-api';
import { Prec } from '@codemirror/state';
import { keymap, type EditorView } from '@codemirror/view';
import {
  EMBEDDED_WIDGET_COMMAND,
  EMBEDDED_WIDGET_DIRECTION,
  getEmbeddedWidgetBridge,
} from 'src/utils/org-editor/embedded-widget-runtime';

const EDITOR_WIDGET_DELETE_SOURCE_ID = 'editor-widget-delete';

const isCollapsedSelection = (view: EditorView): boolean => view.state.selection.main.empty;

const lineOverlapsWidget = (
  view: EditorView,
  lineNumber: number,
  widgets: readonly { readonly range: { readonly from: number; readonly to: number } }[],
): boolean => {
  const lineFrom = view.state.doc.line(lineNumber).from;
  return widgets.some((widget) => widget.range.from <= lineFrom && lineFrom <= widget.range.to);
};

export const focusEmbeddedWidgetFromEditor = (view: EditorView, direction: -1 | 1): boolean => {
  if (!isCollapsedSelection(view)) return false;

  return getEmbeddedWidgetBridge(view).dispatch({
    type: EMBEDDED_WIDGET_COMMAND.FocusFromEditor,
    payload: {
      direction,
      position: direction > 0 ? 'start' : 'end',
    },
  });
};

interface PreviousWidgetLine {
  readonly number: number;
  readonly to: number;
}

const previousWidgetLine = (view: EditorView): PreviousWidgetLine | undefined => {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  if (head !== line.from || line.number <= 1) return undefined;

  const previousLineNumber = line.number - 1;
  const widgets = getEmbeddedWidgetBridge(view).snapshot();
  if (!lineOverlapsWidget(view, previousLineNumber, widgets)) return undefined;

  return { number: previousLineNumber, to: view.state.doc.line(previousLineNumber).to };
};

const focusWidgetBeforeLine = (view: EditorView, lineFrom: number, lineTo: number): boolean =>
  getEmbeddedWidgetBridge(view).dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Exit,
    payload: {
      sourceId: EDITOR_WIDGET_DELETE_SOURCE_ID,
      range: { from: lineFrom, to: lineTo },
      direction: EMBEDDED_WIDGET_DIRECTION.Previous,
      position: 'end',
    },
  });

const deleteEmptySeparatorLine = (
  view: EditorView,
  widgetLineTo: number,
  separatorLineFrom: number,
): void => {
  view.dispatch({
    changes: { from: widgetLineTo, to: separatorLineFrom },
    selection: { anchor: widgetLineTo },
    scrollIntoView: true,
  });
};

export const deleteTitleSeparatorFromEditor = (view: EditorView): boolean => {
  if (!isCollapsedSelection(view)) return false;

  const previousLine = previousWidgetLine(view);
  if (!previousLine) return false;

  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  const focused = focusWidgetBeforeLine(view, line.from, line.to);

  if (line.text.trim()) return focused;

  deleteEmptySeparatorLine(view, previousLine.to, line.from);
  return true;
};

export const keywordNavigationExtension: EditorExtension = () =>
  Prec.high(
    keymap.of([
      {
        key: 'ArrowDown',
        run: (view) => focusEmbeddedWidgetFromEditor(view, EMBEDDED_WIDGET_DIRECTION.Next),
      },
      {
        key: 'ArrowUp',
        run: (view) => focusEmbeddedWidgetFromEditor(view, EMBEDDED_WIDGET_DIRECTION.Previous),
      },
      {
        key: 'Backspace',
        run: deleteTitleSeparatorFromEditor,
      },
    ]),
  );
