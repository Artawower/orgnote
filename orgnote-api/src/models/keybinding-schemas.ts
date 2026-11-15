import { array, object, optional, picklist, record, string, unknown, InferOutput } from 'valibot';

export const KEYBINDING_MODIFIER_SCHEMA = picklist([
  'Mod',
  'Ctrl',
  'Alt',
  'Shift',
  'Meta',
] as const);

export const HOTKEY_SCHEMA = object({
  /* matched against KeyboardEvent.key (case-insensitive) */
  key: string(),
  modifiers: optional(array(KEYBINDING_MODIFIER_SCHEMA)),
  data: optional(unknown()),
});

/*
 * Flat map { commandName → Hotkey[] }.
 * Present entry wins over CommandMeta.defaultHotkeys; absent entry falls back to it.
 * Empty array explicitly disables all shortcuts for that command.
 */
export const KEYBINDINGS_CONFIG_SCHEMA = record(string(), array(HOTKEY_SCHEMA));

export type KeybindingModifier = InferOutput<typeof KEYBINDING_MODIFIER_SCHEMA>;

export const KEYBINDING_MODIFIERS = {
  MOD: 'Mod',
  CTRL: 'Ctrl',
  ALT: 'Alt',
  SHIFT: 'Shift',
  META: 'Meta',
} as const satisfies Record<string, KeybindingModifier>;
export type Hotkey = InferOutput<typeof HOTKEY_SCHEMA>;
export type KeybindingsConfig = InferOutput<typeof KEYBINDINGS_CONFIG_SCHEMA>;
