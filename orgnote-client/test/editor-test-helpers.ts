import type { EditorView } from '@codemirror/view';
import { vi } from 'vitest';

export interface MockDispatchCall {
  changes?: { from: number; to: number; insert: string };
  selection?: { anchor: number; head?: number };
}

export interface MockViewResult {
  view: EditorView;
  dispatchCalls: MockDispatchCall[];
}

interface LineInfo {
  from: number;
  to: number;
  number: number;
  text: string;
}

const createLineAt = (doc: string, pos: number): LineInfo => {
  const lines = doc.split('\n');
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const end = start + line.length;
    if (pos <= end) {
      return { from: start, to: end, number: i + 1, text: line };
    }
    start = end + 1;
  }
  return { from: 0, to: doc.length, number: 1, text: doc };
};

export const createMockView = (
  doc: string,
  cursorPos: number,
  selectionEnd?: number,
): MockViewResult => {
  const dispatchCalls: MockDispatchCall[] = [];

  const view = {
    state: {
      doc: {
        sliceString: (from: number, to: number) => doc.slice(from, to),
        lineAt: (pos: number) => createLineAt(doc, pos),
      },
      selection: {
        main: {
          from: cursorPos,
          to: selectionEnd ?? cursorPos,
          head: selectionEnd ?? cursorPos,
        },
      },
    },
    dispatch: (transaction: MockDispatchCall) => {
      dispatchCalls.push(transaction);
    },
    focus: vi.fn(),
  } as unknown as EditorView;

  return { view, dispatchCalls };
};

export const createMinimalMockView = (): MockViewResult => {
  const dispatchCalls: MockDispatchCall[] = [];

  const view = {
    dispatch: (transaction: MockDispatchCall) => {
      dispatchCalls.push(transaction);
    },
    focus: vi.fn(),
  } as unknown as EditorView;

  return { view, dispatchCalls };
};

export const getDispatchCall = (
  calls: MockDispatchCall[],
  index: number,
): MockDispatchCall => {
  const call = calls[index];
  if (!call) {
    throw new Error(`No dispatch call at index ${index}`);
  }
  return call;
};
