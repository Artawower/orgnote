import type { Extension } from 'orgnote-api';
import { WidgetType } from 'orgnote-api';
import { NodeType } from 'org-mode-ast';
import OrgQuoteBlock from './OrgQuoteBlock.vue';

const WIDGET_ID = 'org-quote-block';

export const orgQuoteBlockExtension: Extension = {
  onMounted: async (api) => {
    const { addWidgets } = api.core.useEditor();

    addWidgets({
      id: WIDGET_ID,
      type: WidgetType.Multiline,
      nodeType: NodeType.QuoteBlock,
      component: OrgQuoteBlock,
      priority: 0,
      ignoreEvent: true,
    });
  },

  onUnmounted: async (api) => {
    const { removeWidget } = api.core.useEditor();
    removeWidget(WIDGET_ID);
  },
};

export { orgQuoteBlockManifest } from './manifest';
