<template>
  <div :class="gridClass" :style="gridStyles">
    <component :is="'style'" v-if="layoutCss">{{ layoutCss }}</component>
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { StyleSize } from 'orgnote-api';
import {
  BREAKPOINTS,
  RESPONSIVE_BREAKPOINTS,
  type ResponsiveBreakpoint,
} from 'src/constants/breakpoints';

type GridSpan = number | string;

interface ItemLayout {
  span?: GridSpan;
  rowSpan?: GridSpan;
  col?: GridSpan;
  row?: GridSpan;
}

interface ResponsiveItemLayout extends ItemLayout {
  mobile?: ItemLayout;
  tablet?: ItemLayout;
  desktop?: ItemLayout;
}

export interface AppGridProps {
  cols?: number | string;
  gap?: StyleSize;
  responsive?: {
    mobile?: number | string;
    tablet?: number | string;
    desktop?: number | string;
  };
  layout?: ResponsiveItemLayout[];
}

const props = withDefaults(defineProps<AppGridProps>(), {
  cols: 1,
  gap: 'md',
  layout: () => [],
});

const uid = `app-grid-${Math.random().toString(36).slice(2, 11)}`;
const gridClass = computed(() => ['app-grid', uid]);

const formatCols = (val?: number | string): string | undefined => {
  if (val === undefined) return undefined;
  if (typeof val === 'number') {
    return `repeat(${val}, minmax(0, 1fr))`;
  }
  return val;
};

const formatSpan = (val?: GridSpan): string | undefined => {
  if (val === undefined) return undefined;
  if (typeof val === 'number') return `span ${val}`;
  return val;
};

const formatRowSpan = (val?: GridSpan): string | undefined => {
  if (val === undefined) return undefined;
  if (typeof val === 'number') return `span ${val}`;
  return val;
};

const getMinWidth = (breakpoint?: ResponsiveBreakpoint): string | undefined => {
  if (!breakpoint) return undefined;
  const minWidth = BREAKPOINTS[breakpoint];
  if (!minWidth) return undefined;
  return `${minWidth}px`;
};

const gridStyles = computed(() => {
  const styles: Record<string, string | undefined> = {
    '--grid-gap': `var(--gap-${props.gap})`,
    '--grid-cols-base': formatCols(props.cols),
  };

  if (!props.responsive) return styles;

  (['mobile', ...RESPONSIVE_BREAKPOINTS] as const).forEach((breakpoint) => {
    const value = props.responsive?.[breakpoint];
    if (value === undefined) return;
    styles[`--grid-cols-${breakpoint}`] = formatCols(value);
  });

  return styles;
});

const generateItemCss = (
  selector: string,
  config: ItemLayout,
  breakpoint?: ResponsiveBreakpoint,
): string => {
  const rules: string[] = [];
  if (config.span) rules.push(`grid-column: ${formatSpan(config.span)};`);
  if (config.rowSpan) rules.push(`grid-row: ${formatRowSpan(config.rowSpan)};`);
  if (config.col) rules.push(`grid-column-start: ${config.col};`);
  if (config.row) rules.push(`grid-row-start: ${config.row};`);

  if (rules.length === 0) return '';

  const ruleBlock = `${selector} { ${rules.join(' ')} }`;

  const minWidth = getMinWidth(breakpoint);
  if (!minWidth) return ruleBlock;

  return `@media (min-width: ${minWidth}) { ${ruleBlock} }`;
};

const layoutCss = computed(() => {
  if (!props.layout || props.layout.length === 0) return '';

  let css = '';
  props.layout.forEach((itemConfig, index) => {
    const selector = `.${uid} > *:nth-child(${index + 1})`;

    css += generateItemCss(selector, itemConfig);

    RESPONSIVE_BREAKPOINTS.forEach((breakpoint) => {
      const responsiveConfig = itemConfig[breakpoint];
      if (responsiveConfig) css += generateItemCss(selector, responsiveConfig, breakpoint);
    });
  });

  return css;
});
</script>

<style lang="scss" scoped>
.app-grid {
  display: grid;
  gap: var(--grid-gap);
  grid-template-columns: var(--grid-cols-base);
  width: 100%;

  @include tablet-above {
    grid-template-columns: var(--grid-cols-tablet, var(--grid-cols-base));
  }

  @include desktop {
    grid-template-columns: var(--grid-cols-desktop, var(--grid-cols-tablet, var(--grid-cols-base)));
  }
}
</style>
