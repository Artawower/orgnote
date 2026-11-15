import type { OrgNode } from 'org-mode-ast';
import type { Component } from 'vue';
import type { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { InlineEmbeddedWidget } from './widget';

interface DynamicComponent {
  mount: (
    cmp: Component,
    wrap: Element,
    props?: { [key: string]: unknown }
  ) => {
    destroy: () => void;
    refresh: (...args: unknown[]) => void;
  };
}

export interface EditorExtensionParams {
  orgNodeGetter: () => OrgNode | null;
  readonly: boolean;
  showSpecialSymbols?: boolean;
  dynamicComponent: DynamicComponent;
  foldWidget?: InlineEmbeddedWidget;
  editorViewGetter: () => EditorView | undefined;
}

export type EditorExtension = (params: EditorExtensionParams) => Extension;
