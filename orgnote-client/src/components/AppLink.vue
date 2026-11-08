<template>
  <a
    class="app-link"
    :class="[colorClass, { underline }]"
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
  >
    <slot>{{ label }}</slot>
  </a>
</template>

<script lang="ts" setup>
import type { ThemeVariable } from 'orgnote-api';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    href: string;
    label?: string;
    color?: ThemeVariable;
    external?: boolean;
    underline?: boolean;
  }>(),
  {
    color: 'accent',
    external: true,
    underline: false,
  },
);

const colorClass = computed(() => `color-${props.color}`);
</script>

<style lang="scss" scoped>
.app-link {
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s ease;

  @include hover {
    text-decoration: underline;
  }

  &.underline {
    text-decoration: underline;
  }
}

@each $color
  in ('blue', 'green', 'red', 'yellow', 'orange', 'magenta', 'cyan', 'violet', 'teal', 'fg', 'fg-muted', 'accent')
{
  .app-link.color-#{$color} {
    color: var(--#{$color});
  }
}
</style>
