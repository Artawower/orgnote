<template>
  <app-flex
    class="icon"
    :style="iconStyle"
    :class="[{ rounded, bordered }, sizeClass, $attrs.class]"
    :center="center"
    align-center
  >
    <q-icon v-bind="$props" color="inherit" :size="iconSize" />
  </app-flex>
</template>

<script lang="ts" setup>
defineOptions({
  inheritAttrs: false,
});
import type { StyleSize, ThemeVariable } from 'orgnote-api';
import type { QIconProps } from 'quasar';
import { getCssVariableName } from 'src/utils/css-utils';
import { computed } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';

interface Props {
  color?: ThemeVariable;
  background?: string;
  size?: StyleSize | (string & {});
  rounded?: boolean;
  bordered?: boolean;
  center?: boolean;
}

const props = withDefaults(defineProps<QIconProps & Props>(), {
  size: 'md',
  center: true,
});

const bgColor = computed(() => props.background && getCssVariableName(props.background));
const color = computed(() => (props.color ? getCssVariableName(props.color) : undefined));

const iconSizeMap: { [key in StyleSize]?: string } = {
  xs: '0.875em',
  sm: '1.125em',
  md: '1.375em',
  lg: '1.75em',
  xl: '2em',
};

const predefinedSizes = ['xs', 'sm', 'md', 'lg', 'xl'];

const sizeClass = computed(() => {
  if (predefinedSizes.includes(props.size)) {
    return `icon-${props.size}`;
  }
  return '';
});

const iconSize = computed(() => {
  if (props.size in iconSizeMap) {
    return iconSizeMap[props.size as StyleSize];
  }
  return props.size;
});

const iconStyle = computed(() => {
  const style: Record<string, string> = {};
  if (bgColor.value) style.backgroundColor = bgColor.value;
  if (color.value) style.color = color.value;

  if (!predefinedSizes.includes(props.size)) {
    style.width = props.size;
    style.height = props.size;
    style.minWidth = props.size;
    style.minHeight = props.size;
  }

  return Object.keys(style).length > 0 ? style : undefined;
});
</script>

<style lang="scss">
.icon {
  $icon-sizes: (
    xs: var(--icon-size-xs),
    sm: var(--icon-size-sm),
    md: var(--icon-size-md),
    lg: var(--icon-size-lg),
    xl: var(--icon-size-xl),
  );

  @each $size, $value in $icon-sizes {
    &.icon-#{$size} {
      width: $value;
      height: $value;
      min-width: $value;
      min-height: $value;
    }
  }
}

.icon.rounded {
  border-radius: var(--icon-rounded-radius);
  padding: 2px;
  box-sizing: border-box;
}

.bordered {
  border: var(--icon-border);
  padding: var(--icon-border-padding);
  border-radius: var(--icon-radius);
}
</style>
