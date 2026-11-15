<template>
  <img ref="imgRef" :src="src" :alt="alt" class="app-image" @error="$emit('error', $event)" />
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import type { Zoom } from 'medium-zoom';
import mediumZoom from 'medium-zoom';

const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    zoomable?: boolean;
  }>(),
  {
    alt: '',
    zoomable: true,
  },
);

defineEmits<{
  (e: 'error', event: Event): void;
}>();

const imgRef = ref<HTMLImageElement>();
let zoom: Zoom | null = null;

const initZoom = () => {
  if (!props.zoomable || !imgRef.value) return;

  zoom = mediumZoom(imgRef.value, {
    background: 'var(--backdrop-focus-bg)',
  });
};

const destroyZoom = () => {
  zoom?.detach();
  zoom = null;
};

watch(
  () => props.zoomable,
  (zoomable) => {
    destroyZoom();
    if (zoomable) initZoom();
  },
);

onMounted(initZoom);
onUnmounted(destroyZoom);
</script>

<style lang="scss" scoped>
.app-image {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: zoom-in;
  margin: auto;
}
</style>

<style lang="scss">
.medium-zoom-overlay {
  z-index: 9998;
}

.medium-zoom-image--opened {
  z-index: 9999;
}
</style>
