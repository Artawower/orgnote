import type { ChangeSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { NodeType, OrgNode } from 'org-mode-ast';

export type EmbeddedWidget = {
  destroy: () => void;
  refresh?: (...args: unknown[]) => void;
};
export interface WidgetBuilderParams {
  wrap: HTMLElement;
  orgNode: OrgNode;
  rootNodeSrc: () => OrgNode;
  onUpdateFn?: (newVal: string) => void;
  editorView: EditorView;
  readonly?: boolean;
}
export type WidgetBuilder = (params: WidgetBuilderParams) => EmbeddedWidget;
export interface CommonEmbeddedWidget {
  satisfied?: (orgNode: OrgNode) => boolean;
  widgetBuilder?: WidgetBuilder;
  viewUpdater?: (orgNode: OrgNode, newVal: string) => ViewUpdateSchema;
  ignoreEvent?: boolean;
  showRangeOffset?: [number, number];
}
export interface MultilineEmbeddedWidget extends CommonEmbeddedWidget {
  widgetBuilder: WidgetBuilder;
  suppressEdit?: boolean;
}
export type MultilineEmbeddedWidgets = {
  [key in NodeType]?: MultilineEmbeddedWidget;
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
  [key in NodeType]?: InlineEmbeddedWidget;
};
export type EmbeddedWidgetBuilder = (
  wrap: HTMLElement,
  dynamicProps?: {
    [key: string]: unknown;
  }
) => EmbeddedWidget;
