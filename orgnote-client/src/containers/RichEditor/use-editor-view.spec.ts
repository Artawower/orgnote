import { EditorState } from '@codemirror/state';
import { undoDepth, history, historyKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { beforeEach, expect, test, vi } from 'vitest';

const clearActiveContext = vi.fn();
const setActiveContext = vi.fn();
const updateActiveContext = vi.fn();
const editorStore = {
  activeContext: {
    editorViewGetter: undefined as (() => unknown) | undefined,
  },
  clearActiveContext,
  setActiveContext,
  updateActiveContext,
};

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useEditor: () => editorStore,
    },
  },
}));

vi.mock('./use-editor-state', () => ({
  useEditorState: (options: { filePathGetter?: () => string | undefined }) => ({
    orgNode: { value: null },
    createState: (content: string) =>
      EditorState.create({
        doc: content,
        extensions: [history(), keymap.of(historyKeymap)],
      }),
    reconfigureReadonly: vi.fn(),
    reconfigureWidgets: vi.fn(),
    setupWidgetsWatcher: vi.fn(),
    setupScrollMarginsWatcher: vi.fn(),
    setEditorView: vi.fn(),
    filePathGetter: options.filePathGetter,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  editorStore.activeContext.editorViewGetter = undefined;
  document.body.textContent = '';
});

test('syncDocument does not add async initial load to RichEditor history when document key unchanged', async () => {
  const { useEditorView } = await import('./use-editor-view');
  const container = document.createElement('div');
  document.body.appendChild(container);

  const { initView, syncDocument, getEditorView, destroyView } = useEditorView({
    filePathGetter: () => '/notes/first.org',
    onContentUpdate: vi.fn(),
  });

  initView(container, '', 'note-1');
  editorStore.activeContext.editorViewGetter = getEditorView;
  const view = getEditorView()!;

  expect(view.state.doc.toString()).toBe('');
  expect(undoDepth(view.state)).toBe(0);

  syncDocument('loaded content', 'note-1');

  expect(view.state.doc.toString()).toBe('loaded content');
  expect(undoDepth(view.state)).toBe(0);

  destroyView();
});

test('syncDocument resets RichEditor history when document key changes', async () => {
  const { useEditorView } = await import('./use-editor-view');
  const container = document.createElement('div');
  document.body.appendChild(container);
  let currentFilePath = '/notes/first.org';

  const { initView, syncDocument, getEditorView, destroyView } = useEditorView({
    filePathGetter: () => currentFilePath,
    onContentUpdate: vi.fn(),
  });

  initView(container, 'first note', 'note-1');
  editorStore.activeContext.editorViewGetter = getEditorView;
  const view = getEditorView()!;
  view.dispatch({ changes: { from: view.state.doc.length, insert: ' changed' } });

  expect(undoDepth(view.state)).toBeGreaterThan(0);

  currentFilePath = '/notes/second.org';
  syncDocument('second note', 'note-2');

  expect(view.state.doc.toString()).toBe('second note');
  expect(undoDepth(view.state)).toBe(0);
  expect(setActiveContext).toHaveBeenCalledWith(
    expect.objectContaining({ filePath: '/notes/second.org' }),
  );

  destroyView();
});
