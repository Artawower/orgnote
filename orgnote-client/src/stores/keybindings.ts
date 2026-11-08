import {
  KEYBINDING_CONTEXTS,
  KEYBINDING_MODIFIERS,
  type Command,
  type Hotkey,
  type KeybindingContextId,
  type KeybindingsConfig,
  type KeybindingsStore,
  type ResolvedKeybinding,
} from 'orgnote-api';
import { defineStore } from 'pinia';
import { computed, onScopeDispose, readonly, ref, watch } from 'vue';
import { useCommandsStore } from './command';
import { useConfigStore } from './config';
import { hasWindow } from 'src/utils/platform-specific';
import { isMac } from 'src/utils/hotkey-display';
import { api } from 'src/boot/api';
import type { ResolvedElectronHotkey } from '../../src-electron/electron-keybinding-channels';

const keyMatchesEvent = (hotkey: Hotkey, event: KeyboardEvent): boolean => {
  if (event.key.toLowerCase() === hotkey.key.toLowerCase()) return true;
  if (/^\d$/.test(hotkey.key)) return event.code === `Digit${hotkey.key}`;
  return false;
};

const hotkeyMatchesEvent = (hotkey: Hotkey, event: KeyboardEvent): boolean => {
  if (!keyMatchesEvent(hotkey, event)) return false;
  const mods = hotkey.modifiers ?? [];
  const { ctrl, meta } = resolveModKey(mods);
  return (
    event.ctrlKey === ctrl &&
    event.metaKey === meta &&
    event.altKey === mods.includes('Alt') &&
    event.shiftKey === mods.includes('Shift')
  );
};

const resolveModKey = (
  mods: NonNullable<Hotkey['modifiers']>,
): { ctrl: boolean; meta: boolean } => {
  const mac = isMac();
  return {
    ctrl: mods.includes('Ctrl') || (!mac && mods.includes('Mod')),
    meta: mods.includes('Meta') || (mac && mods.includes('Mod')),
  };
};

export const hotkeysEqual = (a: Hotkey, b: Hotkey): boolean => {
  if (a.key.toLowerCase() !== b.key.toLowerCase()) return false;
  const modsA = a.modifiers ?? [];
  const modsB = b.modifiers ?? [];
  const resolvedA = resolveModKey(modsA);
  const resolvedB = resolveModKey(modsB);
  return (
    resolvedA.ctrl === resolvedB.ctrl &&
    resolvedA.meta === resolvedB.meta &&
    modsA.includes(KEYBINDING_MODIFIERS.ALT) === modsB.includes(KEYBINDING_MODIFIERS.ALT) &&
    modsA.includes(KEYBINDING_MODIFIERS.SHIFT) === modsB.includes(KEYBINDING_MODIFIERS.SHIFT)
  );
};

const isInputTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable || tag === 'input' || tag === 'textarea';
};

interface MatchedKeybinding extends ResolvedKeybinding {
  hotkey: Hotkey;
}

const getHotkeyCommandData = (hotkey: Hotkey): unknown => hotkey.data ?? { key: hotkey.key };

