<template>
  <div class="segmented-control" :class="`size-${size}`">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="segment"
      :class="{ active: modelValue === option.value }"
      :disabled="disabled"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script lang="ts" setup generic="T extends string | number">
import type { StyleSize } from 'orgnote-api';
import type { SegmentOption } from './app-segmented-control.types';

withDefaults(
  defineProps<{
    options: SegmentOption<T>[];
    modelValue: T;
    disabled?: boolean;
    size?: StyleSize;
  }>(),
  { size: 'md', disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: T];
}>();
</script>

<style lang="scss" scoped>
.segmented-control {
  display: inline-flex;
  background: var(--segmented-control-bg);
  border: var(--segmented-control-border);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
  box-sizing: border-box;

  &.size-xs {
    --seg-font: var(--font-size-xs);
    --seg-px: var(--gap-xs);
    --seg-py: 2px;
  }
  &.size-sm {
    --seg-font: var(--font-size-sm);
    --seg-px: var(--gap-sm);
    --seg-py: var(--gap-xs);
  }
  &.size-md {
    --seg-font: var(--font-size-md);
    --seg-px: var(--gap-md);
    --seg-py: var(--gap-xs);
  }
  &.size-lg {
    --seg-font: var(--font-size-md);
    --seg-px: var(--gap-lg);
    --seg-py: var(--gap-sm);
  }
}

.segment {
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--fg-muted);
  font-size: var(--seg-font, var(--font-size-sm));
  padding: var(--seg-py, var(--gap-xs)) var(--seg-px, var(--gap-sm));
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    box-shadow 0.15s;
  white-space: nowrap;

  @include interactive-no-select;

  &.active {
    background: var(--segmented-control-active-bg);
    color: var(--fg);
    box-shadow: var(--segmented-control-active-shadow);
  }

  &:not(.active) {
    @include hover {
      color: var(--fg);
    }
  }

  &:disabled {
    opacity: var(--disabled-opacity);
    cursor: not-allowed;
    pointer-events: none;
  }
}
</style>
