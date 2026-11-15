<template>
  <action-button
    @click="copySrc"
    icon="content_copy"
    fire-icon="done"
    size="sm"
    color="fg-muted"
    fire-color="green"
  />
  <action-button
    @click="executeCode"
    icon="play_arrow"
    fire-icon="done"
    size="sm"
    color="fg-muted"
    fire-color="green"
  />
</template>

<script setup lang="ts">
import type { OrgNode } from 'org-mode-ast';
import { computed } from 'vue';
import ActionButton from 'src/components/ActionButton.vue';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { copyToClipboard } from 'src/utils/clipboard';
import { getSrcBlockCode, getSrcBlockLanguage } from './src-block-node';
import { to } from 'orgnote-api/utils';

const props = defineProps<{
  node: OrgNode;
  nodeGetter?: () => OrgNode;
}>();

const emit = defineEmits<{
  (e: 'update', newValue: string): void;
}>();

const currentNode = computed(() => props.nodeGetter?.() ?? props.node);
const codeContent = computed(() => getSrcBlockCode(currentNode.value));
const language = computed(() => getSrcBlockLanguage(currentNode.value));
const babelStore = api.core.useBabel();

const executeCodeSafe = to(
  (lang: string, code: string) => babelStore.execute(lang, code),
  'Code execution failed',
);

const copySrc = () => {
  if (!codeContent.value) return;
  copyToClipboard(codeContent.value);
};

const executeCode = async () => {
  if (!codeContent.value) return;

  const result = await executeCodeSafe(language.value, codeContent.value);
  result.match(
    (res) => emit('update', res),
    (err) => reporter.reportError(err),
  );
};
</script>
