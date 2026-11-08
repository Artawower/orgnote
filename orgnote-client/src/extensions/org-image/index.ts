import type { Extension } from 'orgnote-api';
import { WidgetType } from 'orgnote-api';
import type { OrgNode } from 'org-mode-ast';
import { NodeType } from 'org-mode-ast';
import OrgImage from './OrgImage.vue';

const WIDGET_ID = 'org-image';

export const orgImageExtension: Extension = {
  onMounted: async (api) => {
    const { addWidgets } = api.core.useEditor();

    addWidgets({
      id: WIDGET_ID,
      type: WidgetType.Multiline,
      nodeType: NodeType.Link,
      component: OrgImage,
      satisfied: (orgNode: OrgNode) => orgNode.meta?.linkType === 'image',
      priority: 0,
    });
  },

  onUnmounted: async (api) => {
    const { removeWidget } = api.core.useEditor();
    removeWidget(WIDGET_ID);
  },
};

export { orgImageManifest } from './manifest';
