<template>
  <img
    class="app-icon"
    :class="{ monochrome }"
    src="/icons/modern-unicorn-round.png"
    alt="logo text"
    :width="size"
    :height="size"
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    size?: string | number;
    monochrome?: boolean;
  }>(),
  {
    size: 180,
  },
);

const size = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size));
</script>

<style lang="scss" scoped>
.app-icon {
  &.monochrome {
    filter: grayscale(100%);
  }
}
</style>
