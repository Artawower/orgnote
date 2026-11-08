<template>
  <component :is="tag" class="flex-container" :class="classes" :style="styles" v-bind="$attrs">
    <slot />
  </component>
</template>

<script lang="ts" setup>
import { computed, type CSSProperties } from 'vue';
import { type StyleSize, STYLE_SIZES } from 'orgnote-api';
import type {
  AppFlexAlign,
  AppFlexDirection,
  AppFlexGap,
  AppFlexJustify,
  AppFlexTag,
} from './app-flex.types';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    direction?: AppFlexDirection;
    justify?: AppFlexJustify;
    align?: AppFlexAlign;
    gap?: AppFlexGap;
    inline?: boolean;
    tag?: AppFlexTag;

    row?: boolean;
    column?: boolean;
    rowReverse?: boolean;
    columnReverse?: boolean;
    reverse?: boolean;

    start?: boolean;
    center?: boolean;
    end?: boolean;
    between?: boolean;
    around?: boolean;
    evenly?: boolean;

    alignStart?: boolean;
    alignCenter?: boolean;
    alignEnd?: boolean;
    alignStretch?: boolean;
    alignBaseline?: boolean;
    fullWidth?: boolean;
    fullHeight?: boolean;
    fit?: boolean;
  }>(),
  {
    direction: 'row',
    justify: 'between',
    align: 'center',
    gap: '0px',
    inline: false,
    tag: 'div',
    row: false,
    column: false,
    rowReverse: false,
    columnReverse: false,
    reverse: false,
    start: false,
    center: false,
    end: false,
    between: false,
    around: false,
    evenly: false,
    alignStart: false,
    alignCenter: false,
    alignEnd: false,
    alignStretch: false,
    alignBaseline: false,
    fullWidth: false,
    fullHeight: false,
    fit: false,
  },
);

const computedDirection = computed(() => {
  if (props.columnReverse) return 'column-reverse';
  if (props.rowReverse) return 'row-reverse';
  if (props.column) return props.reverse ? 'column-reverse' : 'column';
  if (props.row) return props.reverse ? 'row-reverse' : 'row';
  if (props.reverse) return `${props.direction}-reverse`;
  return props.direction;
});

const computedJustify = computed(() => {
  if (props.start) return 'start';
  if (props.center) return 'center';
  if (props.end) return 'end';
  if (props.between) return 'between';
  if (props.around) return 'around';
  if (props.evenly) return 'evenly';
  return props.justify;
});

const computedAlign = computed(() => {
  if (props.alignStart) return 'start';
  if (props.alignCenter) return 'center';
  if (props.alignEnd) return 'end';
  if (props.alignStretch) return 'stretch';
  if (props.alignBaseline) return 'baseline';
  return props.align;
});

const classes = computed(() => [
  `d-${computedDirection.value}`,
  `j-${computedJustify.value}`,
  `a-${computedAlign.value}`,
  props.fullWidth && 'full-width',
  props.fullHeight && 'full-height',
  props.fit && 'fit',
  props.inline && 'inline',
  STYLE_SIZES.includes(props.gap as StyleSize) && `gap-${props.gap}`,
]);

const styles = computed<CSSProperties | undefined>(() => {
  if (props.gap === '0px' || STYLE_SIZES.includes(props.gap as StyleSize)) {
    return undefined;
  }
  return { gap: props.gap };
});

defineExpose({
  computedDirection,
  computedJustify,
  computedAlign,
});
</script>

<style lang="scss" scoped>
.flex-container {
  display: flex;

  &.full-width {
    width: 100%;
  }

  &.full-height {
    height: 100%;
  }

  &.fit {
    width: fit-content;
    height: fit-content;
  }

  &.inline {
    display: inline-flex;
  }

  &.d-row {
    flex-direction: row;
  }
  &.d-column {
    flex-direction: column;
  }
  &.d-row-reverse {
    flex-direction: row-reverse;
  }
  &.d-column-reverse {
    flex-direction: column-reverse;
  }

  &.j-start {
    justify-content: flex-start;
  }
  &.j-center {
    justify-content: center;
  }
  &.j-end {
    justify-content: flex-end;
  }
  &.j-between {
    justify-content: space-between;
  }
  &.j-around {
    justify-content: space-around;
  }
  &.j-evenly {
    justify-content: space-evenly;
  }

  &.a-start {
    align-items: flex-start;
  }
  &.a-center {
    align-items: center;
  }
  &.a-end {
    align-items: flex-end;
  }
  &.a-stretch {
    align-items: stretch;
  }
  &.a-baseline {
    align-items: baseline;
  }

  &.gap-xs {
    gap: var(--gap-xs);
  }
  &.gap-sm {
    gap: var(--gap-sm);
  }
  &.gap-md {
    gap: var(--gap-md);
  }
  &.gap-lg {
    gap: var(--gap-lg);
  }
  &.gap-xl {
    gap: var(--gap-xl);
  }
}
</style>
