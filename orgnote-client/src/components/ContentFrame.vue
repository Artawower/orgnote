<template>
  <div class="content-frame" :class="{ constrained, padding, 'full-height': fullHeight }">
    <slot />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  constrained?: boolean;
  padding?: boolean;
  fullHeight?: boolean;
}>();
</script>

<style lang="scss" scoped>
.content-frame {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  &.full-height {
    height: 100%;
  }

  &.padding {
    padding: var(--content-frame-padding, var(--page-padding));
  }

  &.constrained {
    max-width: var(--content-frame-max-width, var(--content-max-width));
    margin-left: auto;
    margin-right: auto;
  }
}
</style>
