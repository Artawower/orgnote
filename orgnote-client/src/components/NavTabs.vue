<template>
  <app-flex class="nav-tabs" between>
    <app-flex row start align-center gap="xs">
      <slot name="navigation" />
      <app-flex ref="contentRef" class="content" row start align-center gap="xs">
        <slot />
      </app-flex>
      <app-flex v-if="$slots.actions" class="actions" row start align-center>
        <slot name="actions" />
      </app-flex>
    </app-flex>
    <slot name="right-actions" />
  </app-flex>
</template>

<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue';
import AppFlex from 'src/components/AppFlex.vue';
import { NAV_TAB_ID_ATTRIBUTE, NAV_TAB_ID_SELECTOR } from 'src/constants/orgnote-tab';

const props = defineProps<{ activeTabId?: string }>();
const contentRef = ref<InstanceType<typeof AppFlex>>();

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

  .content {
    & {
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
