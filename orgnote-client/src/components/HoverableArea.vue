<template>
  <component
    :is="tag"
    class="hoverable-area"
    :class="{ 'has-border': bordered }"
  >
    <slot />
  </component>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    tag?: string;
    bordered?: boolean;
  }>(),
  {
    tag: 'div',
    bordered: true,
  },
);
</script>

<style lang="scss" scoped>
.hoverable-area {
  position: relative;

  &.has-border {
    @include hoverable-area;
  }

}
</style>