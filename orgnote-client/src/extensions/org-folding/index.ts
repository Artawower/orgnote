import type { Extension, EditorExtension, EditorExtensionParams } from 'orgnote-api';
import { Prec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import {
  Decoration,
  keymap,
  ViewPlugin,
  WidgetType as CMWidgetType,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { codeFolding, foldKeymap, foldAll, unfoldAll } from '@codemirror/language';

import { collectHeadlines, type HeadlineInfo } from './startup-options';
import { applyStartupFolding, toggleFoldAtCursor } from './fold-commands';
import HeadlineFoldTrigger from './HeadlineFoldTrigger.vue';
import styles from './styles.css?raw';
import type { DynamicComponentInstance } from 'src/utils/dynamic-component';

class FoldTriggerWidget extends CMWidgetType {
  private instance: DynamicComponentInstance | null = null;

  constructor(
    private readonly headline: HeadlineInfo,
    private readonly editorView: EditorView,
    private readonly mount: EditorExtensionParams['dynamicComponent']['mount'],
  ) {
    super();
  }

  override toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'headline-fold-trigger-wrap';

    this.instance = this.mount(HeadlineFoldTrigger, wrap, {
      headline: this.headline,
      editorView: this.editorView,
    });

    return wrap;
  }

  override destroy(): void {
    this.instance?.destroy();
  }

  override eq(other: FoldTriggerWidget): boolean {
    return (
      other.headline.start === this.headline.start &&
      other.headline.end === this.headline.end
    );
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

const createFoldWidgetPlugin = (params: EditorExtensionParams) => {
  const buildDecorations = (view: EditorView): DecorationSet => {
    const root = params.orgNodeGetter();
    if (!root) return Decoration.none;

    const headlines = collectHeadlines(root);
    if (headlines.length === 0) return Decoration.none;

    return Decoration.set(
      headlines.map((headline) =>
        Decoration.widget({
          widget: new FoldTriggerWidget(
            headline,
            view,
            params.dynamicComponent.mount,
          ),
          side: -1,
        }).range(headline.start),
      ),
    );
  };

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: { view: EditorView; docChanged: boolean }) {
        if (update.docChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
};

const createFoldingKeymap = (params: EditorExtensionParams) => {
  const getOrgNode = params.orgNodeGetter;

  return [
    ...foldKeymap,
    {
      key: 'Tab',
      run: (view: EditorView) => {
        const root = getOrgNode();
        if (!root) return false;

        const headlines = collectHeadlines(root);
        return toggleFoldAtCursor(view, headlines);
      },
    },
    {
      key: 'Shift-Tab',
      run: (view: EditorView) => {
        foldAll(view);
        return true;
      },
    },
    {
      key: 'Mod-Shift-Tab',
      run: (view: EditorView) => {
        unfoldAll(view);
        return true;
      },
    },
  ];
};

const createInitialFoldingPlugin = (params: EditorExtensionParams) =>
  ViewPlugin.define((view) => {
    let applied = false;

    const applyInitialFolding = () => {
      if (applied) return;

      const root = params.orgNodeGetter();
      if (!root) return;

      applied = true;
      queueMicrotask(() => applyStartupFolding(view, root));
    };

    queueMicrotask(applyInitialFolding);

    return {
      update: () => {
        if (!applied) {
          queueMicrotask(applyInitialFolding);
        }
      },
    };
  });

const foldingExtension: EditorExtension = (params: EditorExtensionParams) => [
  codeFolding(),
  Prec.high(keymap.of(createFoldingKeymap(params))),
  createInitialFoldingPlugin(params),
  createFoldWidgetPlugin(params),
];

const SCOPE_ID = 'org-folding';

export const orgFoldingExtension: Extension = {
  onMounted: async (api) => {
    api.utils.applyScopedStyles(SCOPE_ID, styles);
    const { addExtensions } = api.core.useEditor();
    addExtensions(foldingExtension);
  },

  onUnmounted: async (api) => {
    api.utils.removeScopedStyles(SCOPE_ID);
    const { removeExtensions } = api.core.useEditor();
    removeExtensions(foldingExtension);
  },
};

export { orgFoldingManifest } from './manifest';

export {
  applyStartupFolding,
  toggleFoldAtCursor,
  isFolded,
  foldRange,
  unfoldRange,
  toggleFoldRange,
  foldHeadline,
  unfoldHeadline,
  toggleFoldHeadline,
  isHeadlineFolded,
  getFoldRangeForHeadline,
  findHeadlineAtPos,
  foldAllHeadlines,
  unfoldAllHeadlines,
  type FoldRange,
} from './fold-commands';

export {
  parseStartupOption,
  collectHeadlines,
  type StartupOption,
  type HeadlineInfo,
} from './startup-options';
