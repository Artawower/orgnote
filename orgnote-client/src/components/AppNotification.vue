<template>
  <app-flex
    gap="sm"
    align-center
    class="notification-item"
    :class="[
      `notification-${notificationType}`,
      { clickable, unread, flat },
    ]"
    @click="emit('click')"
  >
    <component v-if="iconComponent" :is="iconComponent" size="sm" />
    <app-icon v-else-if="iconString" :name="iconString" :color="resolvedIconColor" size="sm" />

    <app-flex column start align-start gap="xs" class="notification-content">
      <span class="notification-message" :class="{ truncated: truncateMessage }">
        <span v-if="htmlMessage" v-html-safe="htmlMessage"></span>
        <span v-else>{{ message }}</span>
        <app-badge
          v-if="count && count > 1"
          :label="String(count)"
          size="xs"
          rounded
          class="notification-badge"
        />
      </span>

      <span v-if="caption" class="notification-caption">
        {{ caption }}
      </span>
    </app-flex>

    <action-button
      v-if="closable"
      icon="close"
      size="xs"
      class="notification-close"
      @click.stop="emit('close')"
    />
  </app-flex>
</template>

<script setup lang="ts">
import type { CommandIcon, StyleVariant, ThemeVariable } from 'orgnote-api';
import { computed } from 'vue';
import AppBadge from './AppBadge.vue';
import AppFlex from './AppFlex.vue';
import AppIcon from './AppIcon.vue';
import ActionButton from './ActionButton.vue';
import { useResolvedIcon } from 'src/composables/use-resolved-icon';
import { CARD_TYPE_TO_BACKGROUND } from 'src/constants/card-type-to-background';
import { STYLE_VARIANT_ICONS } from 'src/constants/style-variant-icons';

const props = withDefaults(
  defineProps<{
    type?: StyleVariant | string;
    icon?: CommandIcon;
    iconEnabled?: boolean;
    iconColor?: ThemeVariable;
    message?: string;
    htmlMessage?: string;
    caption?: string;
    count?: number;
    closable?: boolean;
    clickable?: boolean;
    unread?: boolean;
    truncateMessage?: boolean;
    flat?: boolean;
  }>(),
  {
    type: 'info',
    closable: true,
    clickable: false,
    iconEnabled: true,
    unread: false,
    truncateMessage: false,
    flat: false,
  },
);

const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'close'): void;
}>();

const notificationType = computed(() => props.type as StyleVariant);

const fallbackIcon = computed(() => {
  if (props.iconEnabled === false) return undefined;
  return STYLE_VARIANT_ICONS[notificationType.value];
});

const resolvedIcon = computed(() => props.icon ?? fallbackIcon.value);
const resolvedIconColor = computed(() => props.iconColor ?? CARD_TYPE_TO_BACKGROUND[notificationType.value]);

const { iconString, iconComponent } = useResolvedIcon(resolvedIcon);
</script>

<style lang="scss" scoped>
.notification-item {
  @include interactive-no-select;
  padding: var(--notification-padding);
  border-radius: var(--notification-radius);
  background: var(--notification-bg);
  color: var(--notification-fg);
  border: var(--notification-border);
  box-shadow: var(--notification-shadow);
  max-width: var(--notification-max-width);
  pointer-events: auto;
  width: 100%;
  min-width: var(--notification-min-width);

  &.flat {
    border: 0;
    box-shadow: none;
  }

  &.clickable {
    cursor: pointer;
    transition: filter 0.2s;

    @include hover {
      filter: brightness(1.1);
    }
  }
}

@include for-each-view-type using ($type, $color) {
  .notification-#{$type} {
    background: color-mix(in srgb, $color, var(--bg) 80%);
    color: var(--fg);
    border-color: $color;
  }
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-message {
  font-size: var(--notification-message-font-size);
  font-weight: var(--notification-message-font-weight);
}

.notification-message.truncated {
  @include line-limit(1);
  display: block;
}

.notification-caption {
  font-size: var(--notification-caption-font-size);
  opacity: var(--notification-caption-opacity);
}

.notification-close {
  opacity: var(--notification-close-opacity);
}

.unread .notification-message {
  font-weight: var(--font-weight-bold);
}
</style>
