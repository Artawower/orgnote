<template>
  <sidebars-layout
    :left-opened="leftOpened"
    :right-opened="rightOpened"
    :is-mobile="tabletBelow"
    @open-left="commandsStore.execute(DefaultCommands.OPEN_SIDEBAR)"
    @close-left="commandsStore.execute(DefaultCommands.CLOSE_SIDEBAR)"
    @open-right="commandsStore.execute(DefaultCommands.OPEN_RIGHT_SIDEBAR)"
    @close-right="commandsStore.execute(DefaultCommands.CLOSE_RIGHT_SIDEBAR)"
  >
    <template #left>
      <main-sidebar />
    </template>

    <app-flex column class="content" start align-stretch>
      <safe-area :disable="platform.is.electron" class="content-body">
        <router-view class="content-view" />
        <editor-actions-toolbar />
      </safe-area>
      <visibility-wrapper v-if="!keyboardOpened" tablet-below>
        <main-footer />
      </visibility-wrapper>
    </app-flex>

    <template #right>
      <right-sidebar-content />
    </template>
  </sidebars-layout>

  <modal-container />
  <app-notifications />
</template>

<script setup lang="ts">
import MainFooter from 'src/containers/MainFooter.vue';
import MainSidebar from 'src/containers/MainSidebar.vue';
import RightSidebarContent from 'src/containers/RightSidebarContent.vue';
import ModalContainer from 'src/containers/ModalContainer.vue';
import AppNotifications from 'src/containers/AppNotifications.vue';
import EditorActionsToolbar from 'src/containers/EditorActionsToolbar.vue';
import SidebarsLayout from 'src/components/SidebarsLayout.vue';
import { api } from 'src/boot/api';
import { onMounted } from 'vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import SafeArea from 'src/components/SafeArea.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { useRoute, useRouter } from 'vue-router';
import { reporter } from 'src/boot/report';
import { DefaultCommands } from 'orgnote-api';
import { storeToRefs } from 'pinia';
import { useCommandsStore } from 'src/stores/command';
import { useKeyboardState } from 'src/composables/use-viewport-behavior';
import { useFileManagerBufferFollow } from 'src/composables/use-file-manager-buffer-follow';
import { platform } from 'src/utils/platform-detection';

useFileManagerBufferFollow();

const commandsStore = useCommandsStore();

const route = useRoute();
const router = useRouter();

const sidebar = api.ui.useSidebar();
const { opened: leftOpened } = storeToRefs(sidebar);

const rightSidebar = api.ui.useRightSidebar();
const { opened: rightOpened } = storeToRefs(rightSidebar);

const { tabletBelow } = api.ui.useScreenDetection();


const handleErrorFromQuery = (): void => {
  const errorMessage = route?.query?.error;
  if (!errorMessage || typeof errorMessage !== 'string') return;
  reporter.reportError(new Error(errorMessage));
  router.replace({ query: { ...route.query, error: undefined } });
};

onMounted(() => {
  handleErrorFromQuery();
});

const { keyboardOpened } = useKeyboardState();
</script>

<style lang="scss" scoped>
.content {
  height: 100%;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.content-body {
  flex: 1;
  min-height: 0;
}
</style>
