<template>
  <div ref="containerRef" class="org-inline-editor" :class="{ 'single-line': singleLine }" />
</template>

<script lang="ts" setup>
import { syntaxTree } from '@codemirror/language';
import type { Range } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { Decoration, EditorView, keymap, ViewPlugin } from '@codemirror/view';
import { useWidgetBuilder } from 'src/composables/use-widget-builder';
import { buildOrgInlineEditorWidgets, createOrgEditorExtensions } from 'src/utils/org-editor';
import 'src/extensions/org-inline-markup/styles.css';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { isIosWebkit } from 'src/utils/platform-specific';
interface Props {
  modelValue: string;
  placeholder?: string;
  readonly?: boolean;
  autofocus?: boolean;
  singleLine?: boolean;
  preventFocusScroll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  readonly: false,
  autofocus: false,
  singleLine: false,
  preventFocusScroll: false,
});

const emit = defineEmits<{
  'update:modelValue': [string];
  focus: [];
  blur: [];
  submit: [];
  escape: [];
  expand: [];
  'tag-click': [{ tag: string; replaceWith: (newText: string) => void }];
  'priority-click': [];
}>();

const { createWidgetBuilder } = useWidgetBuilder();
const inlineWidgets = buildOrgInlineEditorWidgets(createWidgetBuilder);

const containerRef = ref<HTMLDivElement | null>(null);
let view: EditorView | undefined;

// iOS WebKit scrolls the document ~40ms after focusing an editable to "reveal"
// it, even when it's already visible in a fixed panel — a jarring jump. Safari
// skips that scroll if the element is transparent at the check moment, so blink
// opacity to 0 past the window, then restore (imperceptible).
const suppressIosFocusScroll = (): void => {
  if (!isIosWebkit() || !containerRef.value) return;
  const el = containerRef.value;
  el.style.opacity = '0';
  setTimeout(() => (el.style.opacity = ''), 60);
};

const headlineLevel1WarningMark = Decoration.mark({ class: 'cm-headline-warning' });

const buildLevel1HeadlineWarningDecorations = (v: EditorView): DecorationSet => {
  const ranges: Range<Decoration>[] = [];
  syntaxTree(v.state).iterate({
    enter(node) {
      if (node.name !== 'Headline-1') return;
      ranges.push(headlineLevel1WarningMark.range(node.from, node.to));
    },
  });
  return Decoration.set(ranges, true);
};

const level1HeadlineWarningPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(v: EditorView) {
      this.decorations = buildLevel1HeadlineWarningDecorations(v);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildLevel1HeadlineWarningDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

const buildSingleLineKeymap = () =>
  keymap.of([
    {
      key: 'Enter',
      run: () => {
        emit('submit');
        return true;
      },
    },
    {
      key: 'Shift-Enter',
      run: () => {
        emit('expand');
        return true;
      },
    },
  ]);

const buildCustomKeymap = () =>
  keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        emit('submit');
        return true;
      },
    },
    {
      key: 'Escape',
      run: () => {
        emit('escape');
        return true;
      },
    },
  ]);

const buildExtensions = () => {
  const { extensions: orgExtensions } = createOrgEditorExtensions({
    mode: 'inline',
    singleLine: props.singleLine,
    onContentUpdate: (content) => emit('update:modelValue', content),
    placeholder: props.placeholder,
    readonly: props.readonly,
    inlineWidgets: props.singleLine ? undefined : inlineWidgets,
    onTagClick: (tag, replaceWith) => emit('tag-click', { tag, replaceWith }),
    onPriorityClick: () => emit('priority-click'),
  });

  const singleLineKeymap = props.singleLine ? [buildSingleLineKeymap()] : [];
  return [
    ...singleLineKeymap,
    buildCustomKeymap(),
    ...orgExtensions,
    EditorView.domEventHandlers({
      focus: () => {
        if (props.preventFocusScroll) suppressIosFocusScroll();
        emit('focus');
      },
      blur: () => emit('blur'),
    }),
    ...(props.singleLine ? [] : [level1HeadlineWarningPlugin]),
  ];
};

onMounted(() => {
  if (!containerRef.value) return;
  view = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: buildExtensions(),
    }),
    parent: containerRef.value,
  });
  if (props.autofocus) {
    // [autofocus] lets the modal container focus this editor after mount
    // (it queries [autofocus] in a rAF, since the editor mounts before the modal).
    view.contentDOM.setAttribute('autofocus', '');
    view.dispatch({ selection: { anchor: view.state.doc.length }, scrollIntoView: true });
    view.focus();
  }
});

onUnmounted(() => {
  view?.destroy();
  view = undefined;
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === newVal) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newVal },
    });
  },
);

const focus = (): void => view?.focus();
const blur = (): void => (view?.contentDOM as HTMLElement | undefined)?.blur();
const getView = (): EditorView | undefined => view;
defineExpose({ focus, blur, getView });
</script>
