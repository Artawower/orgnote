<template>
  <div class="page page-container">
    <content-frame :padding="padding" :constrained="constrained" full-height>
      <app-flex column :justify="contentJustify" :align="contentAlign" full-height full-width>
        <slot />
      </app-flex>
    </content-frame>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';
import ContentFrame from 'src/components/ContentFrame.vue';
import type { AppFlexAlign, AppFlexJustify } from './app-flex.types';

const props = defineProps<{
  padding?: boolean;
  constrained?: boolean;
  centered?: boolean;
}>();

const contentJustify = computed<AppFlexJustify>(() => (props.centered ? 'center' : 'between'));
const contentAlign = computed<AppFlexAlign>(() => (props.centered ? 'center' : 'stretch'));
</script>

<style lang="scss" scoped>
.page {
  @include fit();

  & {
    --content-frame-padding: var(--page-padding);
    --content-frame-max-width: var(--page-max-width);

    background: var(--bg);
    position: relative;
  }
}
</style>
