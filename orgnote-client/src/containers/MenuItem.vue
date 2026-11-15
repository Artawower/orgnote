<template>
  <app-flex
    class="menu-item"
    role="button"
    :aria-disabled="disabled"
    :class="[{ disabled }, type, `prefer-${prefer}`, `size-${size}`, { active }]"
    :style="{ '--current-menu-item-height': itemHeight, gap: 'var(--menu-item-content-gap)' }"
    column
    start
    align-center
  >
    <app-flex class="header" row between align-center gap="md">
      <app-flex class="left" :class="{ flat }" row start align-center gap="sm">
        <app-icon
          v-if="icon"
          :name="icon"
          size="sm"
          :background="flat ? 'transparent' : inverseIconColors ? background : color"
          :color="flat ? color : inverseIconColors ? color : background"
          :rounded="true"
        ></app-icon>
        <div :class="['label', { capitalize }]" :style="{ color: getCssVariableName(color) }">
          <slot />
        </div>
      </app-flex>
      <app-flex
        v-if="slots.right || narrow || selected"
        class="right"
        row
        end
        align-center
        gap="sm"
      >
        <slot name="right" />
        <app-icon
          v-if="narrow"
          name="sym_o_arrow_forward_ios"
          size="xs"
          :color="active ? 'accent' : 'fg-muted'"
        />
        <app-icon v-else-if="selected" name="sym_o_check" color="accent" size="sm" />
      </app-flex>
    </app-flex>
    <div v-if="slots.content" class="content">
      <slot name="content" />
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import type { StyleSize, StyleVariant, ThemeVariable } from 'orgnote-api';
import AppIcon from 'src/components/AppIcon.vue';
import { CARD_TYPE_TO_BACKGROUND } from 'src/constants/card-type-to-background';
import { getCssVariableName } from 'src/utils/css-utils';
import { useSlots } from 'vue';
import { computed } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';

const props = withDefaults(
  defineProps<{
    icon?: string;
    narrow?: boolean;
    disabled?: boolean;
    active?: boolean;
    type?: StyleVariant;
    size?: StyleSize;
    selected?: boolean;
    inverseIconColors?: boolean;
    prefer?: 'left' | 'right';
    flat?: boolean;
    capitalize?: boolean;
  }>(),
  {
    type: 'plain',
    prefer: 'left',
    size: 'auto',
    flat: true,
    capitalize: true,
  },
);

const typeColorMap: { [key in StyleVariant]?: ThemeVariable } = {
  ...CARD_TYPE_TO_BACKGROUND,
  plain: 'fg',
};

const slots = useSlots();
const color = computed<ThemeVariable>(() =>
  props.active ? 'accent' : typeColorMap[props.type] || 'fg',
);
const background = computed<ThemeVariable>(() => 'bg');

const itemHeightMap: Record<StyleSize, string> = {
  xs: 'var(--menu-item-height-xs)',
  sm: 'var(--menu-item-height-sm)',
  md: 'var(--menu-item-height-md)',
  lg: 'var(--menu-item-height-lg)',
  xl: 'var(--menu-item-height-xl)',
  auto: 'var(--menu-item-height)',
};
const itemHeight = computed(() => itemHeightMap[props.size]);
</script>

<style lang="scss" scoped>
.menu-item {
  & {
    @include interactive-no-select;
    cursor: pointer;
    min-height: var(--menu-item-min-height, var(--current-menu-item-height));
    height: auto;
    width: 100%;
    position: relative;
    border-radius: var(--menu-item-radius);
    padding:
      var(--menu-item-padding-top, var(--menu-item-padding-y))
      var(--menu-item-padding-x)
      var(--menu-item-padding-bottom, var(--menu-item-padding-y))
      var(--menu-item-padding-x);
  }

  @include hover {
    background-color: var(--menu-item-hover-bg);
  }

  &:active {
    background-color: var(--menu-item-hover-bg);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.header {
  & {
    width: 100%;
    flex: 1;
  }
}

.left {
  &.flat {
    gap: var(--gap-sm);
  }

  & {
    white-space: nowrap;
  }
}

.prefer-left {
  .left {
    flex: 1;
    min-width: 0;
  }
}

.prefer-right {
  .left {
    flex: 1;
    min-width: 0;
  }

  .right {
    width: auto;
  }
}

.label,
.content {
  width: 100%;
  min-width: 0;
}

.right {
  flex-shrink: 0;
}

.left,
.right {
  height: 100%;
}

.active {
  --fg: var(--menu-item-active-fg);
  color: var(--menu-item-active-fg);
  background-color: var(--menu-item-active-bg);
  border-radius: var(--menu-item-active-radius);
}
</style>
