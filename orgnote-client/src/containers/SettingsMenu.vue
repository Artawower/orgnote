<template>
  <app-flex class="settings-menu" column start align-center gap="lg">
    <menu-group v-for="(menuItems, key) of settingsMenu" :key="key">
      <command-menu-item v-for="(menuItem, i) of menuItems" :key="i" :command="menuItem" />
    </menu-group>
  </app-flex>
</template>

<script lang="ts" setup>
import MenuGroup from 'src/components/MenuGroup.vue';
import { api } from 'src/boot/api';
import { storeToRefs } from 'pinia';
import CommandMenuItem from './CommandMenuItem.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { computed } from 'vue';
import { DefaultCommands } from 'orgnote-api';
import { useServerEnvironmentStore } from 'src/stores/server-environment';

const { settingsMenu: configuredSettingsMenu } = storeToRefs(api.ui.useSettingsUi());
const { isSelfHosted } = storeToRefs(useServerEnvironmentStore());
const settingsMenu = computed(() => {
  if (!isSelfHosted.value) return configuredSettingsMenu.value;
  return Object.fromEntries(
    Object.entries(configuredSettingsMenu.value).map(([group, commands]) => [
      group,
      commands.filter((command) => command !== DefaultCommands.SUBSCRIPTION_SETTINGS),
    ]),
  );
});
</script>

<style lang="scss" scoped>
.menu-group {
  width: 100%;
}

.settings-menu {
  width: 320px;

  @include desktop-below {
    width: 100%;
  }
}
</style>
