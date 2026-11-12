<template>
  <app-flex @touchstart.stop @mousedown.stop>
    <app-flex
      v-if="shouldShow"
      row
      flex-end
      a-center
      gap="md"
      class="editor-actions-toolbar"
      @mousedown.prevent
    >
      <app-flex class="editor-actions" row start a-center gap="xs">
        <command-action-button
          v-for="cmd of editorCommands"
          :key="cmd"
          :command="cmd"
          :execute-on-pointer-down="true"
          size="md"
        />
      </app-flex>
      <div class="fixed-editor-actions" @pointerdown.capture="onHidePointerDown">
        <command-action-button :command="DefaultCommands.EDITOR_HIDE_KEYBOARD" size="md" />
      </div>
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { api } from 'src/boot/api';
import CommandActionButton from './CommandActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { suspendEditorInput, resumeEditorInput } from 'src/utils/editor-primitives';
import { startKeyboardHideWindow } from 'src/utils/android-keyboard-hide';
import { androidOnly } from 'src/utils/platform-specific';
import { DefaultCommands } from 'orgnote-api';

const editorStore = api.core.useEditor();
const { keyboardOpened, keyboardHeight } = api.ui.useKeyboardState();
const { tabletBelow } = api.ui.useScreenDetection();

const isEditorFocused = computed(() => editorStore.activeContext?.focused === true);

const shouldShow = computed(
  () =>
    tabletBelow.value && isEditorFocused.value && keyboardOpened.value && keyboardHeight.value > 0,
);

const editorCommands = api.ui.usePinnedCommands().getCommands('editor-actions');

const onHidePointerDown = (event: PointerEvent): void => {
  if (!event.isPrimary) return;
  androidOnly(() => {
    const view = editorStore.activeContext?.editorViewGetter?.();
    if (!view) return;
    suspendEditorInput(view);
    startKeyboardHideWindow(() => {
      const liveView = editorStore.activeContext?.editorViewGetter?.();
      if (liveView) resumeEditorInput(liveView);
    });
  })();
};
</script>

<style lang="scss" scoped>
$toolbar-height: calc(var(--editor-toolbar-height) + var(--footer-wrapper-padding-y, 0px));

.editor-actions-toolbar {
  @include hide-scrollbar;

  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  width: 100%;
  height: $toolbar-height;
  position: fixed;
  left: 0;
  right: 0;
  top: calc(
    var(--initial-viewport-height, 100vh) - var(--keyboard-height, 0px) - #{$toolbar-height}
  );
  padding: var(--footer-wrapper-padding-x) calc(var(--footer-wrapper-padding-x) / 2);

  box-sizing: border-box;
  z-index: 100;
}

.editor-actions {
  overflow-x: auto;
  touch-action: pan-x;
  @include hide-scrollbar;
}

.fixed-editor-actions {
  min-width: var(--bar-height);
  justify-content: center;
  display: flex;
}

.editor-actions,
.fixed-editor-actions {
  border-radius: var(--footer-border-radius);
  @include glass-surface;
  height: var(--bar-height);
  align-items: center;
  @include glass-btn;
  @include glass-specular;
}

.editor-actions {
  overflow-x: auto;
  overflow-y: hidden;
  touch-action: pan-x;
}
</style>
