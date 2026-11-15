<template>
  <code @click="copyToClipboard" class="org-inline-code" role="button">
    <content-renderer v-for="(n, i) of node.children" :node="n" :key="i" />
  </code>
</template>

<script setup lang="ts">
import ContentRenderer from '../ContentRenderer.vue';
import { toRef } from 'vue';
import type { OrgNode } from 'org-mode-ast';
import { api } from 'src/boot/api';
import { i18n } from 'orgnote-api';

const props = defineProps<{
  node: OrgNode;
}>();

const node = toRef(props, 'node');

const copyToClipboard = () => {
  api.utils.copyToClipboard(props.node.cleanValue);
  api.core.useNotifications().notify({
    message: i18n.COPIED_TO_CLIPBOARD,
    description: props.node.cleanValue,
  });
};
</script>
