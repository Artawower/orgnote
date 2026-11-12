<template>
  <menu-item
    v-bind="$attrs"
    @click="executeCommand"
    :icon="resolvedIcon"
    :active="isActive"
    :narrow="isNarrow"
    :disabled="disabled"
  >
    <slot>
      <div class="capitalize text-medium">{{ command?.command ? t(command.command) : '' }}</div>
    </slot>
    <template v-if="slots.right" #right>
      <slot name="right" />
    </template>
    <template v-if="slots.content" #content>
      <slot name="content" />
    </template>
  </menu-item>
</template>

<script lang="ts" setup>
import { computed, toValue, useSlots } from 'vue';
import type { CommandName } from 'orgnote-api';
import { api } from 'src/boot/api';
import { useI18n } from 'vue-i18n';
import MenuItem from './MenuItem.vue';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  command: CommandName;
  data?: unknown;
  disableIcon?: boolean;
  disabled?: boolean;
}>();

const slots = useSlots();

const { get, execute } = api.core.useCommands();

const command = get(props.command);

const resolvedIcon = computed(() => {
  if (props.disableIcon) {
    return;
  }
  const icon = toValue(command?.icon);
  return typeof icon === 'string' ? icon : undefined;
});
const isActive = computed(() => command?.isActive?.(api));
const isNarrow = computed(() => command?.context?.narrow);

const emit = defineEmits<{ executed: [] }>();

const executeCommand = () => {
  if (props.disabled) return;
  execute(props.command, props.data);
  emit('executed');
};

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>
