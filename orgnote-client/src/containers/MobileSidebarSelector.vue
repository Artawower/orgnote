<template>
  <app-footer
    :embedded="embedded"
    :float="!embedded"
    justify="between"
    :open-top="menuOpen && !embedded"
  >
    <app-flex
      row
      start
      align-center
      gap="sm"
      class="active-view"
      :class="{ open: menuOpen }"
      @click="toggle()"
    >
      <app-icon :name="activeIcon" size="sm" color="fg" :rounded="true" />
      <overflow-line class="active-label">{{ activeLabel }}</overflow-line>
      <app-icon
        name="sym_o_unfold_more"
        size="sm"
        color="fg-muted"
        class="expand-icon"
        :class="{ open: menuOpen }"
      />
    </app-flex>
    <command-action-button v-for="cmd of footerCommands" :key="cmd" :command="cmd" size="sm" />
  </app-footer>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import { useI18n } from 'vue-i18n';
import type { CommandName } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';
import AppFooter from 'src/components/AppFooter.vue';
import OverflowLine from 'src/components/OverflowLine.vue';
import AppIcon from 'src/components/AppIcon.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';

withDefaults(
  defineProps<{
    embedded?: boolean;
  }>(),
  {
    embedded: false,
  },
);

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const pinnedCommands = api.ui.usePinnedCommands();
const commandsStore = api.core.useCommands();

const sidebar = api.ui.useSidebar();
const { navMenuOpen: menuOpen } = storeToRefs(sidebar);
const { toggleNavMenu: toggle } = sidebar;

const sidebarCommands = pinnedCommands.getCommands('sidebar-sections');
const footerCommands = pinnedCommands.getCommands('sidebar-essentials');

const activeCommand = computed(() => {
  const cmds = sidebarCommands.value;
  const active = cmds.find((cmd: CommandName) => commandsStore.get(cmd)?.isActive?.(api));
  const resolved = active ?? cmds[0];
  return resolved ? commandsStore.get(resolved) : undefined;
});

const activeIcon = computed(() => {
  const icon = activeCommand.value?.icon;
  return typeof icon === 'string' ? icon : 'sym_o_menu';
});

const activeLabel = computed(() => {
  const cmd = activeCommand.value;
  if (!cmd) return '';
  const title = cmd.title ? String(cmd.title) : camelCaseToWords(cmd.command ?? '');
  return t(title);
});
</script>

<style lang="scss" scoped>
.active-view {
  cursor: pointer;
  flex: 1;
  min-width: 0;
  overflow: hidden;

  @include hover {
    opacity: 0.8;
  }
}

.active-label {
  @include fontify(var(--font-size-sm), medium);
  text-transform: capitalize;
}

.expand-icon {
  transition: transform 0.2s ease;

  &.open {
    transform: rotate(180deg);
  }
}
</style>
