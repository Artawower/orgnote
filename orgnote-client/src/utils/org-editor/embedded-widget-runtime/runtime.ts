import type { EditorView } from '@codemirror/view';
import {
  EMBEDDED_WIDGET_COMMAND,
  type EmbeddedWidgetBridge,
  type EmbeddedWidgetCommand,
  type EmbeddedWidgetDirection,
  type EmbeddedWidgetEditorPayload,
  type EmbeddedWidgetFocusPayload,
  type EmbeddedWidgetFocusPosition,
  type EmbeddedWidgetHandle,
  type EmbeddedWidgetNavigationPayload,
  type EmbeddedWidgetRange,
  type EmbeddedWidgetSnapshot,
} from './types';

const DEFAULT_PRIORITY = 0;
const NEWLINE = '\n';

const bridges = new WeakMap<EditorView, EmbeddedWidgetBridge>();

interface ResolvedNavigationPayload {
  readonly sourceId?: string;
  readonly range?: EmbeddedWidgetRange;
  readonly direction: EmbeddedWidgetDirection;
  readonly position: EmbeddedWidgetFocusPosition;
}

interface EmbeddedWidgetEntry {
  readonly handle: EmbeddedWidgetHandle;
  readonly snapshot: EmbeddedWidgetSnapshot;
}

const defaultPosition = (direction: EmbeddedWidgetDirection): EmbeddedWidgetFocusPosition => {
  if (direction > 0) return 'start';
  return 'end';
};

const resolveNavigationPayload = (
  payload: EmbeddedWidgetNavigationPayload,
): ResolvedNavigationPayload => ({
  ...payload,
  position: payload.position ?? defaultPosition(payload.direction),
});

const resolveEditorPayload = (payload: EmbeddedWidgetEditorPayload): ResolvedNavigationPayload => ({
  direction: payload.direction,
  position: payload.position ?? defaultPosition(payload.direction),
});

const containsLine = (range: EmbeddedWidgetRange, lineFrom: number): boolean =>
  range.from <= lineFrom && lineFrom <= range.to;

const byDocumentOrder = (left: EmbeddedWidgetSnapshot, right: EmbeddedWidgetSnapshot): number => {
  if (left.range.from !== right.range.from) return left.range.from - right.range.from;
  return left.priority - right.priority;
};

const byPreviousAdjacentOrder = (left: EmbeddedWidgetEntry, right: EmbeddedWidgetEntry): number => {
  if (left.snapshot.range.from !== right.snapshot.range.from) {
    return right.snapshot.range.from - left.snapshot.range.from;
  }

  return left.snapshot.priority - right.snapshot.priority;
};

const byNextAdjacentOrder = (left: EmbeddedWidgetEntry, right: EmbeddedWidgetEntry): number =>
  byDocumentOrder(left.snapshot, right.snapshot);

const byAdjacentOrder = (direction: EmbeddedWidgetDirection) => {
  if (direction > 0) return byNextAdjacentOrder;
  return byPreviousAdjacentOrder;
};

const isAdjacentRange = (
  sourceRange: EmbeddedWidgetRange,
  targetRange: EmbeddedWidgetRange,
  direction: EmbeddedWidgetDirection,
): boolean => {
  if (direction > 0) return targetRange.from > sourceRange.from;
  return targetRange.from < sourceRange.from;
};

