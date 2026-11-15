import type { Extension } from 'orgnote-api';
import { WidgetType } from 'orgnote-api';
import { NodeType } from 'org-mode-ast';
import OrgHtmlBlock from './OrgHtmlBlock.vue';

const WIDGET_ID = 'org-html-block';

export const orgHtmlBlockExtension: Extension = {
  onMounted: async (api) => {
    const { addWidgets } = api.core.useEditor();

    addWidgets({
      id: WIDGET_ID,
      type: WidgetType.Multiline,
      nodeType: NodeType.HtmlBlock,
      component: OrgHtmlBlock,
      priority: 0,
      ignoreEvent: true,
    });
  },

  onUnmounted: async (api) => {
    const { removeWidget } = api.core.useEditor();
    removeWidget(WIDGET_ID);
  },
};

export { orgHtmlBlockManifest } from './manifest';
