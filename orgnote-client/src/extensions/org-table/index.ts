import type { Extension } from 'orgnote-api';
import { WidgetType } from 'orgnote-api';
import { NodeType } from 'org-mode-ast';
import OrgTable from './OrgTable.vue';

const WIDGET_ID = 'org-table';

export const orgTableExtension: Extension = {
  onMounted: async (api) => {
    const { addWidgets } = api.core.useEditor();
    addWidgets({
      id: WIDGET_ID,
      type: WidgetType.Multiline,
      nodeType: NodeType.Table,
      component: OrgTable,
      priority: 0,
      ignoreEvent: true,
    });
  },

  onUnmounted: async (api) => {
    const { removeWidget } = api.core.useEditor();
    removeWidget(WIDGET_ID);
  },
};

export { orgTableManifest } from './manifest';
