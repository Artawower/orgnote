<template>
  <div class="card-wrapper" :class="[{ padding, border }, type]">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import type { StyleVariant } from 'orgnote-api';

withDefaults(
  defineProps<{
    padding?: boolean;
    border?: boolean;
    type?: StyleVariant;
  }>(),
  {
    padding: false,
    border: false,
    type: 'plain',
  },
);
</script>

<style lang="scss">
.card-wrapper {
  border-radius: var(--card-radius);
  overflow: hidden;
  flex-shrink: 0;
  width: 100%;

  > :first-child {
    border-radius: var(--card-radius) var(--card-radius) 0 0;
  }

  > :last-child {
    border-radius: 0 0 var(--card-radius) var(--card-radius);
  }

  > :only-child {
    border-radius: var(--card-radius);
  }

  &.padding {
    padding: var(--card-padding);
  }

  &.border {
    border: var(--card-border);
  }

  &.plain {
    background: var(--card-bg, var(--bg-elevated));
  }

  &.clear {
    background: transparent;
  }

  @include for-each-view-type using ($type, $color) {
    &.#{$type} {
      background: color-mix(in srgb, $color, var(--bg) 80%) !important;
      border-color: $color;

      :deep(li::marker) {
        color: color-mix(in srgb, $color, var(--bg) 40%) !important;
      }
    }
  }
}
</style>
