<template>
  <app-sidebar
    side="right"
    :resizable="!tabletBelow"
    v-model:width="width"
    :min-width="RIGHT_SIDEBAR_MIN_WIDTH"
    :max-width="RIGHT_SIDEBAR_MAX_WIDTH"
  >
    <template #header>
      <app-flex end align-center gap="sm">
        <command-action-button
          v-for="cmd of commands"
          :command="cmd"
          :key="cmd"
          :size="tabletBelow ? 'md' : 'sm'"
        />
      </app-flex>
    </template>
    <div class="right-sidebar-body">
      <component v-if="component" :is="component" v-bind="componentConfig?.componentProps || {}" />
    </div>
  </app-sidebar>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import AppSidebar from 'src/components/AppSidebar.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { RIGHT_SIDEBAR_MIN_WIDTH, RIGHT_SIDEBAR_MAX_WIDTH } from 'src/constants/right-sidebar';
import { useScreenDetection } from 'src/composables/use-screen-detection';

const rightSidebar = api.ui.useRightSidebar();
const { width, component, componentConfig } = storeToRefs(rightSidebar);
const commands = api.ui.usePinnedCommands().getCommands('right-sidebar');
const { tabletBelow } = useScreenDetection();
</script>

<style lang="scss" scoped>
.right-sidebar-body {
  flex: 1;
  overflow: auto;
}
</style>
