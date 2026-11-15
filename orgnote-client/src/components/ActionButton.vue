<template>
  <component
    :is="buttonTag"
    @click="onButtonClick"
    v-bind="dynamicAttrs"
    :class="[
      `icon-${size}`,
      active,
      {
        outline,
        border,
        text: slots.text,
        'hover-effect': hoverEffect,
        'hover-background': hoverBackground,
        'auto-width': autoWidth,
        [`variant-${variant}`]: true,
      },
      props.classes,
    ]"
    :style="{
      '--action-border-color': getCssVariableName(activeColor),
      '--btn-action-hover-color': safeHoverColor,
      color: getCssVariableName(activeColor),
    }"
  >
    <animation-wrapper v-if="activeIcon || slots.icon">
      <slot name="icon" :size="size" :color="activeColor">
        <app-icon :key="activeIcon" :name="activeIcon" :size="size" :color="activeColor" />
      </slot>
    </animation-wrapper>
    <slot name="text" />
    <slot />
  </component>
</template>

<script lang="ts" setup>
import AppIcon from './AppIcon.vue';
import AnimationWrapper from './AnimationWrapper.vue';
import { computed, ref, useSlots } from 'vue';
import { ICON_CHANGE_DURATION } from 'src/constants/animations';
import { getCssVariableName } from 'src/utils/css-utils';
// TODO: feat/stable-beta wrong place to logic
import { copyToClipboard } from 'src/utils/clipboard';
import type { StyleSize, ThemeVariable } from 'orgnote-api';

export type ButtonAlignment = 'center' | 'space-between' | 'left' | 'right';
export type ActionButtonVariant = 'default' | 'text';

export interface ActionButtonProps {
  as?: 'button' | 'div';
  disableClickHandling?: boolean;
  icon?: string;
  active?: boolean;
  size?: StyleSize;
  color?: ThemeVariable;
  fireIcon?: string;
  fireColor?: ThemeVariable;
  outline?: boolean;
  hoverColor?: ThemeVariable;
  hoverEffect?: boolean;
  hoverBackground?: boolean;
  border?: boolean;
  classes?: string;
  copyText?: string;
  alignment?: ButtonAlignment;
  autoWidth?: boolean;
  variant?: ActionButtonVariant;
}

const props = withDefaults(defineProps<ActionButtonProps>(), {
  active: false,
  size: 'md',
  color: 'fg',
  classes: '',
  fireColor: 'red',
  alignment: 'center',
  hoverEffect: true,
  hoverBackground: true,
  variant: 'default',
});

const fired = ref<boolean>(false);

const activeIcon = computed(() => (fired.value ? props.fireIcon : props.icon));
const activeColor = computed(() => (fired.value ? (props.fireColor ?? props.color) : props.color));
const safeHoverColor = computed(() => props.hoverColor && getCssVariableName(props.hoverColor));
const buttonTag = computed(() => props.as ?? 'button');
const dynamicAttrs = computed(() => {
  if (buttonTag.value === 'div') {
    return {
      role: 'button',
      tabindex: 0,
    };
  }

  return {
    type: 'button',
  };
});

const onButtonClick = async () => {
  if (props.disableClickHandling) {
    return;
  }

  if (props.copyText) {
    await copyToClipboard(props.copyText);
  }

  if (!props.fireIcon) {
    return;
  }

  fired.value = true;

  setTimeout(() => {
    fired.value = false;
  }, ICON_CHANGE_DURATION);
};

const slots = useSlots();
</script>

<style lang="scss" scoped>
button,
[role='button'] {
  @include flexify(row, v-bind(alignment), center, var(--gap-sm));
  @include interactive-no-select;

  & {
    padding: var(--btn-action-padding);
    border-radius: var(--btn-action-radius, var(--border-radius-md));
    color: var(--btn-action-fg);
    cursor: pointer;
    border: var(--btn-action-border);
    box-sizing: border-box;
    background: transparent;
  }

  &.icon-xs,
  &.icon-sm,
  &.icon-md,
  &.icon-lg,
  &.icon-xl {
    padding: 0;
  }

  &.icon-xs {
    width: var(--btn-action-xs-size);
    height: var(--btn-action-xs-size);
    min-width: var(--btn-action-xs-size);
    min-height: var(--btn-action-xs-size);
    border-radius: var(--btn-action-radius, var(--border-radius-xs));
  }

  &.icon-sm {
    width: var(--btn-action-sm-size);
    height: var(--btn-action-sm-size);
    min-width: var(--btn-action-sm-size);
    min-height: var(--btn-action-sm-size);
    border-radius: var(--btn-action-radius, var(--border-radius-sm));
  }

  &.icon-md {
    width: var(--btn-action-md-size);
    height: var(--btn-action-md-size);
    min-width: var(--btn-action-md-size);
    min-height: var(--btn-action-md-size);
    border-radius: var(--btn-action-radius, var(--border-radius-md));
  }

  &.icon-lg {
    width: var(--btn-action-lg-size);
    height: var(--btn-action-lg-size);
    min-width: var(--btn-action-lg-size);
    min-height: var(--btn-action-lg-size);
    border-radius: var(--btn-action-radius, var(--border-radius-lg));
  }

  &.icon-xl {
    width: var(--btn-action-xl-size);
    height: var(--btn-action-xl-size);
    min-width: var(--btn-action-xl-size);
    min-height: var(--btn-action-xl-size);
    border-radius: var(--btn-action-radius, var(--border-radius-xl));
  }

  &.text {
    width: var(--btn-action-text-width);
    padding-inline: var(--btn-action-text-padding-x);

    &.auto-width {
      width: auto;
    }
  }

  & {
    transition: var(--btn-action-transition);
  }

  &.hover-effect.hover-background:not(.outline) {
    @include hover {
      background: var(--btn-action-hover-bg);
      filter: brightness(var(--btn-action-hover-brightness));
      transform: scale(var(--btn-action-hover-scale));
    }

    &:active {
      background: var(--btn-action-hover-bg);
      filter: brightness(var(--btn-action-hover-brightness));
      transform: scale(var(--btn-action-active-scale));
    }
  }

  &.active {
    background: var(--btn-action-active-bg);
    color: var(--btn-action-active-fg);
  }

  &:disabled,
  &[aria-disabled='true'] {
    opacity: var(--disabled-opacity);
    cursor: not-allowed;
    pointer-events: none;
  }

  &.border {
    border: var(--border-default);
    border-color: var(--action-border-color, var(--border-default));
  }

  &.hover-effect {
    @include hover {
      border-color: color-mix(
        in srgb,
        var(--action-border-color, var(--border-default)),
        20% black
      );

      .icon {
        color: var(
          --btn-action-hover-color,
          color-mix(in srgb, var(--action-border-color, var(--border-default)), 20% black)
        ) !important;
      }
    }
  }

  &.variant-text {
    align-self: flex-start;
    width: fit-content;
    height: auto;
    min-width: 0;
    min-height: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    font: inherit;
    transform: none;

    &.text.auto-width {
      padding-inline: 0;
    }

    &.hover-effect.hover-background:not(.outline) {
      @include hover {
        background: transparent;
        filter: brightness(var(--btn-action-text-hover-brightness, 0.85));
        transform: none;
      }

      &:active {
        background: transparent;
        filter: brightness(var(--btn-action-text-hover-brightness, 0.85));
        transform: none;
      }
    }

    &.hover-effect {
      @include hover {
        border-color: transparent;
      }
    }
  }
}
</style>