const createEmbeddedWidgetBridge = (view: EditorView): EmbeddedWidgetBridge => {
  const handles = new Map<string, EmbeddedWidgetHandle>();

  const toSnapshot = (handle: EmbeddedWidgetHandle): EmbeddedWidgetSnapshot => ({
    id: handle.id,
    range: handle.getRange(),
    priority: handle.priority ?? DEFAULT_PRIORITY,
  });

  const toEntry = (handle: EmbeddedWidgetHandle): EmbeddedWidgetEntry => ({
    handle,
    snapshot: toSnapshot(handle),
  });

  const sortedEntries = (excludedId?: string): EmbeddedWidgetEntry[] =>
    Array.from(handles.values())
      .flatMap((handle) => {
        if (handle.id === excludedId) return [];
        return [toEntry(handle)];
      })
      .sort((left, right) => byDocumentOrder(left.snapshot, right.snapshot));

  const snapshot = (): EmbeddedWidgetSnapshot[] => sortedEntries().map((entry) => entry.snapshot);

  const getCommandRange = (command: ResolvedNavigationPayload): EmbeddedWidgetRange | undefined => {
    if (command.range) return command.range;
    if (!command.sourceId) return undefined;
    return handles.get(command.sourceId)?.getRange();
  };

  const findAdjacentEntry = (
    sourceRange: EmbeddedWidgetRange,
    direction: EmbeddedWidgetDirection,
    sourceId?: string,
  ): EmbeddedWidgetEntry | undefined =>
    sortedEntries(sourceId)
      .filter((entry) => isAdjacentRange(sourceRange, entry.snapshot.range, direction))
      .sort(byAdjacentOrder(direction))
      .at(0);

  const firstEditorLineNumber = (direction: EmbeddedWidgetDirection): number => {
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    if (direction > 0 && head < line.to) return line.number;
    return line.number + direction;
  };

  const targetEditorLineFrom = (direction: EmbeddedWidgetDirection): number | undefined => {
    const lineNumber = firstEditorLineNumber(direction);
    if (lineNumber < 1 || lineNumber > view.state.doc.lines) return undefined;
    return view.state.doc.line(lineNumber).from;
  };

  const adjacentLineNumberAroundRange = (
    range: EmbeddedWidgetRange,
    direction: EmbeddedWidgetDirection,
  ): number | undefined => {
    const position = direction > 0 ? range.to : range.from;
    const lineNumber = view.state.doc.lineAt(position).number + direction;
    if (lineNumber < 1 || lineNumber > view.state.doc.lines) return undefined;
    return lineNumber;
  };

  const editorAnchorAtLine = (lineNumber: number, direction: EmbeddedWidgetDirection): number => {
    const line = view.state.doc.line(lineNumber);
    return direction > 0 ? line.from : line.to;
  };

  const appendLineAfterRange = (range: EmbeddedWidgetRange): void => {
    const changes = view.state.changes({ from: range.to, to: range.to, insert: NEWLINE });
    const anchor = changes.mapPos(range.to, 1);
    view.dispatch({ changes, selection: { anchor }, scrollIntoView: true });
    view.focus();
  };

  const focusEditorAtLine = (lineNumber: number, direction: EmbeddedWidgetDirection): void => {
    const anchor = editorAnchorAtLine(lineNumber, direction);
    view.dispatch({ selection: { anchor }, scrollIntoView: true });
    view.focus();
  };

  const focusEditorAroundRange = (
    range: EmbeddedWidgetRange,
    direction: EmbeddedWidgetDirection,
  ): boolean => {
    if (direction > 0 && range.to >= view.state.doc.length) {
      appendLineAfterRange(range);
      return true;
    }

    const lineNumber = adjacentLineNumberAroundRange(range, direction);
    if (lineNumber === undefined) return false;

    focusEditorAtLine(lineNumber, direction);
    return true;
  };

  const focusAdjacent = (command: ResolvedNavigationPayload): boolean => {
    const sourceRange = getCommandRange(command);
    if (!sourceRange) return false;

    const target = findAdjacentEntry(sourceRange, command.direction, command.sourceId);
    return target?.handle.focus({ position: command.position }) ?? false;
  };

  const focusFromEditor = (command: ResolvedNavigationPayload): boolean => {
    const targetLineFrom = targetEditorLineFrom(command.direction);
    if (targetLineFrom === undefined) return false;
    const target = sortedEntries().find((entry) =>
      containsLine(entry.snapshot.range, targetLineFrom),
    );
    return target?.handle.focus({ position: command.position }) ?? false;
  };

  const findEntryAtLine = (
    lineNumber: number,
    sourceId?: string,
  ): EmbeddedWidgetEntry | undefined => {
    const lineFrom = view.state.doc.line(lineNumber).from;
    return sortedEntries(sourceId).find((entry) => containsLine(entry.snapshot.range, lineFrom));
  };

  const focusExitTarget = (command: ResolvedNavigationPayload): boolean => {
    const sourceRange = getCommandRange(command);
    if (!sourceRange) return false;

    const lineNumber = adjacentLineNumberAroundRange(sourceRange, command.direction);
    if (lineNumber === undefined) return focusEditorAroundRange(sourceRange, command.direction);

    const target = findEntryAtLine(lineNumber, command.sourceId);
    if (target) return target.handle.focus({ position: command.position });

    focusEditorAtLine(lineNumber, command.direction);
    return true;
  };

  const exitWidget = (command: ResolvedNavigationPayload): boolean => focusExitTarget(command);

  const focusById = (command: EmbeddedWidgetFocusPayload): boolean => {
    const handle = handles.get(command.id);
    return handle?.focus({ position: command.position ?? 'end' }) ?? false;
  };

  const dispatch = (command: EmbeddedWidgetCommand): boolean => {
    if (command.type === EMBEDDED_WIDGET_COMMAND.Focus) return focusById(command.payload);
    if (command.type === EMBEDDED_WIDGET_COMMAND.FocusAdjacent) {
      return focusAdjacent(resolveNavigationPayload(command.payload));
    }
    if (command.type === EMBEDDED_WIDGET_COMMAND.FocusFromEditor) {
      return focusFromEditor(resolveEditorPayload(command.payload));
    }
    return exitWidget(resolveNavigationPayload(command.payload));
  };

  const register = (handle: EmbeddedWidgetHandle): (() => void) => {
    handles.set(handle.id, handle);

    return () => {
      const current = handles.get(handle.id);
      if (current === handle) handles.delete(handle.id);
    };
  };

  return {
    register,
    dispatch,
    snapshot,
  };
};

export const getEmbeddedWidgetBridge = (view: EditorView): EmbeddedWidgetBridge => {
  const bridge = bridges.get(view);
  if (bridge) return bridge;

  const nextBridge = createEmbeddedWidgetBridge(view);
  bridges.set(view, nextBridge);
  return nextBridge;
};
