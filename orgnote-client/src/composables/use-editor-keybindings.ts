import { KEYBINDING_CONTEXTS, type Hotkey, type ResolvedKeybinding } from 'orgnote-api';
import { keymap } from '@codemirror/view';
import { Compartment } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { watch } from 'vue';
import { api } from 'src/boot/api';

const toCodeMirrorKey = (h: Hotkey): string => [...(h.modifiers ?? []), h.key].join('-');

const buildEditorKeymap = (
  bindings: ReadonlyArray<ResolvedKeybinding>,
  execute: (command: string, data?: unknown, options?: { interactive?: boolean }) => void,
): Extension =>
  keymap.of(
    bindings
      .filter((b) => b.context === KEYBINDING_CONTEXTS.EDITOR)
      .flatMap((b) =>
        b.hotkeys.map((h) => ({
          key: toCodeMirrorKey(h),
          run: () => {
            execute(b.command, undefined, { interactive: true });
            return true;
          },
        })),
      ),
  );

export const useEditorKeybindings = () => {
  const keybindingsStore = api.core.useKeybindings();
  const commandsStore = api.core.useCommands();
  const compartment = new Compartment();

  const initialExtension: Extension = compartment.of(
    buildEditorKeymap(keybindingsStore.keybindings, commandsStore.execute),
  );

  let stopWatcher: (() => void) | undefined;

  const watchKeybindings = (view?: EditorView): void => {
    stopWatcher?.();
    stopWatcher = undefined;
    if (!view) return;
    stopWatcher = watch(
      () => keybindingsStore.keybindings,
      (bindings) => {
        view.dispatch({
          effects: compartment.reconfigure(buildEditorKeymap(bindings, commandsStore.execute)),
        });
      },
    );
  };

  return { initialExtension, watchKeybindings };
};
