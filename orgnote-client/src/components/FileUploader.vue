<template>
  <div
    class="file-uploader"
    :class="{ 'drag-target': dragInProgress }"
    @drop.prevent="onDrop"
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @dragover.prevent="onDragOver"
  >
    <transition name="fade">
      <app-flex v-if="dragInProgress" class="upload-overlay" center align-center>
        <app-flex class="uploader-info" column align="center">
          <app-icon name="cloud_upload" style="font-size: 4rem" />
          <app-title :level="4" class="q-mt-md">{{ label || 'Drop files here' }}</app-title>
        </app-flex>
      </app-flex>
    </transition>
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { useEventListener } from '@vueuse/core';
import { useDragStatus } from 'src/composables/use-drag-status';
import type { FileSystemFileEntry } from 'src/utils/file-traversal';
import { extractFiles } from 'src/utils/file-traversal';
import AppTitle from 'src/components/AppTitle.vue';
import AppIcon from 'src/components/AppIcon.vue';
import AppFlex from 'src/components/AppFlex.vue';

const props = withDefaults(
  defineProps<{
    accept?: string[];
    label?: string;
  }>(),
  {
    accept: () => [],
  },
);

const emit = defineEmits<{
  (e: 'uploaded', files: FileSystemFileEntry[]): void;
  (e: 'dropped'): void;
}>();

const { dragInProgress, onDragEnter, onDragLeave, onDragOver, reset } = useDragStatus();

const onDrop = async (e: DragEvent) => {
  emit('dropped');
  reset();
  e.preventDefault();

  if (!e.dataTransfer) return;

  const files = await extractFiles(e.dataTransfer.items, props.accept);
  if (files.length > 0) {
    emit('uploaded', files);
  }
};

const preventDefault = (e: DragEvent) => e.preventDefault();

useEventListener(window, 'dragover', preventDefault);
useEventListener(window, 'drop', preventDefault);
</script>

<style lang="scss" scoped>
.file-uploader {
  position: relative;
  @include fit;
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--uploader-overlay-bg);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
  backdrop-filter: var(--glass-backdrop-filter);
  z-index: 9999;
  color: var(--uploader-info-fg);
  pointer-events: none;
}

.uploader-info {
  padding: 40px;
  border: var(--uploader-info-border);
  border-radius: var(--uploader-info-radius);
  background: var(--uploader-info-bg);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
