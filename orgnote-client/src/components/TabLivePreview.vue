<template>
  <app-flex @click="$emit('select')" class="preview-container" column align-center gap="sm">
    <div class="tab-preview" :class="{ active }">
      <action-button
        class="close-icon"
        icon="sym_o_close"
        size="sm"
        @click.stop="$emit('close')"
        hover-color="violet"
      />
      <div class="preview-content" inert>
        <div v-if="tab.router" class="scaled-router-view">
          <scoped-router-view :router="tab.router" />
        </div>
      </div>
    </div>
    <div class="tab-title">{{ title }}</div>
  </app-flex>
</template>

<script setup lang="ts">
import type { Tab } from 'orgnote-api';
import ScopedRouterView from 'src/components/ScopedRouterView.vue';
import { provide, shallowRef, computed } from 'vue';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import { generateTabTitle } from 'src/utils/generate-tab-title';
import ActionButton from './ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';

const props = defineProps<{
  tab: Tab;
  active?: boolean;
}>();

const tabRouter = shallowRef(props.tab.router);
provide(TAB_ROUTER_KEY, tabRouter);

const title = computed(() => {
  return generateTabTitle(props.tab.router.currentRoute.value) || props.tab.title;
});

defineEmits<{
  select: [];
  close: [];
}>();
</script>

<style lang="scss" scoped>
.preview-container {
  @include interactive-no-select;
  cursor: pointer;
}

.tab-preview {
  border: var(--tab-preview-border);
  position: relative;
  border-radius: var(--border-radius-lg);
  background: var(--bg);
  position: relative;
  width: 100%;
  aspect-ratio: 0.85;
  overflow: hidden;
  box-shadow: var(--shadow-md);

  &.active {
    border: var(--tab-preview-active-border);
  }
}

.scaled-router-view {
  transform: scale(0.25);
  transform-origin: top left;
  width: 400%;
  height: 400%;
  pointer-events: none;
  position: absolute;
}

.preview-overlay {
  & {
    width: 100%;
    position: absolute;
    height: var(--tab-preview-header-height);
    z-index: 10;
    padding: var(--tab-preview-overlay-padding);
  }
}

.tab-title {
  @include line-limit(1);

  & {
    color: var(--fg);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    flex: 1;
    text-align: center;
  }
}

.preview-content {
  pointer-events: none;
  @include interactive-no-select;

  --device-padding-bottom: 0px;
  --window-title-bar-height: 0px;

  :deep(*) {
    pointer-events: none !important;
    user-select: none !important;
    caret-color: transparent !important;
  }

  :deep(.safe-area) {
    padding: 0 !important;
  }
}

.close-icon {
  position: absolute;
  top: var(--padding-md);
  right: var(--padding-md);
  z-index: 3;
}
</style>
