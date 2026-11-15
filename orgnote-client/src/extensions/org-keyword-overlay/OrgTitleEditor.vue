<template>
  <hoverable-area class="keyword-editor title-editor">
    <app-text-area
      v-if="!readonly"
      ref="textAreaRef"
      class="input"
      :model-value="value"
      :placeholder="placeholder"
      :rows="1"
      auto-grow
      @keydown="handleKeydown"
      @blur="commit"
    />
    <span v-else class="text" :class="{ 'empty-text': !value }">
      {{ value || placeholder }}
    </span>
  </hoverable-area>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { parse, walkTree, type OrgNode } from 'org-mode-ast';
import type { EditorView } from '@codemirror/view';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import AppTextArea from 'src/components/AppTextArea.vue';
import HoverableArea from 'src/components/HoverableArea.vue';
import {
  EMBEDDED_WIDGET_COMMAND,
  EMBEDDED_WIDGET_DIRECTION,
  getEmbeddedWidgetBridge,
} from 'src/utils/org-editor/embedded-widget-runtime';
import { titleWidgetId as buildTitleWidgetId } from './title-widget-id';
import { getKeywordMarker, getKeywordName, getKeywordValue } from './utils';

const NEWLINE = '\n';
const skippedAutoFocusPositions = new Set<number>();

interface TextAreaHandle {
  focusAt: (position: 'start' | 'end') => void;
  focusEnd: () => void;
}

const props = withDefaults(
  defineProps<{
    node: OrgNode;
    editorView: EditorView;
    readonly?: boolean;
  }>(),
  { readonly: false },
);

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const textAreaRef = ref<TextAreaHandle | null>(null);
let unregisterWidget: (() => void) | undefined;
const shouldSkipBlurCommit = ref(false);
const value = computed(() => getKeywordValue(props.node));
const placeholder = computed(() => t(I18N.UNTITLED));
const marker = computed(() => getKeywordMarker(props.node));

const normalizeKeywordValue = (next: string): string => next.trim().replace(/\s+/g, ' ');

const isTitleNode = (node: OrgNode): boolean => getKeywordName(node) === 'title';

const findCurrentTitleNode = (): OrgNode | undefined => {
  let titleAtStart: OrgNode | undefined;
  let firstTitle: OrgNode | undefined;
  walkTree(parse(props.editorView.state.doc.toString()), (node) => {
    if (!isTitleNode(node)) return false;
    firstTitle ??= node;
    if (node.start !== props.node.start) return false;
    titleAtStart = node;
    return true;
  });
  return titleAtStart ?? firstTitle;
};

const currentTitleNode = (): OrgNode => findCurrentTitleNode() ?? props.node;

const currentTitleRange = (): { from: number; to: number } => {
  const node = currentTitleNode();
  return { from: node.start, to: node.end };
};

const buildLine = (next: string, node: OrgNode): string => {
  const normalized = normalizeKeywordValue(next);
  const currentMarker = getKeywordMarker(node) || marker.value;
  if (!normalized) return currentMarker;
  return `${currentMarker} ${normalized}`;
};

const isEditorSelectionInsideKeyword = (): boolean => {
  const head = props.editorView.state.selection.main.head;
  const range = currentTitleRange();
  return head >= range.from && head <= range.to;
};

const waitForWidgetDomUpdate = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const dispatchKeywordUpdate = (next: string, anchor?: number, anchorAssoc = 1): void => {
  const node = currentTitleNode();
  const range = { from: node.start, to: node.end };
  const insert = buildLine(next, node);
  const shouldUpdate = insert !== props.editorView.state.doc.sliceString(range.from, range.to);
  const changes = shouldUpdate
    ? props.editorView.state.changes({ from: range.from, to: range.to, insert })
    : undefined;
  const mappedAnchor =
    anchor !== undefined && changes ? changes.mapPos(anchor, anchorAssoc) : anchor;

  if (!shouldUpdate && mappedAnchor === undefined) return;

  props.editorView.dispatch({
    ...(changes ? { changes } : {}),
    ...(mappedAnchor !== undefined
      ? { selection: { anchor: mappedAnchor }, scrollIntoView: true }
      : {}),
  });
};

const suppressNextAutoFocus = (): void => {
  skippedAutoFocusPositions.add(props.node.start);
};

const skipBlurCommit = (): void => {
  shouldSkipBlurCommit.value = true;
};

const commitValue = (textArea: HTMLTextAreaElement): void => {
  dispatchKeywordUpdate(textArea.value);
};

const titleWidgetId = computed(() => buildTitleWidgetId(props.node.start));
const currentTitleLineRange = (): { from: number; to: number } => {
  const line = props.editorView.state.doc.lineAt(currentTitleRange().from);
  return { from: line.from, to: line.to };
};

const moveToAdjacentEditorTarget = async (
  textArea: HTMLTextAreaElement,
  direction: typeof EMBEDDED_WIDGET_DIRECTION.Previous | typeof EMBEDDED_WIDGET_DIRECTION.Next,
): Promise<void> => {
  suppressNextAutoFocus();
  dispatchKeywordUpdate(textArea.value);
  const range = currentTitleLineRange();
  await waitForWidgetDomUpdate();
  getEmbeddedWidgetBridge(props.editorView).dispatch({
    type: EMBEDDED_WIDGET_COMMAND.Exit,
    payload: {
      sourceId: titleWidgetId.value,
      range,
      direction,
    },
  });
};

const moveDown = async (textArea: HTMLTextAreaElement): Promise<void> => {
  await moveToAdjacentEditorTarget(textArea, EMBEDDED_WIDGET_DIRECTION.Next);
};

