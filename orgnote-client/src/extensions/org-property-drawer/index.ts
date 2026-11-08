import type { Extension } from 'orgnote-api';
import { WidgetType } from 'orgnote-api';
import { NodeType } from 'org-mode-ast';
import { watch, type WatchStopHandle } from 'vue';
import OrgPropertyDrawer from './OrgPropertyDrawer.vue';
import {
  getPropertyEditPosition,
  getPropertyWidgetRange,
  isRootPropertySequenceStart,
} from './property-source';

const DRAWER_WIDGET_ID = 'org-property-drawer';
const ROOT_SEQUENCE_WIDGET_ID = 'org-root-property-drawer';

let stopConfigWatch: WatchStopHandle | undefined;
let isRegistered = false;

export const orgPropertyDrawerExtension: Extension = {
  onMounted: async (api) => {
    const editor = api.core.useEditor();
    const config = api.core.useConfig();

    const addPropertyWidgets = (): void => {
      if (isRegistered) return;
      editor.addWidgets({
        id: DRAWER_WIDGET_ID,
        type: WidgetType.Multiline,
        nodeType: NodeType.PropertyDrawer,
        component: OrgPropertyDrawer,
        ignoreEvent: true,
        suppressEdit: true,
        showEditAction: true,
        rangeBuilder: getPropertyWidgetRange,
        editPositionBuilder: getPropertyEditPosition,
        priority: 0,
      });
      editor.addWidgets({
        id: ROOT_SEQUENCE_WIDGET_ID,
        type: WidgetType.Multiline,
        nodeType: NodeType.Property,
        component: OrgPropertyDrawer,
        satisfied: isRootPropertySequenceStart,
        ignoreEvent: true,
        suppressEdit: true,
        showEditAction: true,
        rangeBuilder: getPropertyWidgetRange,
        editPositionBuilder: getPropertyEditPosition,
        priority: 0,
      });
      isRegistered = true;
    };

    const removePropertyWidgets = (): void => {
      editor.removeWidget(DRAWER_WIDGET_ID);
      editor.removeWidget(ROOT_SEQUENCE_WIDGET_ID);
      isRegistered = false;
    };

    stopConfigWatch = watch(
      () => config.config.editor.showPropertyDrawer,
      (enabled) => {
        if (enabled) addPropertyWidgets();
        if (!enabled) removePropertyWidgets();
      },
      { immediate: true },
    );
  },

  onUnmounted: async (api) => {
    stopConfigWatch?.();
    stopConfigWatch = undefined;
    const { removeWidget } = api.core.useEditor();
    removeWidget(DRAWER_WIDGET_ID);
    removeWidget(ROOT_SEQUENCE_WIDGET_ID);
    isRegistered = false;
  },
};

export { orgPropertyDrawerManifest } from './manifest';
