<template>
  <app-flex
    row
    center
    align-center
    class="buffer-content"
    :class="{ 'no-padding-bottom': noPaddingBottom }"
  >
    <content-frame :constrained="constrained" full-height>
      <slot />
    </content-frame>
  </app-flex>
</template>

<script lang="ts" setup>
import ContentFrame from 'src/components/ContentFrame.vue';
import AppFlex from 'src/components/AppFlex.vue';

defineProps<{
  noPaddingBottom?: boolean;
  constrained?: boolean;
}>();
</script>

<style lang="scss" scoped>
.buffer-content {
  height: 100%;
  box-sizing: border-box;
  --content-frame-max-width: var(--buffer-content-max-width);

  @include tablet-below {
    padding-top: var(--main-header-total-height);
    padding-bottom: var(--floating-padding-bottom);

    &.no-padding-bottom {
      padding-bottom: 0;
    }
  }
}
</style>
