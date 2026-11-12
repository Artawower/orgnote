<template>
  <component
    :is="editable ? 'button' : 'span'"
    class="inline-date-token"
    :class="rootClasses"
    :type="editable ? 'button' : undefined"
    @click="handleActivate"
  >
    <slot />
  </component>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

type FocusTone = 'none' | 'accent' | 'current';

const props = withDefaults(
  defineProps<{
    editable?: boolean;
    monospace?: boolean;
    focusTone?: FocusTone;
  }>(),
  {
    editable: false,
    monospace: false,
    focusTone: 'none',
  },
);

const emit = defineEmits<{
  (e: 'activate'): void;
}>();

const rootClasses = computed(() => ({
  editable: props.editable,
  monospace: props.monospace,
  'focus-accent': props.focusTone === 'accent',
  'focus-current': props.focusTone === 'current',
}));

const handleActivate = (): void => {
  if (!props.editable) {
    return;
  }

  emit('activate');
};
</script>

<style lang="scss" scoped>
.inline-date-token {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: fit-content;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  color: inherit;
  font: inherit;
  line-height: inherit;
  vertical-align: baseline;

  &.monospace {
    font-family: var(--code-font-family);
  }

  &.editable {
    cursor: pointer;

    &:focus,
    &:focus-visible,
    &:active {
      outline: none;
      border: none;
      box-shadow: none;
    }

    &:focus-visible {
      border-radius: var(--border-radius-sm);
    }

    &.focus-accent:focus-visible {
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }

    &.focus-current:focus-visible {
      background: color-mix(in srgb, currentColor 12%, transparent);
    }
  }
}
</style>
