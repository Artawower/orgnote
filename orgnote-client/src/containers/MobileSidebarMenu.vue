<template>
  <app-flex column align-stretch class="menu">
    <command-menu-item
      v-for="cmd of sidebarCommands"
      :key="cmd"
      :command="cmd"
      @executed="onSelect"
    />
  </app-flex>
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';
import AppFlex from 'src/components/AppFlex.vue';
import CommandMenuItem from 'src/containers/CommandMenuItem.vue';

const pinnedCommands = api.ui.usePinnedCommands();
const sidebarCommands = pinnedCommands.getCommands('sidebar-sections');
const { closeNavMenu } = api.ui.useSidebar();

const onSelect = (): void => {
  closeNavMenu();
};
</script>

<style lang="scss" scoped>
.menu {
  width: 100%;
  gap: var(--mobile-sidebar-menu-items-gap);
}
</style>
