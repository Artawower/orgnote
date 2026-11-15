<template>
  <div
    v-if="visible"
    class="drop-zone-overlay"
    :style="overlayStyle"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @dragleave="handleDragLeave"
  >
    <div class="drop-zone drop-zone-left" :class="{ active: activeZone === 'left' }"></div>
    <div class="drop-zone drop-zone-right" :class="{ active: activeZone === 'right' }"></div>
    <div class="drop-zone drop-zone-top" :class="{ active: activeZone === 'top' }"></div>
    <div class="drop-zone drop-zone-bottom" :class="{ active: activeZone === 'bottom' }"></div>
    <div class="drop-zone drop-zone-center" :class="{ active: activeZone === 'center' }"></div>
  </div>
</template>

<script setup lang="ts">
import type { DropZone } from 'orgnote-api';
import { computed } from 'vue';
import { api } from 'src/boot/api';
import { getDropZone, sanitizeDropZoneRatio } from 'src/utils/get-drop-zone';

defineProps<{
  visible: boolean;
  activeZone: DropZone | undefined;
}>();

const emit = defineEmits<{
  (event: 'update:activeZone', zone: DropZone | undefined): void;
  (event: 'drop', zone: DropZone, payload: DragEvent): void;
}>();

const configStore = api.core.useConfig();
const dropZoneEdgeRatio = computed(() => {
  const ratio = configStore.config.ui.dropZoneEdgeRatio;
  return sanitizeDropZoneRatio(ratio ?? 0);
});

const overlayStyle = computed(() => {
  const edgeValue = `${dropZoneEdgeRatio.value * 100}%`;
  return {
    '--drop-zone-edge': edgeValue,
  };
});

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  const element = event.currentTarget;
  if (!(element instanceof HTMLElement)) return;
  const rect = element.getBoundingClientRect();
  const zone = getDropZone(event.clientX, event.clientY, rect, dropZoneEdgeRatio.value);
  emit('update:activeZone', zone);
};

const handleDragLeave = () => {
  emit('update:activeZone', undefined);
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  const element = event.currentTarget;
  if (!(element instanceof HTMLElement)) return;
  const rect = element.getBoundingClientRect();
  const zone = getDropZone(event.clientX, event.clientY, rect, dropZoneEdgeRatio.value);
  emit('drop', zone, event);
};
</script>

<style scoped>
.drop-zone-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: all;
  z-index: 1000;
}

.drop-zone {
  position: absolute;
  background: var(--drop-zone-bg);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.drop-zone.active {
  opacity: var(--drop-zone-opacity);
  border: var(--drop-zone-border);
}

.drop-zone-left {
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--drop-zone-edge);
}

.drop-zone-right {
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--drop-zone-edge);
}

.drop-zone-top {
  top: 0;
  left: 0;
  right: 0;
  height: var(--drop-zone-edge);
}

.drop-zone-bottom {
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--drop-zone-edge);
}

.drop-zone-center {
  top: var(--drop-zone-edge);
  left: var(--drop-zone-edge);
  right: var(--drop-zone-edge);
  bottom: var(--drop-zone-edge);
}
</style>
