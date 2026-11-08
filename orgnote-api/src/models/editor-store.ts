import type { ComputedRef, ShallowRef } from 'vue';
import type { EditorView } from '@codemirror/view';
import type { OrgNode } from 'org-mode-ast';
import type {
  InlineEmbeddedWidgets,
  MultilineEmbeddedWidgets,
  OrgLineClasses,
} from './widget';
import type { EditorExtension } from './editor';
import type { WidgetMeta } from '../api';
import type { StoreDefinition } from './store';
import type { ActiveEditorContext } from './active-editor-context';
import type { OrgDocument } from '../utils/org-edit/types';

export interface ActiveDocumentEditContext extends ActiveEditorContext {
  readonly doc: OrgDocument;
  readonly root: OrgNode;
  readonly view: EditorView;
}

export interface ActiveDocumentEditOptions {
  readonly preserveSelection?: boolean;
  readonly scrollIntoView?: boolean;
}

export interface EditorStore {
  inlineWidgets: ComputedRef<InlineEmbeddedWidgets>;
  multilineWidgets: ComputedRef<MultilineEmbeddedWidgets>;
  lineClasses: ComputedRef<OrgLineClasses>;
  extensions: ShallowRef<EditorExtension[]>;

  activeContext: ShallowRef<ActiveEditorContext | null>;

  addWidgets: (...widgets: WidgetMeta[]) => void;
  removeWidget: (widgetId: string) => void;
  addExtensions: (...extensions: EditorExtension[]) => void;
  removeExtensions: (...extensions: EditorExtension[]) => void;

  selection: ComputedRef<string>;
  hasSelection: ComputedRef<boolean>;

  editActiveDocument: (
    mutate: (ctx: ActiveDocumentEditContext) => void,
    options?: ActiveDocumentEditOptions
  ) => boolean;
  setActiveContext: (ctx: Partial<ActiveEditorContext>) => void;
  updateActiveContext: (ctx: Partial<ActiveEditorContext>) => void;
  clearActiveContext: () => void;
}

export type EditorStoreDefinition = StoreDefinition<EditorStore>;
