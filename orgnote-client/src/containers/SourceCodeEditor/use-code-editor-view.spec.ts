import { test, expect, beforeEach, afterEach, vi } from 'vitest';
import { undoDepth } from '@codemirror/commands';
import { useCodeEditorView } from './use-code-editor-view';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

test('initView creates EditorView and returns it', () => {
  const { initView, destroyView } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  const view = initView(container, 'hello world');

  expect(view).toBeDefined();
  expect(container.querySelector('.cm-editor')).not.toBeNull();

  destroyView();
});

test('initView renders initial content', () => {
  const { initView, destroyView } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  const content = 'const x = 42;';
  initView(container, content);

  const cmContent = container.querySelector('.cm-content');
  expect(cmContent?.textContent).toContain('const');

  destroyView();
});

test('destroyView removes editor from DOM', () => {
  const { initView, destroyView } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  initView(container, 'test');
  expect(container.querySelector('.cm-editor')).not.toBeNull();

  destroyView();
  expect(container.querySelector('.cm-editor')).toBeNull();
});

test('updateContent changes editor content', () => {
  const { initView, destroyView, updateContent } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  initView(container, 'initial');
  updateContent('updated content');

  const cmContent = container.querySelector('.cm-content');
  expect(cmContent?.textContent).toContain('updated');

  destroyView();
});

test('updateContent does nothing when content is same', () => {
  const { initView, destroyView, updateContent, getEditorView } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  initView(container, 'same content');
  const dispatchSpy = vi.spyOn(getEditorView()!, 'dispatch');

  updateContent('same content');

  expect(dispatchSpy).not.toHaveBeenCalled();

  destroyView();
});

test('updateContent does nothing when editor is not initialized', () => {
  const { updateContent } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  expect(() => updateContent('test')).not.toThrow();
});

test('setReadonly does nothing when editor is not initialized', () => {
  const { setReadonly } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  expect(() => setReadonly(true)).not.toThrow();
});

test('setLanguage does nothing when editor is not initialized', () => {
  const { setLanguage } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  expect(() => setLanguage('typescript')).not.toThrow();
});

test('setTheme does nothing when editor is not initialized', () => {
  const { setTheme } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  expect(() => setTheme(true)).not.toThrow();
});

test('getEditorView returns undefined before init', () => {
  const { getEditorView } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  expect(getEditorView()).toBeUndefined();
});

test('getEditorView returns view after init', () => {
  const { initView, destroyView, getEditorView } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  initView(container, 'test');

  expect(getEditorView()).toBeDefined();

  destroyView();
});

test('getEditorView returns undefined after destroy', () => {
  const { initView, destroyView, getEditorView } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  initView(container, 'test');
  destroyView();

  expect(getEditorView()).toBeUndefined();
});

test('onContentUpdate callback is called when content changes', () => {
  const onContentUpdate = vi.fn();
  const { initView, destroyView, getEditorView } = useCodeEditorView({
    onContentUpdate,
  });

  initView(container, 'initial');

  const view = getEditorView()!;
  view.dispatch({
    changes: { from: 0, to: 7, insert: 'changed' },
  });

  expect(onContentUpdate).toHaveBeenCalledWith('changed');

  destroyView();
});

test('editor respects readonly option', () => {
  const { initView, destroyView, getEditorView } = useCodeEditorView({
    readonly: true,
    onContentUpdate: vi.fn(),
  });

  initView(container, 'readonly content');

  const view = getEditorView()!;
  expect(view.state.readOnly).toBe(true);

  destroyView();
});

test('setReadonly toggles readonly state', () => {
  const { initView, destroyView, getEditorView, setReadonly } = useCodeEditorView({
    readonly: false,
    onContentUpdate: vi.fn(),
  });

  initView(container, 'content');

  const view = getEditorView()!;
  expect(view.state.readOnly).toBe(false);

  setReadonly(true);
  expect(view.state.readOnly).toBe(true);

  setReadonly(false);
  expect(view.state.readOnly).toBe(false);

  destroyView();
});

test('editor renders with language support', () => {
  const { initView, destroyView } = useCodeEditorView({
    language: 'typescript',
    onContentUpdate: vi.fn(),
  });

  initView(container, 'const x: number = 1;');

  expect(container.querySelector('.cm-editor')).not.toBeNull();

  destroyView();
});

test('setLanguage changes language mode', () => {
  const { initView, destroyView, setLanguage } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  initView(container, '{"key": "value"}');

  expect(() => setLanguage('json')).not.toThrow();
  expect(() => setLanguage('typescript')).not.toThrow();
  expect(() => setLanguage(undefined)).not.toThrow();

  destroyView();
});

test('setTheme changes theme', () => {
  const { initView, destroyView, setTheme } = useCodeEditorView({
    isDark: false,
    onContentUpdate: vi.fn(),
  });

  initView(container, 'content');

  expect(() => setTheme(true)).not.toThrow();
  expect(() => setTheme(false)).not.toThrow();

  destroyView();
});

test('multiple init/destroy cycles work correctly', () => {
  const { initView, destroyView } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  initView(container, 'first');
  expect(container.querySelector('.cm-editor')).not.toBeNull();
  destroyView();
  expect(container.querySelector('.cm-editor')).toBeNull();

  initView(container, 'second');
  expect(container.querySelector('.cm-editor')).not.toBeNull();
  destroyView();
  expect(container.querySelector('.cm-editor')).toBeNull();
});

test('syncDocument does not add async initial load to history when document key unchanged', () => {
  const { initView, destroyView, getEditorView, syncDocument } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  initView(container, '', 'note-1');
  const view = getEditorView()!;

  expect(view.state.doc.toString()).toBe('');
  expect(undoDepth(view.state)).toBe(0);

  syncDocument('loaded content', 'note-1');

  expect(view.state.doc.toString()).toBe('loaded content');
  expect(undoDepth(view.state)).toBe(0);

  destroyView();
});

test('syncDocument resets history when document key changes', () => {
  const { initView, destroyView, getEditorView, syncDocument } = useCodeEditorView({
    onContentUpdate: vi.fn(),
  });

  initView(container, 'first note', 'note-1');

  const view = getEditorView()!;
  view.dispatch({
    changes: { from: view.state.doc.length, insert: ' changed' },
  });
  expect(undoDepth(view.state)).toBeGreaterThan(0);

  syncDocument('second note', 'note-2');

  expect(view.state.doc.toString()).toBe('second note');
  expect(undoDepth(view.state)).toBe(0);

  destroyView();
});
