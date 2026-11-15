<template>
  <source-code-editor
    v-model="content"
    :readonly="readonly"
    :language="language"
    :document-key="buffer.uri"
    :view-state="viewState"
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import {
  getFileExtension,
  type Buffer,
  type BufferViewStateHandle,
} from 'orgnote-api';
import type { CodeMirrorViewState } from 'src/utils/editor-view-state';
import { SourceCodeEditor } from 'src/containers/SourceCodeEditor';

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

const language = computed(() => getFileExtension(props.buffer.path)?.toLowerCase());
</script>
