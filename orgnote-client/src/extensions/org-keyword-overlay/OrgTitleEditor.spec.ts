import { EditorState, type TransactionSpec } from '@codemirror/state';
import { deleteCharBackward } from '@codemirror/commands';
import { markRaw, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import type { OrgNode } from 'org-mode-ast';
import { afterEach, expect, test, vi } from 'vitest';
import {
  EMBEDDED_WIDGET_COMMAND,
  EMBEDDED_WIDGET_DIRECTION,
  getEmbeddedWidgetBridge,
} from 'src/utils/org-editor/embedded-widget-runtime';
import OrgTitleEditor from './OrgTitleEditor.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const titleText = '#+TITLE: Hello';

const createTitleNode = (source = titleText): OrgNode => ({
  start: 0,
  end: source.length,
  children: {
    first: { value: source },
  },
}) as unknown as OrgNode;

const createEditorView = (anchor = `${titleText}\n`.length, hasFocus = false) => ({
  state: EditorState.create({
    doc: `${titleText}\n\n:PROPERTIES:`,
    selection: { anchor },
  }),
  hasFocus,
  dispatch: vi.fn(),
  focus: vi.fn(),
});

const createMutableEditorView = (doc: string) => {
  let state = EditorState.create({ doc, selection: { anchor: doc.length } });
  return {
    get state() {
      return state;
    },
    hasFocus: false,
    dispatch: vi.fn((spec: TransactionSpec) => {
      state = state.update(spec).state;
    }),
    focus: vi.fn(),
  };
};

const waitForAnimationFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

afterEach(() => {
  vi.restoreAllMocks();
});

test('OrgTitleEditor autofocuses on mount when editor selection is inside title', async () => {
  const focus = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');
  const editorView = markRaw(createEditorView('#+TITLE: '.length, true));

  mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(),
      editorView: editorView as never,
    },
  });
  await nextTick();
  await waitForAnimationFrame();

  expect(focus).toHaveBeenCalledOnce();
});

test('OrgTitleEditor autofocuses from command palette selection handoff', async () => {
  const focus = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');
  const editorView = markRaw(createEditorView('#+TITLE: '.length, false));

  mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(),
      editorView: editorView as never,
    },
  });
  await nextTick();
  await waitForAnimationFrame();

  expect(focus).toHaveBeenCalledOnce();
});

test('OrgTitleEditor does not autofocus when selection is on the line after title', async () => {
  const focus = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');
  const editorView = markRaw(createEditorView(`${titleText}\n`.length, true));

  mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(),
      editorView: editorView as never,
    },
  });
  await nextTick();
  await waitForAnimationFrame();

  expect(focus).not.toHaveBeenCalled();
});

const pressTitleKey = async (
  wrapper: ReturnType<typeof mount>,
  key: string,
  value: string,
): Promise<KeyboardEvent> => {
  const textArea = wrapper.find('textarea');
  textArea.element.value = value;
  textArea.element.focus();
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  textArea.element.dispatchEvent(event);
  await waitForAnimationFrame();
  return event;
};

const pressEnterInTitle = async (wrapper: ReturnType<typeof mount>, value: string): Promise<void> => {
  await pressTitleKey(wrapper, 'Enter', value);
};

test('OrgTitleEditor creates a CodeMirror line after title when pressing Enter at document end', async () => {
  const marker = '#+TITLE:';
  const editorView = markRaw(createMutableEditorView(marker));
  const wrapper = mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(marker),
      editorView: editorView as never,
    },
  });
  await nextTick();

  await pressEnterInTitle(wrapper, 'Some text');

  expect(editorView.state.doc.toString()).toBe('#+TITLE: Some text\n');
  expect(editorView.state.selection.main.head).toBe('#+TITLE: Some text\n'.length);
  expect(editorView.focus).toHaveBeenCalled();
});

test('OrgTitleEditor does not let pending autofocus steal focus after Enter', async () => {
  const focus = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');
  const marker = '#+TITLE: ';
  const editorView = markRaw(createMutableEditorView(marker));
  const wrapper = mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(marker),
      editorView: editorView as never,
    },
  });
  await nextTick();

  await pressEnterInTitle(wrapper, 'Some text');

  expect(editorView.state.doc.toString()).toBe('#+TITLE: Some text\n');
  expect(editorView.state.selection.main.head).toBe('#+TITLE: Some text\n'.length);
  expect(editorView.focus).toHaveBeenCalled();
  expect(focus).toHaveBeenCalledOnce();
});

test('OrgTitleEditor inserts a blank line before properties when pressing Enter above drawer', async () => {
  const documentText = `${titleText}\n:PROPERTIES:\n:ID: Some id!\n:END:\n`;
  const editorView = markRaw(createMutableEditorView(documentText));
  const wrapper = mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(),
      editorView: editorView as never,
    },
  });
  await nextTick();

  await pressEnterInTitle(wrapper, 'Hello');

  expect(editorView.state.doc.toString()).toBe(`${titleText}\n\n:PROPERTIES:\n:ID: Some id!\n:END:\n`);
  expect(editorView.state.selection.main.head).toBe(`${titleText}\n`.length);
});

