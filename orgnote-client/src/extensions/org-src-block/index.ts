import type { Extension, ViewUpdateSchema } from 'orgnote-api';
import { WidgetType } from 'orgnote-api';
import type { OrgNode } from 'org-mode-ast';
import { NodeType } from 'org-mode-ast';
import OrgSrcBlock from './OrgSrcBlock.vue';
import OrgSrcBlockActions from './OrgSrcBlockActions.vue';
import styles from './styles.css?raw';

const viewUpdater = (srcOrgNode: OrgNode, newText: string): ViewUpdateSchema => {
  let node = srcOrgNode?.next;
  let startNode: OrgNode | undefined;
  let endNode: OrgNode | undefined;

  while (node) {
    if (startNode && node.is(NodeType.FixedWidth)) {
      endNode = node;
      node = node.next;
      continue;
    }
    if (node.is(NodeType.Keyword) && node.rawValue.toLowerCase() === '#+results:') {
      startNode = node;
      node = node.next;
      continue;
    }
    if (node.isNot(NodeType.NewLine)) {
      break;
    }
    node = node.next;
  }

  const start = startNode?.start ?? srcOrgNode.parent?.end ?? srcOrgNode.end;
  const end = endNode?.end ?? startNode?.end ?? start;

  return {
    from: start,
    to: end,
    insert: `${startNode ? '' : '\n'}#+RESULTS:\n: ${newText}`,
  };
};

const WIDGET_ID = 'org-src-block';

export const orgSrcBlockExtension: Extension = {
  onMounted: async (api) => {
    api.utils.applyScopedStyles(WIDGET_ID, styles);

    const { addWidgets } = api.core.useEditor();

    addWidgets({
      id: WIDGET_ID,
      type: WidgetType.Multiline,
      nodeType: NodeType.SrcBlock,
      component: OrgSrcBlock,
      actionsComponent: OrgSrcBlockActions,
      viewUpdater,
      priority: 0,
      ignoreEvent: true,
    });

  },

  onUnmounted: async (api) => {
    api.utils.removeScopedStyles(WIDGET_ID);
    const { removeWidget } = api.core.useEditor();
    removeWidget(WIDGET_ID);
  },
};

export { orgSrcBlockManifest } from './manifest';
