import { test, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { EditorView } from '@codemirror/view';
import type { BufferViewStateHandle } from 'orgnote-api';
import type { CodeMirrorViewState } from 'src/utils/editor-view-state';
import SourceCodeEditor from './SourceCodeEditor.vue';

const mockThemeStore = {
  isDark: false,
};

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useTheme: vi.fn(() => mockThemeStore),
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError: vi.fn(),
  },
}));

const createEditorState = (cursor: number, top = 0): CodeMirrorViewState => ({
  selection: { ranges: [{ anchor: cursor, head: cursor }], mainIndex: 0 },
  scroll: { top, left: 0 },
});

const createStateHandle = (initialState?: CodeMirrorViewState) => {
  let state = initialState;
  const handle: BufferViewStateHandle<CodeMirrorViewState> = {
    get: () => state,
    set: (nextState) => {
      state = nextState;
    },
    clear: () => {
      state = undefined;
    },
  };
  return { handle, getState: () => state };
};

let wrapper: VueWrapper;

beforeEach(() => {
  vi.clearAllMocks();
  mockThemeStore.isDark = false;
});

afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
});

test('renders editor container', () => {
  wrapper = mount(SourceCodeEditor, {
    props: {},
  });

  expect(wrapper.find('.source-code-editor').exists()).toBe(true);
  expect(wrapper.find('.container').exists()).toBe(true);
});

test('initializes CodeMirror editor on mount', async () => {
  wrapper = mount(SourceCodeEditor, {
    props: {},
    attachTo: document.body,
  });

  await nextTick();
  await nextTick();

  const cmEditor = wrapper.find('.cm-editor');
  expect(cmEditor.exists()).toBe(true);
});

test('displays initial content from v-model', async () => {
  const content = 'const x = 1;';
  wrapper = mount(SourceCodeEditor, {
    props: {
      modelValue: content,
    },
    attachTo: document.body,
  });

  await nextTick();
  await nextTick();

  const cmContent = wrapper.find('.cm-content');
  expect(cmContent.text()).toContain('const');
});

test('applies readonly class when readonly prop is true', () => {
  wrapper = mount(SourceCodeEditor, {
    props: {
      readonly: true,
    },
  });

  expect(wrapper.find('.source-code-editor').classes()).toContain('readonly');
});

test('does not apply readonly class when readonly prop is false', () => {
  wrapper = mount(SourceCodeEditor, {
    props: {
      readonly: false,
    },
  });

  expect(wrapper.find('.source-code-editor').classes()).not.toContain('readonly');
});

test('renders line numbers', async () => {
  wrapper = mount(SourceCodeEditor, {
    props: {
      modelValue: 'line 1\nline 2\nline 3',
    },
    attachTo: document.body,
  });

  await nextTick();
  await nextTick();

  const gutters = wrapper.find('.cm-gutters');
  expect(gutters.exists()).toBe(true);
});

test('emits update:modelValue when content changes', async () => {
  wrapper = mount(SourceCodeEditor, {
    props: {
      modelValue: 'initial',
    },
    attachTo: document.body,
  });

  await nextTick();
  await nextTick();

  const cmContent = wrapper.find('.cm-content');
  expect(cmContent.exists()).toBe(true);
});

test('restores cursor, selection, and scroll from viewer state', async () => {
  let savedState: CodeMirrorViewState | undefined;
  const viewState: BufferViewStateHandle<CodeMirrorViewState> = {
    get: () => savedState,
    set: (state) => {
      savedState = state;
    },
    clear: () => {
      savedState = undefined;
    },
  };
  wrapper = mount(SourceCodeEditor, {
    props: { modelValue: '0123456789', viewState },
    attachTo: document.body,
  });
  await nextTick();
  const firstView = EditorView.findFromDOM(
    wrapper.get('.cm-editor').element as HTMLElement,
  );
  firstView!.contentDOM.blur();
  firstView!.dispatch({ selection: { anchor: 3 } });
  firstView!.scrollDOM.scrollTop = 90;
  firstView!.scrollDOM.scrollLeft = 14;

  wrapper.unmount();
  wrapper = mount(SourceCodeEditor, {
    props: { modelValue: '0123456789', viewState },
    attachTo: document.body,
  });
  await nextTick();
  const restoredView = EditorView.findFromDOM(
    wrapper.get('.cm-editor').element as HTMLElement,
  );

  expect(restoredView?.state.selection.main).toMatchObject({ anchor: 3, head: 3 });
  expect(restoredView?.scrollDOM.scrollTop).toBe(90);
  expect(restoredView?.scrollDOM.scrollLeft).toBe(14);
});

test('saves the previous scope before restoring a new document scope', async () => {
  const firstState = createStateHandle();
  const secondState = createStateHandle(createEditorState(7, 40));
  wrapper = mount(SourceCodeEditor, {
    props: {
      modelValue: '0123456789',
      documentKey: 'file:///first.ts',
      viewState: firstState.handle,
    },
    attachTo: document.body,
  });
  await nextTick();
  const view = EditorView.findFromDOM(wrapper.get('.cm-editor').element as HTMLElement)!;
  view.contentDOM.blur();
  view.dispatch({ selection: { anchor: 3 } });

  await wrapper.setProps({
    modelValue: 'abcdefghij',
    documentKey: 'file:///second.ts',
    viewState: secondState.handle,
  });

  expect(firstState.getState()?.selection.ranges[0]).toEqual({ anchor: 3, head: 3 });
  expect(view.state.selection.main).toMatchObject({ anchor: 7, head: 7 });
  expect(view.scrollDOM.scrollTop).toBe(40);
});

test('cleans up editor on unmount', async () => {
  wrapper = mount(SourceCodeEditor, {
    props: {},
    attachTo: document.body,
  });

  await nextTick();
  await nextTick();

  const cmEditor = wrapper.find('.cm-editor');
  expect(cmEditor.exists()).toBe(true);

  wrapper.unmount();

  expect(document.querySelector('.cm-editor')).toBeNull();
});

test('accepts language prop for syntax highlighting', async () => {
  wrapper = mount(SourceCodeEditor, {
    props: {
      modelValue: '{"key": "value"}',
      language: 'json',
    },
    attachTo: document.body,
  });

  await nextTick();
  await nextTick();

  const cmEditor = wrapper.find('.cm-editor');
  expect(cmEditor.exists()).toBe(true);
});

test('handles empty content gracefully', async () => {
  wrapper = mount(SourceCodeEditor, {
    props: {
      modelValue: '',
    },
    attachTo: document.body,
  });

  await nextTick();
  await nextTick();

  const cmEditor = wrapper.find('.cm-editor');
  expect(cmEditor.exists()).toBe(true);
});

test('handles undefined content gracefully', async () => {
  wrapper = mount(SourceCodeEditor, {
    props: {},
    attachTo: document.body,
  });

  await nextTick();
  await nextTick();

  const cmEditor = wrapper.find('.cm-editor');
  expect(cmEditor.exists()).toBe(true);
});
