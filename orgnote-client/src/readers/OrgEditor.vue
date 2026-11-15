<template>
  <rich-editor
    v-model="content"
    :readonly="readonly"
    :file-path="buffer.path"
    :document-key="buffer.uri"
    :view-state="viewState"
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { Buffer, BufferViewStateHandle } from 'orgnote-api';
import type { CodeMirrorViewState } from 'src/utils/editor-view-state';
import { RichEditor } from 'src/containers/RichEditor';

const props = defineProps<{
  buffer: Buffer;
  readonly?: boolean;
  viewState?: BufferViewStateHandle<CodeMirrorViewState>;
}>();

const emit = defineEmits<{
  (e: 'update:content', content: string): void;
}>();

const content = computed({
  get: () => props.buffer.text,
  set: (value: string) => emit('update:content', value),
});
</script>
