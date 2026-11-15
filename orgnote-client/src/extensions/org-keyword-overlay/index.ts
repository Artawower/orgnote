import type { Extension, WidgetMeta } from 'orgnote-api';
import { WidgetType } from 'orgnote-api';
import { NodeType, type OrgNode } from 'org-mode-ast';
import OrgTitleEditor from './OrgTitleEditor.vue';
import { keywordNavigationExtension } from './keyword-navigation';
import { getKeywordName } from './utils';

const TITLE_WIDGET_ID = 'org-keyword-title-editor';
const DESCRIPTION_LINE_CLASS_WIDGET_ID = 'org-keyword-description-line-class';
const WIDGET_PRIORITY = 100;

const isKeyword = (name: string): ((orgNode: OrgNode) => boolean) =>
  (orgNode: OrgNode): boolean => getKeywordName(orgNode) === name;

const buildKeywordWidget = (id: string, keywordName: string): WidgetMeta => ({
  id,
  type: WidgetType.Multiline,
  nodeType: NodeType.Keyword,
  satisfied: isKeyword(keywordName),
  component: OrgTitleEditor,
  ignoreEvent: true,
  suppressEdit: true,
  priority: WIDGET_PRIORITY,
});

const titleWidget = buildKeywordWidget(TITLE_WIDGET_ID, 'title');

const descriptionLineClassWidget: WidgetMeta = {
  id: DESCRIPTION_LINE_CLASS_WIDGET_ID,
  type: WidgetType.LineClass,
  nodeType: NodeType.Keyword,
  class: (orgNode) => (isKeyword('description')(orgNode) ? 'org-description-line' : ''),
};

export const orgKeywordOverlayExtension: Extension = {
  onMounted: async (api) => {
    const { addExtensions, addWidgets } = api.core.useEditor();
    addWidgets(titleWidget, descriptionLineClassWidget);
    addExtensions(keywordNavigationExtension);
  },

  onUnmounted: async (api) => {
    const { removeExtensions, removeWidget } = api.core.useEditor();
    removeWidget(TITLE_WIDGET_ID);
    removeWidget(DESCRIPTION_LINE_CLASS_WIDGET_ID);
    removeExtensions(keywordNavigationExtension);
  },
};

export { orgKeywordOverlayManifest } from './manifest';
