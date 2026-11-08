<template>
  <app-header class="main-header" float>
    <template v-if="canGoBack || canGoForward" #left>
      <action-button
        v-if="canGoBack"
        icon="keyboard_arrow_left"
        size="sm"
        color="fg-muted"
        @click="handleNavigation('back')"
      />
      <action-button
        v-if="canGoForward"
        icon="keyboard_arrow_right"
        size="sm"
        color="fg-muted"
        @click="handleNavigation('forward')"
      />
    </template>
    <template v-if="config.ui.showFileTitleBar" #center>
      <span
        class="header-title"
        :title="panes.activeTabTitle"
        role="button"
        tabindex="0"
        @click="openFileActions"
        @keydown.enter.prevent="openFileActions"
      >
        {{ panes.activeTabTitle }}
      </span>
    </template>
    <template #right>
      <command-action-button
        v-for="c of rightCommands"
        v-bind:key="c"
        :command="c"
        size="md"
        :hover-effect="false"
      />
    </template>
  </app-header>
</template>

<script lang="ts" setup>
import { computed, inject, shallowRef, type ShallowRef } from 'vue';
import type { Router } from 'vue-router';
import AppHeader from 'src/components/AppHeader.vue';
import ActionButton from 'src/components/ActionButton.vue';
import CommandActionButton from './CommandActionButton.vue';
import MenuList from 'src/components/MenuList.vue';
import { api } from 'src/boot/api';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import { useTabHistory } from 'src/composables/use-tab-history';
import { getActiveFilePath } from 'src/utils/get-active-file-path';
import { storeToRefs } from 'pinia';

const pinnedCommandsStore = api.ui.usePinnedCommands();
const rightCommands = pinnedCommandsStore.getCommands('right-header');
const contextMenuStore = api.ui.useContextMenu();

const panes = api.core.usePane();
const modal = api.ui.useModal();
const { config } = storeToRefs(api.core.useConfig());

const fileActionsData = computed<
  | {
      path: string;
      paths: string[];
      interactive: true;
    }
  | undefined
>(() => {
  const path = getActiveFilePath(api);
  if (!path) {
    return;
  }

  return {
    path,
    paths: [path],
    interactive: true,
  };
});

const openFileActions = () => {
  const data = fileActionsData.value;
  if (!data) {
    return;
  }

  modal.open(MenuList, {
    mini: true,
    position: 'bottom',
    modalProps: {
      actions: contextMenuStore.getContextMenuActions('tab'),
      data,
    },
    modalEmits: {
      close: () => modal.close(),
    },
  });
};

const fallbackRouter = shallowRef<Router | undefined>(undefined);
const tabRouter = inject<ShallowRef<Router | undefined>>(TAB_ROUTER_KEY, fallbackRouter);
const { canGoBack, canGoForward, handleNavigation } = useTabHistory(tabRouter);
</script>

<style lang="scss" scoped>
.header-title {
  display: inline-block;
  max-width: var(--main-header-title-max-width);
  padding: 0 var(--padding-lg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--fg);
  @include interactive-no-select;
  cursor: pointer;

  @include mobile {
    max-width: 100%;
  }
}

.main-header {
  --header-item-center-bg: transparent;
  --header-item-center-border: none;
  --header-item-center-border-top: none;
  --header-item-center-backdrop-filter: none;
  --header-item-center-box-shadow: none;
  --header-item-center-overflow: visible;

  :deep(.header-center::after) {
    display: none;
  }

  @include mobile {
    --header-column-gap: var(--main-header-actions-gap-mobile);
  }
}
</style>
