<template>
  <component
    :is="'h' + level"
    class="app-title"
    :class="[sizeClass, { 'no-margin': noMargin, center, capitalize }]"
  >
    <slot />
  </component>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

type TitleLevel = 1 | 2 | 3 | 4 | 5 | 6;
type TitleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

const props = withDefaults(
  defineProps<{
    level?: TitleLevel;
    size?: TitleSize;
    noMargin?: boolean;
    center?: boolean;
    capitalize?: boolean;
  }>(),
  {
    level: 1,
    center: false,
    capitalize: false,
  },
);

const LEVEL_TO_SIZE_MAP: Record<TitleLevel, TitleSize> = {
  1: '3xl',
  2: '2xl',
  3: 'xl',
  4: 'lg',
  5: 'md',
  6: 'sm',
};

const sizeClass = computed(() => {
  if (props.size) return `text-${props.size}`;
  return `text-${LEVEL_TO_SIZE_MAP[props.level]}`;
});
</script>

<style lang="scss" scoped>
.app-title {
  font-family: var(--headline-font-family);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-sm);
  color: var(--fg);

  &.no-margin {
    margin-bottom: 0;
  }
}

.text-xs {
  font-size: var(--font-size-xs);
}
.text-sm {
  font-size: var(--font-size-sm);
}
.text-md {
  font-size: var(--font-size-md);
}
.text-lg {
  font-size: var(--font-size-lg);
}
.text-xl {
  font-size: var(--font-size-xl);
}
.text-2xl {
  font-size: var(--font-size-2xl);
}
.text-3xl {
  font-size: var(--font-size-3xl);
}

.center {
  text-align: center;
}

</style>
