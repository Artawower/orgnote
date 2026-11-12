import type { Ref } from 'vue';
import type { StoreDefinition } from './store';
import type { Hotkey, KeybindingsConfig } from './keybinding-schemas';

export * from './keybinding-schemas';

export type KeybindingContextId =
  | (typeof KEYBINDING_CONTEXTS)[keyof typeof KEYBINDING_CONTEXTS]
  | (string & {});

export const KEYBINDING_CONTEXTS = {
  GLOBAL: 'global',
  /* app-shell shortcuts; bypasses editable-target guard */
  SHELL: 'shell',
  EDITOR: 'editor',
  /* active while completion/command-palette popup is open */
  COMPLETION: 'completion',
  /* blocks global and editor shortcuts while on the stack */
  MODAL: 'modal',
  FILE_MANAGER: 'fileManager',
} as const;

export interface ResolvedKeybinding {
  command: string;
  hotkeys: Hotkey[];
  context: KeybindingContextId;
}

export interface KeybindingsStore {
  readonly keybindings: Ref<ReadonlyArray<ResolvedKeybinding>>;
  /* last element = highest-priority context; 'global' is always first */
  readonly contextStack: Ref<ReadonlyArray<KeybindingContextId>>;
  readonly userBindings: Ref<Readonly<KeybindingsConfig>>;

  /*
   * Pushes a context onto the scope stack.
   * Returns a cleanup fn that pops it. Reference-counted — safe to call
   * multiple times with the same id; one cleanup call per pushContext call.
   */
  pushContext(contextId: KeybindingContextId): () => void;
  popContext(contextId: KeybindingContextId): void;

  /* replaces defaults; pass [] to disable all shortcuts for this command */
  setHotkeys(command: string, hotkeys: Hotkey[]): void;
  /* removes persisted entry; command falls back to CommandMeta.defaultHotkeys */
  clearHotkeys(command: string): void;
  getHotkeys(command: string): Hotkey[];
  findConflict(
    hotkey: Hotkey,
    context: KeybindingContextId,
    excludeCommand?: string,
  ): string | undefined;
}

export type KeybindingsStoreDefinition = StoreDefinition<KeybindingsStore>;
