import type { Extension } from 'orgnote-api';
import { WidgetType } from 'orgnote-api';
import { NodeType } from 'org-mode-ast';
import OrgLatexBlock from './OrgLatexBlock.vue';

const WIDGET_ID_EXPORT = 'org-latex-export-block';
const WIDGET_ID_ENV = 'org-latex-environment';

export const orgLatexBlockExtension: Extension = {
  onMounted: async (api) => {
    const { addWidgets } = api.core.useEditor();

    addWidgets(
      {
        id: WIDGET_ID_EXPORT,
        type: WidgetType.Multiline,
        nodeType: NodeType.ExportBlock,
        component: OrgLatexBlock,
        priority: 0,
        ignoreEvent: true,
      },
      {
        id: WIDGET_ID_ENV,
        type: WidgetType.Multiline,
        nodeType: NodeType.LatexEnvironment,
        component: OrgLatexBlock,
        priority: 0,
        ignoreEvent: true,
      },
    );
  },

  onUnmounted: async (api) => {
    const { removeWidget } = api.core.useEditor();
    removeWidget(WIDGET_ID_EXPORT);
    removeWidget(WIDGET_ID_ENV);
  },
};

export { orgLatexBlockManifest } from './manifest';
