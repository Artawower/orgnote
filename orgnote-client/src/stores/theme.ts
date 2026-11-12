import { defineStore, storeToRefs } from 'pinia';
import type { ThemeStore, ThemeMode } from 'orgnote-api';
import { THEME_VARIABLES } from 'orgnote-api';
import { computed, watch } from 'vue';
import { useConfigStore } from './config';
import { useExtensionsStore } from './extension';
import { Dark } from 'quasar';
import { resetCSSVariables } from 'src/utils/css-utils';
import { useBackgroundSettings } from 'src/composables/background';
import { to } from 'orgnote-api/utils';

export const useThemeStore = defineStore<'theme', ThemeStore>('theme', () => {
  const { config } = storeToRefs(useConfigStore());
  const extensionsStore = useExtensionsStore();

  const isDark = computed(() => Dark.isActive);

  const isDynamicMode = computed(() => config.value.ui.theme === 'auto');

  const effectiveMode = computed<'light' | 'dark'>(() => (isDark.value ? 'dark' : 'light'));

  const activeThemeName = computed<string | null>(() => {
    return isDark.value ? config.value.ui.darkThemeName : config.value.ui.lightThemeName;
  });

  const syncQuasarDarkMode = (): void => {
    const mode = config.value.ui.theme;
    Dark.set(mode === 'auto' ? 'auto' : mode === 'dark');
  };

  const syncBackgroundSettings = async (): Promise<void> => {
    const backgroundSettings = useBackgroundSettings();
    await backgroundSettings.setBackground();
  };

  const setMode = async (mode: ThemeMode): Promise<void> => {
    config.value.ui.theme = mode;
  };

  const toggleMode = async (): Promise<void> => {
    const newMode = isDark.value ? 'light' : 'dark';
    await setMode(newMode);
  };

  const toggleDynamicMode = async (): Promise<void> => {
    const newMode = isDynamicMode.value ? effectiveMode.value : 'auto';
    await setMode(newMode);
  };

  const setThemeNameForCurrentMode = (themeName: string | null): void => {
    if (isDark.value) {
      config.value.ui.darkThemeName = themeName;
      return;
    }
    config.value.ui.lightThemeName = themeName;
  };

  const setTheme = async (themeName: string | null): Promise<void> => {
    if (!themeName) {
      resetCSSVariables([...THEME_VARIABLES]);
      setThemeNameForCurrentMode(null);
      return;
    }
    await extensionsStore.enableExtension(themeName);
  };

  const resetTheme = async (): Promise<void> => {
    await setTheme(null);
  };

  const sync = async (): Promise<void> => {
    syncQuasarDarkMode();
    await syncBackgroundSettings();
  };

  watch(
    () => config.value.ui.theme,
    async () => {
      syncQuasarDarkMode();
      await syncBackgroundSettings();
    },
  );

  const safeHandleThemeChange = to(
    async (newTheme: string | null, oldTheme: string | null | undefined) => {
      if (oldTheme && oldTheme !== newTheme) {
        await extensionsStore.disableExtension(oldTheme);
      }
      if (newTheme) {
        await extensionsStore.enableExtension(newTheme);
      }
      await syncBackgroundSettings();
    },
    'Failed to switch theme',
  );

  watch(activeThemeName, (newTheme, oldTheme) => {
    safeHandleThemeChange(newTheme, oldTheme);
  });

  const store: ThemeStore = {
    isDark,
    isDynamicMode,
    effectiveMode,
    activeThemeName,

    sync,
    setMode,
    toggleMode,
    toggleDynamicMode,
    setTheme,
    resetTheme,
  };

  return store;
});
