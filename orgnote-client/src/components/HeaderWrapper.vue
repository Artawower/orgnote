<template>
  <app-flex
    class="header-wrapper"
    :style="paddingStyle"
    direction="row"
    justify="start"
    align="center"
    gap="md"
  >
    <slot />
  </app-flex>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StyleSize } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';

const props = withDefaults(
  defineProps<{
    padding?: StyleSize;
  }>(),
  {
    padding: 'md',
  },
);

const paddingStyle = computed(() => ({
  padding: `var(--padding-${props.padding})`,
}));
</script>

<style scoped lang="scss">
.header-wrapper {
  @include desktop-below {
    padding-top: var(--padding-sm);
    padding-bottom: var(--padding-sm);
  }
}
</style>