export const useKeybindingsStore = defineStore<'keybindings', KeybindingsStore>(
  'keybindings',
  () => {
    const commandsStore = useCommandsStore();
    const configStore = useConfigStore();

    const contextStack = ref<KeybindingContextId[]>([
      KEYBINDING_CONTEXTS.GLOBAL,
      KEYBINDING_CONTEXTS.SHELL,
    ]);
    const contextRefCount = new Map<KeybindingContextId, number>();

    const userBindings = computed<Readonly<KeybindingsConfig>>(
      () => configStore.config.keybindings ?? {},
    );

    const keybindings = computed<ResolvedKeybinding[]>(() => {
      const bindings = userBindings.value;
      return commandsStore.commands.flatMap((cmd) => {
        if (!cmd.command) return [];
        const hotkeys = bindings[cmd.command] ?? cmd.defaultHotkeys ?? [];
        if (!hotkeys.length) return [];
        return [
          {
            command: cmd.command as string,
            hotkeys,
            context: cmd.keybindingContext ?? KEYBINDING_CONTEXTS.GLOBAL,
          },
        ];
      });
    });

    const pushContext = (contextId: KeybindingContextId): (() => void) => {
      const count = contextRefCount.get(contextId) ?? 0;
      contextRefCount.set(contextId, count + 1);
      if (count === 0) {
        contextStack.value = [...contextStack.value, contextId];
      }
      return () => popContext(contextId);
    };

    const popContext = (contextId: KeybindingContextId): void => {
      const count = contextRefCount.get(contextId) ?? 0;
      if (count <= 1) {
        contextRefCount.delete(contextId);
        contextStack.value = contextStack.value.filter((c) => c !== contextId);
        return;
      }
      contextRefCount.set(contextId, count - 1);
    };

    const setHotkeys = (command: string, hotkeys: Hotkey[]): void => {
      configStore.config.keybindings = {
        ...(configStore.config.keybindings ?? {}),
        [command]: hotkeys,
      };
      configStore.sync();
    };

    const clearHotkeys = (command: string): void => {
      const current = { ...(configStore.config.keybindings ?? {}) };
      delete current[command];
      configStore.config.keybindings = current;
      configStore.sync();
    };

    const getHotkeys = (command: string): Hotkey[] => {
      const stored = userBindings.value[command];
      if (stored !== undefined) return stored;
      return commandsStore.get(command)?.defaultHotkeys ?? [];
    };

    const findConflict = (
      hotkey: Hotkey,
      context: KeybindingContextId,
      excludeCommand?: string,
    ): string | undefined =>
      keybindings.value.find(
        (b) =>
          b.command !== excludeCommand &&
          b.context === context &&
          b.hotkeys.some((h) => hotkeysEqual(h, hotkey)),
      )?.command;

    const resolveHotkeyForElectron = (hotkey: Hotkey): ResolvedElectronHotkey => {
      const mods = hotkey.modifiers ?? [];
      const { ctrl, meta } = resolveModKey(mods);
      return {
        key: hotkey.key,
        control: ctrl,
        meta,
        alt: mods.includes('Alt'),
        shift: mods.includes('Shift'),
      };
    };

    const syncElectronHotkeys = (): void => {
      if (!hasWindow()) return;
      if (typeof window.electron?.setAppHotkeys !== 'function') return;
      const hotkeys = keybindings.value.flatMap((binding) =>
        binding.hotkeys.map(resolveHotkeyForElectron),
      );
      window.electron.setAppHotkeys(hotkeys);
    };

    if (hasWindow()) {
      const matchesContext = (
        contextId: KeybindingContextId,
        event: KeyboardEvent,
      ): MatchedKeybinding | undefined => {
        if (contextId === KEYBINDING_CONTEXTS.EDITOR) return;
        const binding = keybindings.value.find(
          (item) =>
            item.context === contextId &&
            item.hotkeys.some((hotkey) => hotkeyMatchesEvent(hotkey, event)),
        );
        const hotkey = binding?.hotkeys.find((item) => hotkeyMatchesEvent(item, event));
        if (!binding || !hotkey) return;
        return { ...binding, hotkey };
      };

      const canDispatch = (
        cmd: Command,
        contextId: KeybindingContextId,
        target: EventTarget | null,
      ) => {
        if (cmd.disabled?.(api)) return false;
        if (contextId === KEYBINDING_CONTEXTS.SHELL) return true;
        return !(contextId === KEYBINDING_CONTEXTS.GLOBAL && isInputTarget(target));
      };

      watch(keybindings, syncElectronHotkeys, { immediate: true });

      const handleKeydown = (event: KeyboardEvent): void => {
        if (event.isComposing) return;
        [...contextStack.value].reverse().some((contextId) => {
          const match = matchesContext(contextId, event);
          if (!match) return false;
          const cmd = commandsStore.get(match.command);
          if (!cmd || !canDispatch(cmd, contextId, event.target)) return false;
          event.preventDefault();
          void commandsStore.execute(match.command, getHotkeyCommandData(match.hotkey), {
            interactive: true,
          });
          return true;
        });
      };

      window.addEventListener('keydown', handleKeydown, { capture: true });
      onScopeDispose(() => window.removeEventListener('keydown', handleKeydown, { capture: true }));
    }

    return {
      keybindings,
      contextStack: readonly(contextStack),
      userBindings,
      pushContext,
      popContext,
      setHotkeys,
      clearHotkeys,
      getHotkeys,
      findConflict,
    };
  },
);
