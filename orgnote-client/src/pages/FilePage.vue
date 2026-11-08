<template>
  <div class="file-page">
    <main-header v-if="tabletBelow" class="file-page-header" />
    <component
      class="file-page-content"
      v-if="showReader"
      :is="viewerComponent"
      :key="viewerInstanceKey"
      :buffer="buffer"
      :readonly="buffer!.guard?.readonly"
      v-bind="viewStateBinding"
      @update:content="onContentUpdate"
    />
    <file-not-supported v-if="showNotSupported" :path="currentFilePath" />
    <loading-dots v-if="showLoading" />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, inject, type ShallowRef, type Component } from 'vue';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';
import type { Buffer as OrgBuffer } from 'orgnote-api';
import { api } from 'src/boot/api';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import LoadingDots from 'src/components/LoadingDots.vue';
import FileNotSupported from 'src/components/FileNotSupported.vue';
import MainHeader from 'src/containers/MainHeader.vue';
import { extractPathFromRoute } from 'src/utils/extract-path-from-route';
import { useBufferViewStateStore } from 'src/stores/buffer-view-state';

const router = inject<ShallowRef<Router>>(TAB_ROUTER_KEY);

const currentRoute = computed<RouteLocationNormalizedLoaded | undefined>(
  () => router?.value?.currentRoute.value,
);

const currentFilePath = computed(() => currentRoute.value?.params.path as string | undefined);

const currentBufferUri = computed(() => {
  const route = currentRoute.value;
  if (!route) return;
  return extractPathFromRoute(route);
});

const buffers = api.core.useBuffers();
const bufferViewer = api.core.useBufferViewer();
const bufferViewState = useBufferViewStateStore();

const buffer = computed<OrgBuffer | undefined>(() => {
  const uri = currentBufferUri.value;
  if (!uri) return;
  return buffers.getBufferByUri(uri);
});

const viewerEntry = computed(() => {
  const path = currentFilePath.value;
  if (!path) return undefined;
  return bufferViewer.getViewer(path);
});

const viewerComponent = computed<Component | undefined>(() => {
  const entry = viewerEntry.value;
  if (!entry) return undefined;

  if (typeof entry.component === 'function') {
    const loader = entry.component as () => Promise<Component>;
    return defineAsyncComponent(loader);
  }
  return entry.component as Component;
});

const viewStateBinding = computed(() => {
  const config = viewerEntry.value?.meta.viewState;
  const tabId = currentRoute.value?.params.tabId;
  const bufferUri = currentBufferUri.value;
  const viewerId = viewerEntry.value?.meta.id;
  if (!config || typeof tabId !== 'string' || !bufferUri || !viewerId) return {};
  return {
    viewState: bufferViewState.createHandle({
      tabId,
      bufferUri,
      viewerId,
      version: config.version,
    }),
  };
});

const viewerInstanceKey = computed(() => {
  const bufferUri = buffer.value?.uri;
  const viewerId = viewerEntry.value?.meta.id;
  return bufferUri && viewerId ? `${bufferUri}:${viewerId}` : undefined;
});

const showReader = computed(() => viewerComponent.value && buffer.value);
const showNotSupported = computed(() => buffer.value && !viewerComponent.value);
const showLoading = computed(() => !showReader.value && !showNotSupported.value);

const onContentUpdate = (content: string) => {
  if (buffer.value) {
    buffer.value.setText(content);
  }
};

const { tabletBelow } = api.ui.useScreenDetection();
</script>

<style scoped>
.file-page {
  position: relative;
  height: 100%;
  --content-top-offset: var(--header-height);
}

.file-page-header {
  position: absolute;
  top: var(--header-top);
  left: 0;
  right: 0;
  z-index: var(--floating-z-index);

  height: calc(var(--header-height) + 24px);

  background: transparent !important;
  isolation: isolate;
}

.file-page-header::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;

  pointer-events: none;

  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--bg) 55%, transparent) 0%,
    color-mix(in srgb, var(--bg) 28%, transparent) 55%,
    transparent 100%
  );

  backdrop-filter: blur(var(--header-fade-blur));
  -webkit-backdrop-filter: blur(var(--header-fade-blur));

  mask-image: linear-gradient(to bottom, black 0%, black 65%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 65%, transparent 100%);
}

.file-page-content {
  height: 100%;
}
</style>