test('OrgTitleEditor repairs title line before inserting blank line above properties', async () => {
  const malformedTitleLine = '#+TITLE: Hellow!:PROPERTIES:';
  const documentText = `${malformedTitleLine}\n:PROPERTIES:\n:ID: Some id!\n:END:\n`;
  const editorView = markRaw(createMutableEditorView(documentText));
  const wrapper = mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(malformedTitleLine),
      editorView: editorView as never,
    },
  });
  await nextTick();

  await pressEnterInTitle(wrapper, 'Hellow!');

  const expected = '#+TITLE: Hellow!\n\n:PROPERTIES:\n:ID: Some id!\n:END:\n';
  expect(editorView.state.doc.toString()).toBe(expected);
  expect(editorView.state.selection.main.head).toBe('#+TITLE: Hellow!\n'.length);
});

test('OrgTitleEditor uses current title range when pressing Enter after long local edits', async () => {
  const staleTitle = '#+TITLE: Some title';
  const currentTitle = '#+TITLE: Some titleqwfqwfsn: arsearnes';
  const documentText = `${currentTitle}\n:PROPERTIES:\n:id: qwfqwfqwf\n:END:\n`;
  const editorView = markRaw(createMutableEditorView(documentText));
  const wrapper = mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(staleTitle),
      editorView: editorView as never,
    },
  });
  await nextTick();

  await pressEnterInTitle(wrapper, 'Some titleqwfqwfsn: arsearnes');

  const expected = `${currentTitle}\n\n:PROPERTIES:\n:id: qwfqwfqwf\n:END:\n`;
  expect(editorView.state.doc.toString()).toBe(expected);
  expect(editorView.state.selection.main.head).toBe(`${currentTitle}\n`.length);
});

test('OrgTitleEditor moves down from a single source line title with ArrowDown', async () => {
  const editorView = markRaw(createMutableEditorView(titleText));
  const wrapper = mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(),
      editorView: editorView as never,
    },
  });
  await nextTick();

  const event = await pressTitleKey(wrapper, 'ArrowDown', 'Hello');

  expect(event.defaultPrevented).toBe(true);
  expect(editorView.state.doc.toString()).toBe(`${titleText}\n`);
  expect(editorView.state.selection.main.head).toBe(`${titleText}\n`.length);
  expect(editorView.focus).toHaveBeenCalled();
});

test('OrgTitleEditor prevents native caret jump on ArrowUp inside a single source line title', async () => {
  const editorView = markRaw(createMutableEditorView(titleText));
  const wrapper = mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(),
      editorView: editorView as never,
    },
  });
  await nextTick();

  const event = await pressTitleKey(wrapper, 'ArrowUp', 'Hello');

  expect(event.defaultPrevented).toBe(true);
  expect(editorView.state.doc.toString()).toBe(titleText);
});

test('OrgTitleEditor focuses title from the CodeMirror line created by Enter', async () => {
  const focus = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');
  const marker = '#+TITLE:';
  const editorView = markRaw(createMutableEditorView(marker));
  const wrapper = mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(marker),
      editorView: editorView as never,
    },
  });
  await nextTick();
  await pressEnterInTitle(wrapper, 'Some text');
  focus.mockClear();

  const focused = getEmbeddedWidgetBridge(editorView as never).dispatch({
    type: EMBEDDED_WIDGET_COMMAND.FocusFromEditor,
    payload: {
      direction: EMBEDDED_WIDGET_DIRECTION.Previous,
      position: 'end',
    },
  });

  expect(focused).toBe(true);
  expect(focus).toHaveBeenCalledTimes(1);
});

test('CodeMirror backspace removes the line created after title Enter', async () => {
  const marker = '#+TITLE:';
  const editorView = markRaw(createMutableEditorView(marker));
  const wrapper = mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(marker),
      editorView: editorView as never,
    },
  });
  await nextTick();
  await pressEnterInTitle(wrapper, 'Some text');

  const deleted = deleteCharBackward(editorView as never);

  expect(deleted).toBe(true);
  expect(editorView.state.doc.toString()).toBe('#+TITLE: Some text');
  expect(editorView.state.selection.main.head).toBe('#+TITLE: Some text'.length);
});

test('OrgTitleEditor focuses synchronously when bridge enters from the line below', async () => {
  const focus = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');
  const editorView = markRaw(createEditorView());

  mount(OrgTitleEditor, {
    props: {
      node: createTitleNode(),
      editorView: editorView as never,
    },
  });
  await nextTick();

  const bridge = getEmbeddedWidgetBridge(editorView as never);
  expect(bridge.snapshot().map((widget) => widget.id)).toEqual(['title:0']);

  const focused = bridge.dispatch({
    type: EMBEDDED_WIDGET_COMMAND.FocusFromEditor,
    payload: {
      direction: EMBEDDED_WIDGET_DIRECTION.Previous,
      position: 'end',
    },
  });

  expect(focused).toBe(true);
  expect(focus).toHaveBeenCalledTimes(1);
});
