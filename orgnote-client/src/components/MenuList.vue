<template>
  <menu-group class="context-menu-list">
    <menu-item
      v-for="(item, index) of visibleActions"
      :key="index"
      @click="handleAction(item)"
      :icon="getIcon(item)"
      :disabled="isDisabled(item)"
      class="context-menu-item"
      flat
    >
      {{ getLabel(item) }}
    </menu-item>
  </menu-group>
</template>

<script lang="ts" setup>
import { computed, toValue } from 'vue';
import type { MenuAction, CommandMenuAction, Command } from 'orgnote-api';
import MenuGroup from 'src/components/MenuGroup.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import { useCommandsStore } from 'src/stores/command';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';
import { useNotificationsStore } from 'src/stores/notifications';
import { to } from 'orgnote-api/utils';
import { api } from 'src/boot/api';

const props = defineProps<{
  actions: MenuAction[];
  data?: unknown;
}>();

const emit = defineEmits<{
  close: [];
}>();

const commandsStore = useCommandsStore();
const notifications = useNotificationsStore();

const isCommandAction = (item: MenuAction): item is CommandMenuAction => 'command' in item;

const getCommand = (item: CommandMenuAction): Command | undefined =>
  commandsStore.get(item.command);

const isHidden = (item: MenuAction): boolean =>
  isCommandAction(item) && (getCommand(item)?.hide?.(api) ?? false);

const visibleActions = computed(() => props.actions.filter((item) => !isHidden(item)));

const isDisabled = (item: MenuAction): boolean =>
  isCommandAction(item) && (getCommand(item)?.disabled?.(api) ?? false);

const getIcon = (item: MenuAction): string | undefined => {
  if (isCommandAction(item)) {
    const command = getCommand(item);
    const icon = command ? toValue(command.icon) : undefined;
    return typeof icon === 'string' ? icon : undefined;
  }
  return item.icon;
};

const getLabel = (item: MenuAction) => {
  if (isCommandAction(item)) {
    const command = getCommand(item);
    return command ? camelCaseToWords(command.command) : '';
  }
  return item.title;
};

const handleAction = async (item: MenuAction) => {
  if (isDisabled(item)) return;
  emit('close');

  const executeAction = async () => {
    if (isCommandAction(item)) {
      return await commandsStore.execute(item.command, props.data);
    }
    return item.handler(props.data);
  };

  const result = await to(executeAction, 'Failed to execute action')();

  result.mapErr((error) => {
    notifications.notify({
      message: error.message,
      level: 'danger',
    });
  });
};
</script>

<style lang="scss" scoped>
.context-menu-list {
  min-width: 160px;
  width: 100%;
  padding: var(--context-menu-padding);
  box-sizing: border-box;
}
</style>
