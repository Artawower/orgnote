<template>
  <div v-if="layout.type === 'pane'" :data-testid="`pane-${layout.paneId}`" class="layout-pane">
    <slot :pane-id="layout.paneId" />
  </div>
  <div v-if="layout.type === 'split'" :class="['layout-split', layout.orientation]">
    <template v-for="(child, index) in layout.children" :key="child.id">
      <div class="layout-split-child" :style="getChildStyle(index)">
        <LayoutRenderer :layout="child">
          <template #default="{ paneId }">
            <slot :pane-id="paneId" />
          </template>
        </LayoutRenderer>
      </div>
      <ResizeSplitter
        v-if="index < layout.children.length - 1"
        :orientation="layout.orientation"
        :active="resizeStates[index]?.isResizing.value ?? false"
        @resize-start="(e) => resizeStates[index]?.handleResizeStart(e)"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { LayoutNode, LayoutSplitNode } from 'orgnote-api';
import ResizeSplitter from 'src/components/ResizeSplitter.vue';
import { computed, shallowRef, watch } from 'vue';
import { api } from 'src/boot/api';
import type { CSSProperties } from 'vue';
import { usePaneResize } from 'src/composables/use-pane-resize';

type ResizeState = ReturnType<typeof usePaneResize>;

defineOptions({
  name: 'LayoutRenderer',
});

const props = defineProps<{
  layout: LayoutNode;
}>();

defineSlots<{
  default(props: { paneId: string }): unknown;
}>();

const layoutStore = api.core.useLayout();

const splitterCount = computed((): number => {
  if (props.layout.type !== 'split') return 0;
  return props.layout.children.length - 1;
});

const normalizedSizes = computed((): number[] => {
  if (props.layout.type !== 'split') return [];

  const splitLayout = props.layout;
  const sizes = splitLayout.sizes;

  if (!sizes || sizes.length === 0) {
    const count = splitLayout.children.length;
    return Array(count).fill(100 / count);
  }

  return layoutStore.normalizeSizes(sizes);
});

const getChildStyle = (index: number): CSSProperties => {
  const size = normalizedSizes.value[index] ?? 50;
  const splitterOffset = `var(--splitter-size) * ${splitterCount.value} * ${size / 100}`;

  const splitLayout = props.layout as LayoutSplitNode;
  const isHorizontal = splitLayout.orientation === 'horizontal';

  return isHorizontal
    ? { width: `calc(${size}% - ${splitterOffset})` }
    : { height: `calc(${size}% - ${splitterOffset})` };
};

const handleResize = (newSizes: number[]): void => {
  if (props.layout.type !== 'split') return;
  layoutStore.updateNodeSizes(props.layout.id, newSizes);
};

const resizeStates = shallowRef<ResizeState[]>([]);

const createResizeStates = (): void => {
  if (props.layout.type !== 'split') {
    resizeStates.value = [];
    return;
  }

  const splitLayout = props.layout;
  resizeStates.value = splitLayout.children
    .slice(0, -1)
    .map((_, index) =>
      usePaneResize(splitLayout.orientation, () => normalizedSizes.value, index, handleResize),
    );
};

watch(
  () => {
    if (props.layout.type !== 'split') return null;
    return `${props.layout.children.length}-${props.layout.orientation}`;
  },
  createResizeStates,
  { immediate: true },
);
</script>

<style scoped lang="scss">
.layout-pane {
  @include fit;
}

.layout-split {
  @include fit;

  & {
    display: flex;
  }

  &.horizontal {
    flex-direction: row;
  }

  &.vertical {
    flex-direction: column;
  }
}

.layout-split-child {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-shrink: 0;
  flex-grow: 0;
}
</style>
