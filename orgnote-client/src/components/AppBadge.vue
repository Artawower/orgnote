<template>
  <app-flex
    tag="span"
    inline
    class="app-badge"
    :class="[{ outline, rounded }, variant, sizeClass]"
    :style="badgeStyle"
    role="status"
    row
    center
    align-center
  >
    <app-icon v-if="icon" :name="icon" :size="iconSize" class="q-mr-xs" />
    <slot>{{ label }}</slot>
  </app-flex>
</template>

<script lang="ts" setup>
import type { StyleSize, StyleVariant, ThemeVariable } from 'orgnote-api';
import AppIcon from './AppIcon.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { getCssVariableName } from 'src/utils/css-utils';
import { computed } from 'vue';

type ExtendedStyleVariant = StyleVariant | 'primary' | 'secondary' | 'accent' | 'success';

const props = withDefaults(
  defineProps<{
    label?: string;
    icon?: string;
    variant?: ExtendedStyleVariant;
    color?: ThemeVariable;
    size?: StyleSize;
    rounded?: boolean;
    outline?: boolean;
  }>(),
  {
    variant: 'plain',
    size: 'sm',
    rounded: false,
    outline: false,
  },
);

const sizeClass = computed(() => (props.size ? `size-${props.size}` : undefined));
const badgeStyle = computed(() =>
  props.color ? { '--badge-color': getCssVariableName(props.color) } : undefined,
);

const ICON_SIZE_MAP: Record<StyleSize, StyleSize> = {
  xs: 'xs',
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'lg',
  auto: 'sm',
};

const iconSize = computed(() => ICON_SIZE_MAP[props.size ?? 'md']);
</script>

<style lang="scss" scoped>
.app-badge {
  gap: var(--badge-gap, 4px);
  @include fontify(var(--font-size-base, 16px), var(--font-weight-medium, 700), var(--fg, #000));
  border: 1px solid transparent;
  line-height: 1;
  min-height: unset;
  vertical-align: middle;
  border-radius: var(--badge-radius, 8px);
  padding: var(--padding-xs, 2px) var(--padding-sm, 4px);
  background: color-mix(in srgb, var(--fg, #000), transparent 90%);

  &.rounded {
    border-radius: 9999px;
  }

  &.size-xs {
    @include fontify(var(--font-size-xs, 12px), var(--font-weight-medium, 700));
    padding: var(--padding-xs) calc(var(--padding-xs) * 2);

    min-height: 1.2em;
  }

  &.size-sm {
    @include fontify(var(--font-size-sm, 14px), var(--font-weight-medium, 700));
    padding: var(--padding-sm, 4px) calc(var(--padding-sm, 4px) * 2);
    min-height: 1.4em;
  }

  &.size-md {
    @include fontify(var(--font-size-base, 16px), var(--font-weight-medium, 700));
    padding: var(--padding-md, 8px);
    min-height: 1.6em;
  }

  &.size-lg {
    @include fontify(var(--font-size-lg, 20px), var(--font-weight-medium, 700));
    padding: var(--padding-md, 8px) var(--padding-lg, 16px);
    min-height: 2em;
  }
}

$extended-type-colors: (
  plain: var(--fg, #000),
  primary: var(--primary, var(--q-primary)),
  secondary: var(--secondary, var(--q-secondary)),
  accent: var(--accent, var(--q-accent)),
  info: var(--blue, var(--q-info)),
  success: var(--green, var(--q-positive)),
  warning: var(--yellow, var(--q-warning)),
  danger: var(--red, var(--q-negative)),
);

@each $type, $color in $extended-type-colors {
  .app-badge.#{$type} {
    background: color-mix(in srgb, $color, transparent 85%);
    color: $color;

    &.outline {
      background: transparent;
      color: $color;
      border-color: $color;
    }
  }
}

// Custom color override if provided
.app-badge[style*='--badge-color'] {
  color: var(--badge-color);
  background: color-mix(in srgb, var(--badge-color), transparent 85%);

  &.outline {
    background: transparent;
    border-color: var(--badge-color);
  }
}
</style>
