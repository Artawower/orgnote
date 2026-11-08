<template>
  <container-layout
    v-if="currentPane"
    class="pane-container"
    :body-scroll="false"
    @pointerdown.capture="handlePaneClick"
    @click="handlePaneClick"
  >
    <template #header>
      <nav-tabs v-if="tabletAbove" :active-tab-id="activeTabId">
        <template #navigation>
          <action-button
            icon="keyboard_arrow_left"
            size="sm"
            color="fg-muted"
            :disabled="!canGoBack"
            @click="handleNavigation('back')"
          />
          <action-button
            icon="keyboard_arrow_right"
            size="sm"
            color="fg-muted"
            :disabled="!canGoForward"
            @click="handleNavigation('forward')"
          />
        </template>
        <context-menu
          v-for="tab of tabs"
          :key="tab.id"
          group="tab"
          :data="tabFileActionDataMap[tab.id]"
          :disabled="!tabFileActionDataMap[tab.id]"
          @open="handleTabSelect(tab.id)"
        >
          <nav-tab
            @click="handleTabSelect(tab.id)"
            @close="handleTabClose(tab.id)"
            @dragstart="handleDragStart"
            @dragend="handleDragEnd"
            icon="description"
            :active="isTabActive(tab.id)"
            :tab-id="tab.id"
            :pane-id="props.paneId"
          >
            {{ generateTabTitle(tab.router.currentRoute.value) || tab.title }}
          </nav-tab>
        </context-menu>
        <template #actions>
          <command-action-button
            :command="DefaultCommands.NEW_TAB"
            size="sm"
            :data="{ paneId: props.paneId }"
          />
        </template>
        <template v-if="isTopRightPane" #right-actions>
          <command-action-button
            v-if="!opened"
            :command="DefaultCommands.TOGGLE_RIGHT_SIDEBAR"
            size="sm"
          />
        </template>
      </nav-tabs>
    </template>

    <template #body>
      <div class="pane-body">
        <ScopedRouterView v-if="resolvedRouter" :router="resolvedRouter" :key="activeTabId || ''" />
      </div>
    </template>

    <drop-zone-overlay
      :visible="pane.isDraggingTab"
      v-model:active-zone="currentDropZone"
      @drop="handleDrop"
    />
  </container-layout>
</template>

<script lang="ts" setup>
import { DefaultCommands } from 'orgnote-api';
import { type DropDirection, type DropZone, type Tab } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { api } from 'src/boot/api';
import ActionButton from 'src/components/ActionButton.vue';
import NavTab from 'src/components/NavTab.vue';
import NavTabs from 'src/components/NavTabs.vue';
import DropZoneOverlay from 'src/components/DropZoneOverlay.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import { generateTabTitle } from 'src/utils/generate-tab-title';
import { computed, onUnmounted, provide, ref, shallowRef, watch } from 'vue';
import type { Router } from 'vue-router';

import ScopedRouterView from 'src/components/ScopedRouterView.vue';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import { storeToRefs } from 'pinia';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import { useTabHistory } from 'src/composables/use-tab-history';
import ContextMenu from 'src/components/ContextMenu.vue';
import { useTabContextMenu } from 'src/composables/use-tab-context-menu';
import { reporter } from 'src/boot/report';

const props = defineProps<{
  paneId: string;
}>();

const { tabletAbove } = api.ui.useScreenDetection();
const pane = api.core.usePane();
const layout = api.core.useLayout();

const currentPane = computed(() => {
  const paneRef = pane.panes?.[props.paneId];
  return paneRef?.value;
});

const tabs = computed((): Tab[] => {
  if (!currentPane.value) return [];
  return Object.values(currentPane.value.tabs.value);
});

const activeTab = computed<Tab | undefined>(() => {
  const tabId = currentPane.value?.activeTabId;
  return currentPane.value?.tabs.value[tabId!];
});

const activeTabId = computed(() => {
  const id = currentPane.value?.activeTabId;
  return id;
});

const isPaneActive = computed(() => {
  return pane.activePaneId === props.paneId;
});

const isSinglePane = computed(() => Object.keys(pane.panes).length === 1);

const isTopRightPane = computed(() => {
  if (isSinglePane.value) return true;
  const position = layout.getPanePosition(props.paneId);
  return position?.horizontal === 'right' && position?.vertical !== 'bottom';
});

const isTabActive = (tabId: string): boolean => {
  return tabId === activeTabId.value && isPaneActive.value;
};

