<template>
  <action-button
    v-if="command && !command.hide?.(api)"
    v-bind="$attrs"
    :disabled="isDisabled"
    :active="isActive"
    @mousedown="handleMouseDown"
    @click="handleClick"
    :icon="iconString"
    :aria-label="resolvedAriaLabel"
    :alignment="props.alignment"
  >
    <template v-if="iconComponent" #icon>
      <component :is="iconComponent" />
    </template>
    <template v-if="includeText || text" #text>{{
      text || camelCaseToWords(command.command)
    }}</template>
    <q-tooltip v-if="resolvedAriaLabel && !preventFocusLoss" :delay="tooltipDelay">{{
      resolvedAriaLabel
    }}</q-tooltip>
  </action-button>
</template>

<script lang="ts" setup>
import ActionButton, { type ButtonAlignment } from 'src/components/ActionButton.vue';
import type { CommandName } from 'orgnote-api';
import { useCommandsStore } from 'src/stores/command';
import { computed, toValue, useAttrs } from 'vue';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';
import { api } from 'src/boot/api';
import { useResolvedIcon } from 'src/composables/use-resolved-icon';
import { useConfigStore } from 'src/stores/config';
import { storeToRefs } from 'pinia';
import { focusEditor } from 'src/utils/editor-primitives';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  command: CommandName;
  includeText?: boolean;
  text?: string;
  ariaLabel?: string;
  data?: unknown;
  executeOnPointerDown?: boolean;
  alignment?: ButtonAlignment;
}>();

const { config } = storeToRefs(useConfigStore());
const tooltipDelay = computed(() => config.value.ui.tooltipDelay);

const commandsStore = useCommandsStore();
const editorStore = api.core.useEditor();

const command = computed(() => commandsStore.get(props.command));
const attrs = useAttrs();
const isDisabled = computed(() => (command.value?.disabled?.(api) ?? false) || !!attrs.disabled);
const isActive = computed(() => command.value?.isActive?.(api) ?? false);

const { iconString, iconComponent } = useResolvedIcon(computed(() => toValue(command.value?.icon)));

const resolvedAriaLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel;
  if (props.text) return props.text;
  if (!command.value) return undefined;
  return camelCaseToWords(command.value.command);
});

const emit = defineEmits<{
  executed: [];
}>();

const preventFocusLoss = computed(() => props.executeOnPointerDown === true);

const focusActiveEditor = (): void => {
  const editorView = editorStore.activeContext?.editorViewGetter?.();
  if (!editorView) return;
  focusEditor(editorView);
};

const execute = async () => {
  await commandsStore.execute(props.command, props.data);
  emit('executed');
};

const handleMouseDown = (event: MouseEvent): void => {
  if (!preventFocusLoss.value) return;
  event.preventDefault();
};

const handleClick = async (): Promise<void> => {
  await execute();
  if (preventFocusLoss.value) {
    focusActiveEditor();
  }
};
</script>
