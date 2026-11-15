<template>
  <div class="description capitalize" :class="[type ?? '', { padded, center }]">
    <slot>
      <template v-if="text">{{ title ? t(text).toUpperCase() : t(text) }} </template>
    </slot>
  </div>
</template>

<script lang="ts" setup>
import type { StyleVariant } from 'orgnote-api';
import { useI18n } from 'vue-i18n';
defineProps<{
  text?: string;
  title?: boolean;
  type?: StyleVariant;
  padded?: boolean;
  center?: boolean;
}>();

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>

<style lang="scss" scoped>
.description {
  color: var(--fg-muted);
  font-size: var(--font-size-sm);
  width: 100%;
  padding: 0;
  margin: 0;

  &.padded {
    padding: var(--description-padding);
  }
}

.warning {
  color: color-mix(in srgb, var(--yellow), var(--fg-muted) 50%);
}

.danger {
  color: color-mix(in srgb, var(--red), var(--fg-muted) 50%);
}

.info {
  color: color-mix(in srgb, var(--blue), var(--fg-muted) 50%);
}

.center {
  text-align: center;
}
</style>
