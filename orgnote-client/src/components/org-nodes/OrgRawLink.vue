<template>
  <context-menu group="external-link" :data="contextMenuData">
    <app-link :href="linkAddress" class="org-raw-link">
      {{ shortLink }}
    </app-link>
  </context-menu>
</template>

<script setup lang="ts">
import type { OrgNode } from 'org-mode-ast';
import { computed, toRef } from 'vue';
import { to } from 'orgnote-api/utils';
import AppLink from 'src/components/AppLink.vue';
import ContextMenu from 'src/components/ContextMenu.vue';
import type { LinkMenuData } from 'src/models/link-menu-data';

const props = defineProps<{
  node: OrgNode;
}>();

const node = toRef(props, 'node');
const linkAddress = computed(() => node.value.value);
const contextMenuData = computed<LinkMenuData>(() => ({
  kind: 'external',
  url: linkAddress.value,
}));

const parseUrl = to((url: string) => new URL(url).hostname);

const shortLink = computed(() => parseUrl(linkAddress.value).unwrapOr(linkAddress.value));
</script>

<style lang="scss" scoped>
.org-raw-link {
  color: var(--fg);
  text-decoration: underline;
}
</style>
