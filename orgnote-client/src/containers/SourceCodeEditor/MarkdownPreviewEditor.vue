<template>
  <source-code-editor :model-value="content" :language="'md'" :readonly="true" />
</template>

<script lang="ts" setup>
import SourceCodeEditor from './SourceCodeEditor.vue';

defineProps<{
  content: string;
}>();
</script>
