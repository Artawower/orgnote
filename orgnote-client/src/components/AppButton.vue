<template>
  <button :class="[`button-${size}`, { outline, [type]: type }]" class="text-medium" :disabled="disabled">
    <slot />
  </button>
</template>

<script lang="ts" setup>
import type { StyleVariant } from 'orgnote-api';

withDefaults(
  defineProps<{
    type?: StyleVariant;
    outline?: boolean;
    disabled?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg';
  }>(),
  {
    type: 'plain',
    size: 'md',
  },
);
</script>

<style lang="scss" scoped>
$type-styles: (
  plain: (
    var(--bg-elevated),
    var(--fg),
  ),
  active: (
    var(--accent),
    var(--white),
  ),
  info: (
    var(--blue),
    var(--white),
  ),
  warning: (
    var(--yellow),
    var(--black),
  ),
  danger: (
    var(--red),
    var(--white),
  ),
);

button {
  border: none;
  border-radius: var(--button-radius);
  box-sizing: border-box;

  &.button-xs {
    min-height: var(--button-xs-height);
    padding: var(--button-xs-padding);
    min-width: var(--button-xs-min-width);
  }

  &.button-sm {
    min-height: var(--button-sm-height);
    padding: var(--button-sm-padding);
    min-width: var(--button-sm-min-width);
  }

  &.button-md {
    min-height: var(--button-md-height);
    padding: var(--button-md-padding);
    min-width: var(--button-md-min-width);
  }

  &.button-lg {
    min-height: var(--button-lg-height);
    padding: var(--button-lg-padding);
    min-width: var(--button-lg-min-width);
  }

  @each $type, $pair in $type-styles {
    $bg: nth($pair, 1);
    $fg: nth($pair, 2);

    &.#{$type} {
      &:not(.outline) {
        background: $bg;
        color: $fg;
      }

      &.outline {
        background: transparent;
        border: 1px solid $bg;
        color: $bg;
      }

      @include hover {
        background: color-mix(in srgb, $bg, var(--bg) 10%);
      }
    }
  }

  &.link {
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    min-width: unset;
    min-height: unset;
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    text-decoration: none;

    @include hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: none;
      text-decoration: underline;
    }

    &:disabled {
      cursor: default;
      opacity: 0.6;
    }
  }
}
</style>
