import type { ChangeSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { NodeType, OrgNode } from 'org-mode-ast';
import type { Component } from 'vue';

export type EmbeddedWidget = {
  destroy: () => void;
  refresh?: (...args: unknown[]) => void;
};

export interface WidgetBuilderParams<TEditorView = EditorView> {
  wrap: HTMLElement;
  orgNode: OrgNode;
  orgNodeGetter?: () => OrgNode;
  rootNodeSrc: () => OrgNode | null;
  onUpdateFn?: (newVal: string) => void;
  onEditMode?: () => void;
  editorView: TEditorView;
  readonly?: boolean;
  suppressEdit?: boolean;
}

export type WidgetBuilder = (params: WidgetBuilderParams) => EmbeddedWidget;

export interface WidgetRange {
  from: number;
  to: number;
}

export interface CommonEmbeddedWidget {
  id: string;
  satisfied?: (orgNode: OrgNode) => boolean;
  widgetBuilder?: WidgetBuilder;
  component?: Component;
  componentProps?: Record<string, unknown>;
  viewUpdater?: (orgNode: OrgNode, newVal: string) => ViewUpdateSchema;
  ignoreEvent?: boolean;
  showRangeOffset?: [number, number];
  rangeBuilder?: (orgNode: OrgNode, docLength: number) => WidgetRange;
  editPositionBuilder?: (orgNode: OrgNode, docLength: number) => number;
  hideOnActiveLine?: boolean;
  showEditAction?: boolean;
  priority?: number;
}

export interface MultilineEmbeddedWidget extends CommonEmbeddedWidget {
  widgetBuilder?: WidgetBuilder;
  component?: Component;
  actionsComponent?: Component;
  actionsComponentProps?: Record<string, unknown>;
  suppressEdit?: boolean;
}

export type MultilineEmbeddedWidgets = {
  [key in NodeType]?: MultilineEmbeddedWidget[];
};

export type ViewUpdateSchema = ChangeSpec;

export interface InlineEmbeddedWidget extends CommonEmbeddedWidget {
  classBuilder?: (orgNode: OrgNode) => string;
  decorationType: 'mark' | 'widget' | 'replace' | 'line';
  ignoreEditing?: boolean;
  side?: number;
  wrapComponent?: string;
  inclusive?: boolean;
}

export type InlineEmbeddedWidgets = {
  [key in NodeType]?: InlineEmbeddedWidget[];
};

export type LineAttributes = Record<string, string>;

export interface OrgLineClass {
  id: string;
  class: string | ((orgNode: OrgNode) => string);
  attributes?: LineAttributes | ((orgNode: OrgNode) => LineAttributes | undefined);
  priority?: number;
}

export type OrgLineClasses = { [key in NodeType]?: OrgLineClass[] };
