import type { EditorView } from '@codemirror/view';

export const EMBEDDED_WIDGET_COMMAND = {
  Focus: 'focus',
  FocusAdjacent: 'focus-adjacent',
  FocusFromEditor: 'focus-from-editor',
  Exit: 'exit',
} as const;

export const EMBEDDED_WIDGET_DIRECTION = {
  Previous: -1,
  Next: 1,
} as const;

export type EmbeddedWidgetFocusPosition = 'start' | 'end';
export type EmbeddedWidgetDirection =
  (typeof EMBEDDED_WIDGET_DIRECTION)[keyof typeof EMBEDDED_WIDGET_DIRECTION];

export interface EmbeddedWidgetRange {
  readonly from: number;
  readonly to: number;
}

export interface EmbeddedWidgetFocusRequest {
  readonly position: EmbeddedWidgetFocusPosition;
}

export interface EmbeddedWidgetHandle {
  readonly id: string;
  readonly priority?: number;
  getRange: () => EmbeddedWidgetRange;
  focus: (request: EmbeddedWidgetFocusRequest) => boolean;
}

export interface EmbeddedWidgetSnapshot {
  readonly id: string;
  readonly range: EmbeddedWidgetRange;
  readonly priority: number;
}

export interface EmbeddedWidgetNavigationPayload {
  readonly sourceId?: string;
  readonly range?: EmbeddedWidgetRange;
  readonly direction: EmbeddedWidgetDirection;
  readonly position?: EmbeddedWidgetFocusPosition;
}

export interface EmbeddedWidgetEditorPayload {
  readonly direction: EmbeddedWidgetDirection;
  readonly position?: EmbeddedWidgetFocusPosition;
}

export interface EmbeddedWidgetFocusPayload {
  readonly id: string;
  readonly position?: EmbeddedWidgetFocusPosition;
}

export type EmbeddedWidgetCommand =
  | {
      readonly type: typeof EMBEDDED_WIDGET_COMMAND.Focus;
      readonly payload: EmbeddedWidgetFocusPayload;
    }
  | {
      readonly type: typeof EMBEDDED_WIDGET_COMMAND.FocusAdjacent;
      readonly payload: EmbeddedWidgetNavigationPayload;
    }
  | {
      readonly type: typeof EMBEDDED_WIDGET_COMMAND.FocusFromEditor;
      readonly payload: EmbeddedWidgetEditorPayload;
    }
  | {
      readonly type: typeof EMBEDDED_WIDGET_COMMAND.Exit;
      readonly payload: EmbeddedWidgetNavigationPayload;
    };

export interface EmbeddedWidgetBridge {
  register: (handle: EmbeddedWidgetHandle) => () => void;
  dispatch: (command: EmbeddedWidgetCommand) => boolean;
  snapshot: () => EmbeddedWidgetSnapshot[];
}

export interface EmbeddedWidgetBridgeHost {
  readonly view: EditorView;
}
