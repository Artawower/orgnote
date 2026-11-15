<template>
  <error-display v-if="activeBuffer?.errors.length" :errors="activeBuffer.errors" />
  <router-view v-else />
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';
import { useRoute } from 'vue-router';
import { computed, watch, onUnmounted, ref, inject, type ShallowRef } from 'vue';
import type { Buffer as OrgBuffer } from 'orgnote-api';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import type { Router } from 'vue-router';
import ErrorDisplay from 'src/components/ErrorDisplay.vue';
import { extractPathFromRoute } from 'src/utils/extract-path-from-route';

const buffers = api.core.useBuffers();
const route = useRoute();
const tabRouter = inject<ShallowRef<Router | undefined>>(TAB_ROUTER_KEY);

const filePath = computed(() => {
  const fromInjected = tabRouter?.value?.currentRoute.value;
  const resolved = fromInjected ? extractPathFromRoute(fromInjected) : null;
  if (resolved) return resolved;
  return route ? extractPathFromRoute(route) : null;
});

const activeBuffer = ref<OrgBuffer | undefined>();

const cleanup = () => {
  const buf = activeBuffer.value;
  activeBuffer.value = undefined;
  if (!buf) return;
  buffers.releaseBuffer(buf.uri);
};

watch(
  filePath,
  async (next, _previous, onCleanup) => {
    cleanup();
    if (!next) return;

    let isInvalidated = false;
    onCleanup(() => {
      isInvalidated = true;
    });

    const buffer = await buffers.getOrCreateBuffer(next);
    if (isInvalidated) {
      buffers.releaseBuffer(buffer.uri);
      return;
    }
    activeBuffer.value = buffer;
  },
  { immediate: true },
);

onUnmounted(() => {
  cleanup();
});
</script>