const handlePaneClick = () => {
  if (!currentPane.value) return;
  if (pane.activePaneId !== currentPane.value.id) {
    pane.setActivePane(currentPane.value.id);
  }
};

const handleTabSelect = (tabId: string) => {
  if (!currentPane.value) return;
  pane.selectTab(currentPane.value.id, tabId);
};

const handleTabClose = (tabId: string) => {
  if (!currentPane.value) return;
  pane.closeTab(currentPane.value.id, tabId);
};

const tabFileActionDataMap = useTabContextMenu(tabs);

const currentDropZone = ref<DropZone | undefined>();

const tabRouter = shallowRef<Router | undefined>();
const resolvedRouter = computed(() => tabRouter.value as Router | undefined);

const initTabRouter = () => {
  const tab = activeTab.value;
  if (!tab?.router) {
    tabRouter.value = undefined;
    return;
  }
  tabRouter.value = tab.router;
};

initTabRouter();

watch(activeTab, initTabRouter, { immediate: true });

provide(TAB_ROUTER_KEY, tabRouter);

const { canGoBack, canGoForward, handleNavigation } = useTabHistory(tabRouter);

let dragStartTimer: ReturnType<typeof setTimeout> | undefined;

const clearDragStartTimer = (): void => {
  if (dragStartTimer === undefined) return;
  clearTimeout(dragStartTimer);
  dragStartTimer = undefined;
};

const handleDragStart = (payload: { tabId: string; paneId: string }): void => {
  clearDragStartTimer();
  dragStartTimer = setTimeout(() => {
    dragStartTimer = undefined;
    pane.startDraggingTab(payload.tabId, payload.paneId);
  }, 0);
};

const handleDragEnd = (): void => {
  clearDragStartTimer();
  pane.stopDraggingTab();
  currentDropZone.value = undefined;
};

const shouldMoveTabToPane = (sourcePaneId: string, targetPaneId: string): boolean =>
  sourcePaneId !== targetPaneId;

const moveTabToCenter = async (tabId: string, sourcePaneId: string): Promise<void> => {
  if (!shouldMoveTabToPane(sourcePaneId, props.paneId)) return;
  await pane.moveTab(tabId, sourcePaneId, props.paneId);
};

const moveTabToNewPane = (
  tabId: string,
  sourcePaneId: string,
  newPaneId: string,
): Promise<Tab | undefined> => pane.moveTab(tabId, sourcePaneId, newPaneId);

const rollbackNewPane = (newPaneId: string, sourcePaneId: string): void => {
  pane.closePane(newPaneId);
  layout.removePaneFromLayout(newPaneId);
  pane.setActivePane(sourcePaneId);
};

const createNewPaneAndMoveTab = async (
  direction: DropDirection,
  tabId: string,
  sourcePaneId: string,
): Promise<void> => {
  const newPaneId = await layout.splitPaneInLayout(props.paneId, direction, false);
  if (!newPaneId) return;
  const movedTab = await moveTabToNewPane(tabId, sourcePaneId, newPaneId);
  if (movedTab) return;
  rollbackNewPane(newPaneId, sourcePaneId);
};

const handleCenterDrop = async (tabId: string, sourcePaneId: string): Promise<void> => {
  await moveTabToCenter(tabId, sourcePaneId);
};

const handleDirectionDrop = async (
  zone: DropDirection,
  tabId: string,
  sourcePaneId: string,
): Promise<void> => {
  await createNewPaneAndMoveTab(zone, tabId, sourcePaneId);
};

const handleTabDrop = async (
  zone: DropZone,
  tabId: string,
  sourcePaneId: string,
): Promise<void> => {
  if (zone === 'center') {
    await handleCenterDrop(tabId, sourcePaneId);
    return;
  }

  await handleDirectionDrop(zone as DropDirection, tabId, sourcePaneId);
};

const handleDrop = async (zone: DropZone): Promise<void> => {
  const draggedTab = pane.draggedTabData;
  if (!draggedTab) {
    handleDragEnd();
    return;
  }

  const result = await to(() => handleTabDrop(zone, draggedTab.tabId, draggedTab.paneId))();
  handleDragEnd();
  if (result.isErr()) reporter.reportError(result.error);
};

onUnmounted(handleDragEnd);

const { opened } = storeToRefs(api.ui.useRightSidebar());
</script>

<style lang="scss" scoped>
.pane-container {
  position: relative;
  background: var(--nav-tabs-bg);
}

.pane-body {
  @include fit;

  & {
    background: var(--bg);
  }

  @include tablet-above {
    overflow: hidden;
    border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
  }
}
</style>
