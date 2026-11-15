<template>
  <div
    class="editor-wrapper"
    :class="{
      readonly,
      'hide-special-symbols': !editorConfig.showSpecialSymbols,
      'show-property-drawer': editorConfig.showPropertyDrawer,
    }"
  >
    <div id="editor" ref="editorRef" class="rich-editor"></div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { api } from 'src/boot/api';
import { setCursorToEOF } from './use-cursor';
import { useEditorView } from './use-editor-view';
import { to, type BufferViewStateHandle } from 'orgnote-api';
import { reporter } from 'src/boot/report';
import { useCodeMirrorViewState } from 'src/composables/use-code-mirror-view-state';
import type { CodeMirrorViewState } from 'src/utils/editor-view-state';

const props = defineProps<{
  readonly?: boolean;
  filePath?: string;
  documentKey?: string;
  viewState?: BufferViewStateHandle<CodeMirrorViewState>;
}>();

const model = defineModel<string>();
const editorRef = ref<HTMLDivElement>();

const configStore = api.core.useConfig();
const editorConfig = computed(() => configStore.config.editor);

const { getEditorView, initView, destroyView, syncDocument, setReadonly } = useEditorView({
  readonlyGetter: () => props.readonly ?? false,
  filePathGetter: () => props.filePath,
  onContentUpdate: (content: string) => {
    model.value = content;
  },
});

const { restoreViewState } = useCodeMirrorViewState({
  contentGetter: () => model.value,
  documentKeyGetter: () => props.documentKey,
  viewStateGetter: () => props.viewState,
  getEditorView,
  syncDocument,
  destroyView,
});

const initEditor = () => {
  if (!editorRef.value) return;

  const view = initView(editorRef.value, model.value ?? '', props.documentKey);
  if (!restoreViewState(view)) setCursorToEOF(view);
};

const safeInitEditor = () => {
  const res = to(initEditor)();
  if (res.isErr()) {
    reporter.reportError('Failed to initialize rich text editor', res.error);
  }
};

onMounted(safeInitEditor);

watch(
  () => props.readonly,
  (value) => nextTick(() => setReadonly(value ?? false)),
);
</script>

<style lang="scss">
@import './RichEditor.scss';
</style>
