import type { Hotkey, KeybindingModifier } from 'orgnote-api';

/** KeyboardEvent.key values that represent modifier-only presses (no printable character). */
export const MODIFIER_KEY_NAMES = new Set(['Control', 'Shift', 'Alt', 'Meta']);

export const isMac = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const MAC_MODIFIER_SYMBOLS: Record<KeybindingModifier, string> = {
  Mod: '⌘',
  Ctrl: '⌃',
  Alt: '⌥',
  Shift: '⇧',
  Meta: '⌘',
};

const OTHER_MODIFIER_LABELS: Record<KeybindingModifier, string> = {
  Mod: 'Ctrl',
  Ctrl: 'Ctrl',
  Alt: 'Alt',
  Shift: 'Shift',
  Meta: 'Meta',
};

const SPECIAL_KEY_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: '↵',
  Escape: 'Esc',
  Backspace: '⌫',
  Delete: 'Del',
  Tab: 'Tab',
  Space: 'Space',
  ' ': 'Space',
};

export const formatModifier = (mod: KeybindingModifier): string =>
  isMac() ? MAC_MODIFIER_SYMBOLS[mod] : OTHER_MODIFIER_LABELS[mod];

export const formatKey = (key: string): string => SPECIAL_KEY_LABELS[key] ?? key.toUpperCase();

export const formatHotkey = (hotkey: Hotkey): string => {
  const parts = (hotkey.modifiers ?? []).map(formatModifier);
  parts.push(formatKey(hotkey.key));
  return isMac() ? parts.join('') : parts.join('+');
};

export const buildModifiersFromEvent = (e: KeyboardEvent): KeybindingModifier[] => {
  const mac = isMac();
  const mods: KeybindingModifier[] = [];
  if (mac ? e.metaKey : e.ctrlKey) mods.push('Mod');
  if (mac && e.ctrlKey) mods.push('Ctrl');
  if (!mac && e.metaKey) mods.push('Meta');
  if (e.shiftKey) mods.push('Shift');
  if (e.altKey) mods.push('Alt');
  return mods;
};
