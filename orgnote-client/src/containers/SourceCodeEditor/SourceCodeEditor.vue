<template>
  <div class="source-code-editor" :class="{ readonly }">
    <div ref="editorRef" class="container"></div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { to, type BufferViewStateHandle } from 'orgnote-api';
import { reporter } from 'src/boot/report';
import { api } from 'src/boot/api';
import { useCodeEditorView } from './use-code-editor-view';
import { useCodeMirrorViewState } from 'src/composables/use-code-mirror-view-state';
import type { CodeMirrorViewState } from 'src/utils/editor-view-state';

const props = defineProps<{
  readonly?: boolean;
  language?: string;
  documentKey?: string;
  viewState?: BufferViewStateHandle<CodeMirrorViewState>;
}>();

const model = defineModel<string>();
const editorRef = ref<HTMLDivElement>();
const themeStore = api.ui.useTheme();

const {
  getEditorView,
  initView,
  destroyView,
  syncDocument,
  setReadonly,
  setLanguage,
  setTheme,
} = useCodeEditorView({
    readonlyGetter: () => props.readonly ?? false,
    languageGetter: () => props.language,
    isDarkGetter: () => themeStore.isDark,
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
  restoreViewState(view);
};

const safeInitEditor = () => {
  const res = to(initEditor)();
  if (res.isErr()) {
    reporter.reportError('Failed to initialize source code editor', res.error);
  }
};

onMounted(safeInitEditor);

watch(
  () => props.readonly,
  (value) => setReadonly(value ?? false),
);

watch(
  () => props.language,
  (value) => setLanguage(value),
);

watch(
  () => themeStore.isDark,
  (value) => setTheme(value),
);
</script>

<style lang="scss" scoped>
@import '../../css/prose-editor';

.source-code-editor {
  @include fit;
  overflow: auto;

  .container {
    min-height: 100%;
  }

  :deep(.cm-editor) {
    background: transparent !important;
    height: 100%;
    font-family: var(--code-font-family);
    font-size: var(--code-font-size);
    background: var(--bg);

    &.cm-focused {
      outline: none;
    }
  }

  :deep(.cm-scroller) {
    overflow: auto;
    padding: var(--padding-md);
    padding-bottom: var(--floating-padding-bottom);
    font-family: var(--code-font-family);

    @include tablet-below {
      padding-top: calc(var(--content-top-offset, 0px) + var(--padding-xl));
    }
  }

  :deep(.cm-content) {
    caret-color: var(--fg);
  }

  :deep(.cm-cursor) {
    border-left-color: var(--fg);
  }

  :deep(.cm-gutters) {
    background: var(--bg-alt);
    color: var(--fg-muted);
    border-right: 1px solid var(--border);
  }

  :deep(.cm-activeLineGutter) {
    background: var(--bg-hover);
  }

  :deep(.cm-activeLine) {
    background: var(--bg-hover);
  }

  :deep(.cm-selectionBackground) {
    background: var(--selection) !important;
  }

  :deep(.cm-line) {
    padding-left: var(--padding-sm);
  }

  :deep(.cm-foldGutter) {
    width: 1em;
  }

  :deep(.cm-editor.markdown-view) {
    @include prose-editor-base;

    --paragraph-font-size: var(--font-size-md);
    background: var(--bg);

    .cm-line.markdown-heading-line {
      font-family: var(--headline-font-family);
      font-weight: var(--headline-font-weight);
      line-height: var(--editor-headline-line-height);
      padding-top: var(--padding-lg);
    }

    .cm-line.markdown-heading-1 {
      --paragraph-font-size: var(--headline-font-size-1);
      font-size: var(--paragraph-font-size);
    }

    .cm-line.markdown-heading-2 {
      --paragraph-font-size: var(--headline-font-size-2);
      font-size: var(--paragraph-font-size);
    }

    .cm-line.markdown-heading-3 {
      --paragraph-font-size: var(--headline-font-size-3);
      font-size: var(--paragraph-font-size);
    }

    .cm-line.markdown-heading-4 {
      --paragraph-font-size: var(--headline-font-size-4);
      font-size: var(--paragraph-font-size);
    }

    .cm-line.markdown-heading-5 {
      --paragraph-font-size: var(--headline-font-size-5);
      font-size: var(--paragraph-font-size);
    }

    .cm-line.markdown-heading-6 {
      --paragraph-font-size: var(--headline-font-size-6);
      font-size: var(--paragraph-font-size);
    }

    .markdown-link {
      text-decoration: underline;
      cursor: pointer;
    }

    .markdown-strong {
      font-weight: bold;
      color: var(--fg) !important;
    }

    .markdown-emphasis {
      font-style: italic;
      color: var(--fg) !important;
    }

    .markdown-heading-token {
      color: var(--fg) !important;
    }

    .markdown-url {
      color: var(--accent) !important;
    }

    .markdown-link-token {
      color: var(--accent) !important;
    }

    .markdown-code {
      font-family: var(--editor-font-family-mono, var(--code-font-family));
      color: var(--fg) !important;
    }

    .markdown-marker {
      color: var(--fg-muted) !important;
    }

    .markdown-strikethrough {
      text-decoration: line-through;
      color: var(--fg) !important;
    }

    .markdown-label {
      color: var(--fg) !important;
    }
  }

  &.readonly {
    :deep(.cm-content) {
      cursor: default;
    }
  }
}
</style>
