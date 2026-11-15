<template>
  <app-flex
    tag="span"
    inline
    center
    align-center
    class="headline-fold-trigger"
    :class="{ folded: isFolded }"
    @mousedown.stop.prevent
    @click.stop.prevent="handleClick"
  >
    <action-button
      :icon="isFolded ? 'sym_o_chevron_right' : 'sym_o_expand_more'"
      size="sm"
      color="fg-muted"
      hover-color="accent"
    />
  </app-flex>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { EditorView } from '@codemirror/view';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { isHeadlineFolded, toggleFoldHeadline } from './fold-commands';
import type { HeadlineInfo } from './startup-options';

const props = defineProps<{
  headline: HeadlineInfo;
  editorView: EditorView;
}>();

const isFolded = ref(false);

const updateFoldState = () => {
  isFolded.value = isHeadlineFolded(props.editorView, props.headline);
};

const handleClick = () => {
  toggleFoldHeadline(props.editorView, props.headline);
  updateFoldState();
};

onMounted(updateFoldState);

watch(() => props.headline, updateFoldState);
</script>

<style scoped>
.headline-fold-trigger {
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.headline-fold-trigger.folded {
  opacity: 1;
}

@media (hover: hover) and (pointer: fine) {
  .headline-fold-trigger:hover {
    opacity: 1;
  }
}
</style>
