<template>
  <page-wrapper centered>
    <app-image :src="imageSrc" :alt="buffer.title" class="image-viewer" />
  </page-wrapper>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { Buffer } from 'orgnote-api';
import PageWrapper from 'src/components/PageWrapper.vue';
import AppImage from 'src/components/AppImage.vue';

const props = defineProps<{
  buffer: Buffer;
  readonly?: boolean;
}>();

const imageSrc = computed(() => {
  const text = props.buffer.text;
  if (text.startsWith('data:')) {
    return text;
  }
  return `data:image/*;base64,${props.buffer.base64}`;
});
</script>

<style lang="scss" scoped>
.image-viewer {
  max-height: 100%;
  object-fit: contain;
}
</style>