const moveUp = async (textArea: HTMLTextAreaElement): Promise<void> => {
  await moveToAdjacentEditorTarget(textArea, EMBEDDED_WIDGET_DIRECTION.Previous);
};

const focusEditorLine = (anchor: number): void => {
  props.editorView.dispatch({ selection: { anchor }, scrollIntoView: true });
  props.editorView.focus();
};

const insertEditorLineAfter = (position: number): void => {
  const changes = props.editorView.state.changes({ from: position, to: position, insert: NEWLINE });
  const anchor = changes.mapPos(position, 1);
  props.editorView.dispatch({ changes, selection: { anchor }, scrollIntoView: true });
  props.editorView.focus();
};

const focusEditorLineAfterTitle = (): void => {
  const line = props.editorView.state.doc.lineAt(currentTitleRange().from);
  const nextLineNumber = line.number + 1;

  if (nextLineNumber > props.editorView.state.doc.lines) {
    insertEditorLineAfter(line.to);
    return;
  }

  const nextLine = props.editorView.state.doc.line(nextLineNumber);
  if (nextLine.text.trim()) {
    insertEditorLineAfter(line.to);
    return;
  }

  focusEditorLine(nextLine.from);
};

const commitAndFocusEditorLineAfterTitle = (textArea: HTMLTextAreaElement): void => {
  suppressNextAutoFocus();
  dispatchKeywordUpdate(textArea.value);
  focusEditorLineAfterTitle();
};

const deleteKeyword = (): void => {
  const line = props.editorView.state.doc.lineAt(currentTitleRange().from);
  const to = line.to < props.editorView.state.doc.length ? line.to + 1 : line.to;

  suppressNextAutoFocus();
  props.editorView.dispatch({
    changes: { from: line.from, to },
    selection: { anchor: line.from },
    scrollIntoView: true,
  });
  props.editorView.focus();
};

const hasHardLineBreak = (value: string): boolean => value.includes(NEWLINE);

const navigateFromSingleSourceLine = async (
  textArea: HTMLTextAreaElement,
  key: 'ArrowUp' | 'ArrowDown',
): Promise<void> => {
  skipBlurCommit();

  if (key === 'ArrowUp') {
    await moveUp(textArea);
    return;
  }

  await moveDown(textArea);
};

const navigateAfterNativeArrow = (
  textArea: HTMLTextAreaElement,
  key: 'ArrowUp' | 'ArrowDown',
  selectionStart: number,
  selectionEnd: number,
): void => {
  requestAnimationFrame(() => {
    if (document.activeElement !== textArea) return;

    const selectionChanged =
      textArea.selectionStart !== selectionStart || textArea.selectionEnd !== selectionEnd;
    if (selectionChanged) return;
    if (key === 'ArrowUp') return;

    skipBlurCommit();
    void moveDown(textArea);
  });
};

const handleKeydown = async (event: KeyboardEvent): Promise<void> => {
  if (!(event.target instanceof HTMLTextAreaElement)) return;

  if ((event.key === 'Backspace' || event.key === 'Delete') && event.target.value.trim() === '') {
    event.preventDefault();
    skipBlurCommit();
    deleteKeyword();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    skipBlurCommit();
    commitAndFocusEditorLineAfterTitle(event.target);
    return;
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

  if (!hasHardLineBreak(event.target.value)) {
    event.preventDefault();
    await navigateFromSingleSourceLine(event.target, event.key);
    return;
  }

  navigateAfterNativeArrow(
    event.target,
    event.key,
    event.target.selectionStart,
    event.target.selectionEnd,
  );
};

const commit = (event: Event): void => {
  if (!(event.target instanceof HTMLTextAreaElement)) return;
  if (shouldSkipBlurCommit.value) {
    shouldSkipBlurCommit.value = false;
    return;
  }
  commitValue(event.target);
};

const focusTitleTextArea = (position: 'start' | 'end'): boolean => {
  const hasTextArea = Boolean(textAreaRef.value);
  textAreaRef.value?.focusAt(position);
  return hasTextArea;
};

onMounted(() => {
  unregisterWidget = getEmbeddedWidgetBridge(props.editorView).register({
    id: titleWidgetId.value,
    getRange: currentTitleRange,
    focus: ({ position }) => focusTitleTextArea(position),
  });

  const skipped = skippedAutoFocusPositions.delete(props.node.start);
  if (skipped) return;
  if (!isEditorSelectionInsideKeyword()) return;
  requestAnimationFrame(() => {
    const skippedBeforeFrame = skippedAutoFocusPositions.delete(props.node.start);
    if (skippedBeforeFrame) return;
    if (!isEditorSelectionInsideKeyword()) return;
    textAreaRef.value?.focusEnd();
  });
});

onBeforeUnmount(() => {
  unregisterWidget?.();
});
</script>

<style lang="scss" scoped>
.keyword-editor {
  @include flexify(center);

  padding: var(--padding-xs) var(--padding-sm);
  width: 100%;

  .input {
    flex: 1;
    min-width: 0;
    color: var(--fg);
    background: transparent;
    border: none;
    padding: 0;
  }

  .text {
    width: 100%;
    color: var(--fg);
  }

  .empty-text {
    color: var(--fg-muted);
    font-style: italic;
  }

  &.title-editor {
    .input,
    .text {
      font-size: 2rem;
      font-weight: var(--headline-font-weight);
      font-family: var(--headline-font-family);
      line-height: var(--editor-headline-line-height);
    }
  }
}
</style>
