import { ref, reactive } from 'vue';
import type { EditorView } from '@codemirror/view';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('src/boot/api', () => ({
  api: {
    ui: {
      useKeyboardState: vi.fn(() => ({
        keyboardOpened: keyboardOpenedRef,
        keyboardHeight: ref(0),
      })),
      useScreenDetection: vi.fn(() => ({
        tabletBelow: tabletBelowRef,
        tabletAbove: ref(true),
      })),
    },
    core: {
      useConfig: vi.fn(() =>
        reactive({
          config: ref({
            editor: {
              showSpecialSymbols: true,
            },
          }),
        }),
      ),
      useEditor: vi.fn(() =>
        reactive({
          updateActiveContext: vi.fn(),
          setActiveContext: vi.fn(),
          inlineWidgets: {},
          multilineWidgets: {},
          lineClasses: {},
          extensions: [],
        }),
      ),
      useKeybindings: vi.fn(() => ({
        keybindings: [],
        pushContext: vi.fn(() => vi.fn()),
        popContext: vi.fn(),
      })),
      useCommands: vi.fn(() => ({
        execute: vi.fn(),
      })),
    },
  },
}));

vi.mock('src/composables/use-widget-builder', () => ({
  useWidgetBuilder: vi.fn(() => ({
    createWidgetBuilder: vi.fn(),
    createMultilineWidgetBuilder: vi.fn(),
  })),
}));

vi.mock('src/utils/dynamic-component', () => ({
  useDynamicComponent: vi.fn(() => ({})),
}));

vi.mock('src/utils/css-utils', () => ({
  getNumericCssVar: vi.fn(() => 52),
}));

vi.mock('./facets', () => ({
  orgNodeGetterFacet: { of: vi.fn() },
  readonlyFacet: { of: vi.fn() },
  inlineWidgetsFacet: { of: vi.fn() },
  multilineWidgetsFacet: { of: vi.fn() },
  lineClassesFacet: { of: vi.fn() },
}));

vi.mock('./widgets', () => ({
  orgInlineWidgets: {},
  orgLineDecoration: {},
  readOnlyTransactionFilter: {},
}));

vi.mock('./widgets/multiline-widgets', () => ({
  createMultilineWidgetsField: vi.fn(() => ({})),
}));

const keyboardOpenedRef = ref(false);
const tabletBelowRef = ref(false);

type DispatchPayload = {
  scrollIntoView?: boolean;
};

const getLastDispatchPayload = (dispatchMock: ReturnType<typeof vi.fn>): DispatchPayload => {
  const lastCall = dispatchMock.mock.calls.at(-1);
  expect(lastCall).toBeDefined();

  const [payload] = lastCall as [DispatchPayload];
  return payload;
};

describe('useEditorState', () => {
  beforeEach(() => {
    keyboardOpenedRef.value = false;
    tabletBelowRef.value = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setupScrollMarginsWatcher', () => {
    it('should dispatch scrollIntoView: true when keyboard opens on mobile', async () => {
      const { useEditorState } = await import('./use-editor-state');

      const fakeDispatch = vi.fn();
      const fakeView = {
        dispatch: fakeDispatch,
        scrollDOM: {},
      } as unknown as EditorView;

      const { setupScrollMarginsWatcher } = useEditorState({
        editorViewGetter: () => fakeView,
        onContentUpdate: vi.fn(),
        filePathGetter: () => '/test.org',
      });

      setupScrollMarginsWatcher(() => fakeView);

      tabletBelowRef.value = true;
      keyboardOpenedRef.value = true;

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fakeDispatch).toHaveBeenCalled();
      const lastCall = getLastDispatchPayload(fakeDispatch);
      expect(lastCall.scrollIntoView).toBe(true);
    });

    it('should NOT dispatch scrollIntoView when keyboard opens on desktop', async () => {
      const { useEditorState } = await import('./use-editor-state');

      const fakeDispatch = vi.fn();
      const fakeView = {
        dispatch: fakeDispatch,
        scrollDOM: {},
      } as unknown as EditorView;

      const { setupScrollMarginsWatcher } = useEditorState({
        editorViewGetter: () => fakeView,
        onContentUpdate: vi.fn(),
        filePathGetter: () => '/test.org',
      });

      setupScrollMarginsWatcher(() => fakeView);

      tabletBelowRef.value = false;
      keyboardOpenedRef.value = true;

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fakeDispatch).toHaveBeenCalled();
      const lastCall = getLastDispatchPayload(fakeDispatch);
      expect(lastCall.scrollIntoView).toBeFalsy();
    });

    it('should NOT dispatch scrollIntoView when keyboard closes', async () => {
      const { useEditorState } = await import('./use-editor-state');

      const fakeDispatch = vi.fn();
      const fakeView = {
        dispatch: fakeDispatch,
        scrollDOM: {},
      } as unknown as EditorView;

      const { setupScrollMarginsWatcher } = useEditorState({
        editorViewGetter: () => fakeView,
        onContentUpdate: vi.fn(),
        filePathGetter: () => '/test.org',
      });

      setupScrollMarginsWatcher(() => fakeView);

      keyboardOpenedRef.value = true;
      tabletBelowRef.value = true;
      await new Promise((resolve) => setTimeout(resolve, 0));

      keyboardOpenedRef.value = false;
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fakeDispatch).toHaveBeenCalled();
      const lastCall = getLastDispatchPayload(fakeDispatch);
      expect(lastCall.scrollIntoView).toBeFalsy();
    });
  });
});
