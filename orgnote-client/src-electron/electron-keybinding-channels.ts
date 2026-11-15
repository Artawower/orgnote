export interface ResolvedElectronHotkey {
  key: string;
  control: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

export const ELECTRON_KEYBINDING_CHANNELS = {
  setAppHotkeys: 'keybindings:set-app-hotkeys',
} as const;
