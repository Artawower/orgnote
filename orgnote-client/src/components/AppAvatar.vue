<template>
  <app-flex center alignt-center class="app-avatar" :class="[`size-${size}`]">
    <img v-if="url" :src="url" :alt="alt" class="avatar-image" />
    <app-icon v-else name="sym_o_person" :size="size" color="fg-muted" class="avatar-fallback" />
  </app-flex>
</template>

<script lang="ts" setup>
import type { StyleSize } from 'orgnote-api';
import AppIcon from './AppIcon.vue';
import AppFlex from './AppFlex.vue';

withDefaults(
  defineProps<{
    url?: string;
    alt?: string;
    size?: StyleSize;
  }>(),
  {
    alt: 'User avatar',
    size: 'lg',
  },
);
</script>

<style lang="scss" scoped>
.app-avatar {
  --avatar-size: 64px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--bg-elevated);
  flex-shrink: 0;

  &.size-xs {
    --avatar-size: 24px;
  }

  &.size-sm {
    --avatar-size: 32px;
  }

  &.size-md {
    --avatar-size: 48px;
  }

  &.size-lg {
    --avatar-size: 64px;
  }

  &.size-xl {
    --avatar-size: 96px;
  }

  width: var(--avatar-size);
  height: var(--avatar-size);
  min-width: var(--avatar-size);
  min-height: var(--avatar-size);
}

.avatar-image {
  width: var(--avatar-size);
  height: var(--avatar-size);
  object-fit: cover;
}

.avatar-fallback {
  @include fit;
}
</style>
