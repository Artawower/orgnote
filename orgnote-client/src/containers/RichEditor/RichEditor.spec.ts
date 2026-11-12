import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { BufferViewStateHandle } from 'orgnote-api';
import type { CodeMirrorViewState } from 'src/utils/editor-view-state';
import RichEditor from './RichEditor.vue';

const mocks = vi.hoisted(() => ({
  destroyView: vi.fn(),
  getEditorView: vi.fn(),
  initView: vi.fn(),
  restoreState: vi.fn(),
  saveState: vi.fn(),
  setCursorToEOF: vi.fn(),
  setReadonly: vi.fn(),
  syncDocument: vi.fn(),
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useConfig: () => ({ config: { editor: {} } }),
    },
  },
}));

vi.mock('./use-editor-view', () => ({
  useEditorView: () => ({
    destroyView: mocks.destroyView,
    getEditorView: mocks.getEditorView,
    initView: mocks.initView,
    setReadonly: mocks.setReadonly,
    syncDocument: mocks.syncDocument,
  }),
}));

vi.mock('./use-cursor', () => ({ setCursorToEOF: mocks.setCursorToEOF }));

vi.mock('src/utils/editor-view-state', () => ({
  restoreCodeMirrorViewStateFromHandle: mocks.restoreState,
  saveCodeMirrorViewState: mocks.saveState,
}));

vi.mock('src/boot/report', () => ({ reporter: { reportError: vi.fn() } }));

const view = { state: {} };
const viewState = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
} as unknown as BufferViewStateHandle<CodeMirrorViewState>;
let wrapper: VueWrapper;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEditorView.mockReturnValue(view);
  mocks.initView.mockReturnValue(view);
  mocks.restoreState.mockReturnValue(true);
});

afterEach(() => {
  wrapper?.unmount();
});

test('RichEditor restores and saves its scoped viewer state', () => {
  wrapper = mount(RichEditor, {
    props: { modelValue: '* Note', documentKey: 'file:///note.org', viewState },
  });

  expect(mocks.restoreState).toHaveBeenCalledWith(view, viewState);
  expect(mocks.setCursorToEOF).not.toHaveBeenCalled();

  wrapper.unmount();

  expect(mocks.saveState).toHaveBeenCalledWith(view, viewState);
  expect(mocks.destroyView).toHaveBeenCalled();
});

test('RichEditor uses its default cursor when no saved state exists', () => {
  mocks.restoreState.mockReturnValue(false);

  wrapper = mount(RichEditor, {
    props: { modelValue: '* Note', documentKey: 'file:///note.org', viewState },
  });

  expect(mocks.setCursorToEOF).toHaveBeenCalledWith(view);
});
