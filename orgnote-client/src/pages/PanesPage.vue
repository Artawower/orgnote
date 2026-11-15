<template>
  <page-wrapper centered>
    <visibility-wrapper v-if="layout">
      <template #desktop-below>
        <app-pane v-if="activePaneId" :pane-id="activePaneId" />
      </template>
      <template #desktop-above>
        <layout-renderer :layout="layout">
          <template #default="{ paneId }">
            <app-pane :pane-id="paneId" />
          </template>
        </layout-renderer>
      </template>
    </visibility-wrapper>
  </page-wrapper>
</template>

<script lang="ts" setup>
import PageWrapper from 'src/components/PageWrapper.vue';
import AppPane from './AppPane.vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import LayoutRenderer from 'src/components/LayoutRenderer.vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';

const layoutManager = api.core.useLayout();
const paneManager = api.core.usePane();
const { activePaneId } = storeToRefs(paneManager);
const { layout } = storeToRefs(layoutManager);
</script>

<style lang="scss" scoped>
.panes-page {
  @include fit();
}
</style>
