import type { Ref } from 'vue';
import type { StoreDefinition } from './store';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeStore {
  isDark: Ref<boolean>;
  isDynamicMode: Ref<boolean>;
  effectiveMode: Ref<'light' | 'dark'>;
  activeThemeName: Ref<string | null>;

  sync: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  toggleDynamicMode: () => Promise<void>;
  setTheme: (themeName: string | null) => Promise<void>;
  resetTheme: () => Promise<void>;
}

export type ThemeStoreDefinition = StoreDefinition<ThemeStore>;
