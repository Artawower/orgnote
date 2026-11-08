<template>
  <page-wrapper centered>
    <app-flex column-reverse class="tab-grid-container">
      <div class="tab-grid">
        <tab-live-preview
          v-for="tab in allTabs"
          :key="tab.id"
          :tab="tab"
          :active="tab.id === activeTab?.id"
          @select="selectTab(tab)"
          @close="closeTab(tab)"
        />
      </div>
    </app-flex>
    <app-footer justify="between" float>
      <command-action-button :command="DefaultCommands.NEW_TAB" aria-label="New tab" />
      <span>
        {{ $t(I18N.TABS_COUNT, allTabs.length) }}
      </span>
      <command-action-button :command="DefaultCommands.CLOSE_MODAL" aria-label="Close" />
    </app-footer>
  </page-wrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { api } from 'src/boot/api';
import TabLivePreview from 'src/components/TabLivePreview.vue';
import PageWrapper from 'src/components/PageWrapper.vue';
import AppFooter from 'src/components/AppFooter.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { DefaultCommands, I18N, type Tab } from 'orgnote-api';
import CommandActionButton from './CommandActionButton.vue';
import { storeToRefs } from 'pinia';

const paneStore = api.core.usePane();
const { activeTab } = storeToRefs(paneStore);

const emits = defineEmits<{
  (e: 'selected', tab: Tab): void;
}>();

const allTabs = computed(() => {
  const panes = Object.values(paneStore.panes);
  return panes.flatMap((paneRef) => Object.values(paneRef.value.tabs.value));
});

const selectTab = (tab: Tab) => {
  if (!tab.paneId) return;
  paneStore.selectTab(tab.paneId, tab.id);
  emits('selected', tab);
};

const closeTab = async (tab: Tab) => {
  if (!tab.paneId) return;

  const paneStore = api.core.usePane();
  await paneStore.closeTab(tab.paneId, tab.id);
};
</script>

<style lang="scss" scoped>
.tab-grid-container {
  @include fit;

  & {
    padding: var(--tab-overview-container-padding);
    flex: 1;
    height: 100%;
    width: 100%;
    min-height: 0;
    overflow-y: auto;
  }
}

.empty-state {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gap-lg);
  min-height: 60vh;
  text-align: center;
}

.empty-text {
  font-size: var(--font-size-lg);
  color: var(--fg-muted);
}

.tab-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(var(--tab-overview-grid-columns), 1fr);
  gap: var(--tab-overview-grid-gap);
}

.footer-container {
  width: 100%;
}
</style>
