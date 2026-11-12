<template>
  <app-flex class="nav-tabs" between>
    <app-flex class="tabs-row" row start align-center gap="xs">
      <slot name="navigation" />
      <app-flex
        ref="dropAreaRef"
        class="drop-area"
        row
        start
        align-center
        gap="xs"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <app-flex ref="contentRef" class="content" row start align-center gap="xs">
          <span
            v-if="indicatorOffset !== undefined"
            class="drop-indicator"
            :style="{ left: `${indicatorOffset}px` }"
            aria-hidden="true"
          />
          <slot />
        </app-flex>
        <app-flex v-if="$slots.actions" class="actions" row start align-center>
          <slot name="actions" />
        </app-flex>
      </app-flex>
    </app-flex>
    <slot name="right-actions" />
  </app-flex>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, toRef, watch } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';
import { NAV_TAB_ID_ATTRIBUTE, NAV_TAB_ID_SELECTOR } from 'src/constants/orgnote-tab';
import { useTabStripDrop } from 'src/composables/use-tab-strip-drop';

const props = withDefaults(defineProps<{ activeTabId?: string; tabDragActive?: boolean }>(), {
  tabDragActive: false,
});
const emit = defineEmits<{ (event: 'tabDrop', payload: { gapIndex: number }): void }>();
const contentRef = ref<InstanceType<typeof AppFlex>>();
const dropAreaRef = ref<InstanceType<typeof AppFlex>>();

const toElement = (component: InstanceType<typeof AppFlex> | undefined): HTMLElement | undefined =>
  component?.$el instanceof HTMLElement ? component.$el : undefined;

const { indicatorOffset, handleDragOver, handleDragLeave, handleDrop } = useTabStripDrop({
  dropArea: computed(() => toElement(dropAreaRef.value)),
  scrollContainer: computed(() => toElement(contentRef.value)),
  isDragActive: toRef(props, 'tabDragActive'),
  onTabDrop: (gapIndex) => emit('tabDrop', { gapIndex }),
});

const scrollActiveTabIntoView = async (tabId?: string): Promise<void> => {
  if (!tabId) return;
  await nextTick();
  const content = contentRef.value?.$el as HTMLElement | undefined;
  const tabs = content?.querySelectorAll<HTMLElement>(NAV_TAB_ID_SELECTOR) ?? [];
  const activeTab = [...tabs].find((tab) => tab.getAttribute(NAV_TAB_ID_ATTRIBUTE) === tabId);
  activeTab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};

watch(() => props.activeTabId, scrollActiveTabIntoView, { flush: 'post', immediate: true });
</script>

<style lang="scss" scoped>
.nav-tabs {
  & {
    padding: var(--nav-tabs-padding);
    width: 100%;
    background: var(--nav-tabs-bg);
    max-width: 100%;
    overflow-x: hidden;
  }

  :deep(.flex-container) {
    min-width: 0;
  }

  .tabs-row,
  .drop-area {
    flex: 1;
  }

  .drop-indicator {
    position: absolute;
    top: 0;
    bottom: var(--tab-connection-depth);
    width: var(--tab-drop-indicator-width);
    margin-left: calc(var(--tab-drop-indicator-width) / -2);
    background: var(--tab-drop-indicator-color);
    pointer-events: none;
    z-index: 2;
  }

  .content {
    & {
      position: relative;
      overflow-x: auto;
      min-width: 0;
      padding-inline: var(--tab-active-radius);
      padding-bottom: var(--tab-connection-depth);
      margin-inline: calc(0px - var(--tab-active-radius));
      margin-bottom: calc(0px - var(--tab-connection-depth));
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }
  }

  .actions {
    flex-shrink: 0;
    margin-left: var(--tab-active-radius);
  }
}

::v-deep(.tab:not(.active):not(:last-child)) {
  &::after {
    content: '';
    position: absolute;
    right: -2px;
    display: block;
    width: 1px;
    z-index: 10;
    height: 66%;
    background: var(--bg-elevated);
  }
}
</style>
