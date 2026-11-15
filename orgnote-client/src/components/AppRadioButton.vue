<template>
  <app-flex tag="label" inline center :class="[`size-${size}`, { checked: modelValue, disabled }]">
    <input type="checkbox" :checked="modelValue" :disabled="disabled" @click.prevent="toggle" />
    <div class="circle" />
  </app-flex>
</template>

<script setup lang="ts">
import AppFlex from './AppFlex.vue';
import type { StyleSize } from 'orgnote-api';
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    size?: StyleSize;
    disabled?: boolean;
  }>(),
  { size: 'md', disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  change: [value: boolean];
}>();

const toggle = (): void => {
  const next = !props.modelValue;
  emit('update:modelValue', next);
  emit('change', next);
};
</script>

<style lang="scss" scoped>
label {
  cursor: pointer;
  @include interactive-no-select;
  vertical-align: middle;
  position: relative;
  flex-shrink: 0;

  &.size-sm {
    width: var(--radio-sm-size);
    height: var(--radio-sm-size);
  }

  &.size-md {
    width: var(--radio-md-size);
    height: var(--radio-md-size);
  }

  &.size-lg {
    width: var(--radio-lg-size);
    height: var(--radio-lg-size);
  }
}

input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.circle {
  @include fit;
  border-radius: 50%;
  border: 2px solid var(--fg-muted);
  background: transparent;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s ease;

  &::after {
    content: '';
    width: 45%;
    height: 45%;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0;
    transform: scale(0);
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }
}

label.checked .circle {
  border-color: var(--accent);

  &::after {
    opacity: 1;
    transform: scale(1);
  }
}

label:hover:not(.disabled) .circle {
  border-color: var(--accent);
}

label.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

input:focus-visible + .circle {
  box-shadow: 0 0 0 2px var(--accent);
}
</style>
