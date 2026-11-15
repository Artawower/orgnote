<template>
  <div class="org-toc">
    <div v-if="emptyStateMessage" class="toc-empty">{{ emptyStateMessage }}</div>
    <app-tree
      v-if="showTree"
      :nodes="tocTree"
      :selected="selectedId"
      label-key="label"
      default-expand-all
      @node-click="navigateTo"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { i18n } from 'orgnote-api';
import { api } from 'src/boot/api';
import AppTree from 'src/components/AppTree.vue';
import { getNumericCssVar } from 'src/utils/css-utils';
import { navigateToPosition } from 'src/utils/editor-navigation';
import { collectTocTree, flattenTocTree } from './toc-utils';
import type { TocTreeNode } from './toc-tree';

const SCROLL_Y_MARGIN_FALLBACK = 10;
const SCROLL_Y_MARGIN_EXTRA_GAP = 8;

const { t } = useI18n();
const editorStore = api.core.useEditor();
const { activeContext } = storeToRefs(editorStore);

const orgNode = computed(() => activeContext.value?.orgNode);
const cursorPosition = computed(() => activeContext.value?.cursorPosition ?? 0);

const tocTree = computed(() => {
  const node = orgNode.value;
  if (!node) return [];
  return collectTocTree(node);
});

const flatNodes = computed(() => flattenTocTree(tocTree.value));

const emptyStateMessage = computed(() => {
  if (!orgNode.value) return t(i18n.TOC_NO_ACTIVE_DOCUMENT);
  if (tocTree.value.length === 0) return t(i18n.TOC_NO_HEADLINES_FOUND);
  return null;
});

const showTree = computed(() => Boolean(orgNode.value) && tocTree.value.length > 0);

const findActiveNode = (nodes: TocTreeNode[], position: number): TocTreeNode | null => {
  const reversed = [...nodes].reverse();
  return reversed.find((node) => node.position <= position) ?? null;
};

const activeNode = computed(() => findActiveNode(flatNodes.value, cursorPosition.value));

const selectedId = computed(() => activeNode.value?.id ?? null);

const isValidPosition = (pos: number, docLength: number): boolean =>
  Number.isFinite(pos) && pos >= 0 && pos <= docLength;

const isValidRange = (start: number, end: number, docLength: number): boolean =>
  isValidPosition(start, docLength) && isValidPosition(end, docLength) && start <= end;

const { tabletBelow } = api.ui.useScreenDetection();

const getHeaderOffsetFromVars = (): number => {
  const headerHeight = getNumericCssVar('header-height') ?? 0;
  const headerWrapperPaddingY = getNumericCssVar('header-wrapper-padding-y') ?? 0;

  const offset = headerHeight + headerWrapperPaddingY * 2;
  if (offset <= 0) return SCROLL_Y_MARGIN_FALLBACK;

  return offset + SCROLL_Y_MARGIN_EXTRA_GAP;
};

const getScrollYMargin = (): number => {
  return getHeaderOffsetFromVars();
};

const navigateTo = (node: TocTreeNode) => {
  const editorView = activeContext.value?.editorViewGetter();
  if (!editorView) return;

  const docLength = editorView.state.doc.length;
  if (!isValidRange(node.position, node.endPosition, docLength)) return;

  navigateToPosition(editorView, node.position, { yMargin: getScrollYMargin() });

  if (tabletBelow.value) api.ui.useRightSidebar().close();
};
</script>

<style lang="scss" scoped>
.org-toc {
  height: 100%;
  width: 100%;
  padding: var(--padding-md);
  overflow: auto;
}

.toc-empty {
  padding: var(--padding-md);
  color: var(--fg-muted);
  text-align: center;
  width: 100%;
}
</style>
