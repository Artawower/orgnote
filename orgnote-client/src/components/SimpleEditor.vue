<template>
  <textarea
    v-model="model"
    :readonly="readonly"
    :class="['simple-editor', { 'simple-editor--readonly': readonly }]"
    placeholder="Start writing your note..."
    role="textbox"
    aria-label="Note editor"
    aria-multiline="true"
    @focus="handleFocus"
    @blur="handleBlur"
  ></textarea>
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';

defineProps<{
  readonly?: boolean;
}>();

const model = defineModel<string>();

const editorStore = api.core.useEditor();

const handleFocus = () => {
  editorStore.setActiveContext({
    focused: true,
  });
};

const handleBlur = () => {
  editorStore.clearActiveContext();
};
</script>

<style lang="scss" scoped>
.simple-editor {
  @include reset-input;

  & {
    width: 100%;
    height: 100%;
    min-height: clamp(200px, 50vh, 400px);
    padding: var(--padding-lg);

    font-family: var(--editor-font-family-main);
    font-size: var(--font-size-md);
    line-height: var(--line-height-md);
    color: var(--fg);
    background: var(--bg);

    resize: none;
    outline: none;
    border: none;
  }

  &::placeholder {
    color: var(--fg-muted);
    font-style: italic;
  }

  &:focus {
    outline: none;
  }
}
</style>
