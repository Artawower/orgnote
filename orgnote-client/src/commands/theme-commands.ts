import type { Command, ExtensionMeta, ThemeMode } from 'orgnote-api';
import { DefaultCommands, I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import { searchFilter } from 'src/utils/search-filter';
import { i18n } from 'src/boot/i18n';

const { t } = i18n.global;

const getThemeExtensions = (): ExtensionMeta[] => {
  const extensionsStore = api.core.useExtensions();
  const extensions = extensionsStore.extensions;
  return extensions.filter((ext) => ext.manifest.category?.toLowerCase() === 'theme');
};

const createSelectThemeCommand = (): Command => ({
  command: DefaultCommands.SELECT_THEME,
  group: 'settings',
  icon: 'sym_o_palette',
  description: 'use one of the downloaded themes',
  handler: () => {
    const completion = api.core.useCompletion();
    const themeStore = api.ui.useTheme();
    const extensionsStore = api.core.useExtensions();

    completion.open<ExtensionMeta>({
      placeholder: 'search themes',
      type: 'choice',
      itemsGetter: (filter: string) => {
        const themes = getThemeExtensions();
        const filteredThemes = themes.filter((t) =>
          searchFilter(filter, t.manifest.name, t.manifest.description, t.manifest.category),
        );

        const candidates = filteredThemes.map((t) => ({
          icon: () =>
            t.manifest.name === themeStore.activeThemeName ? 'check' : 'sym_o_palette',
          title: t.manifest.name,
          description: t.manifest.description ?? '',
          data: t,
          commandHandler: () => extensionsStore.enableExtension(t.manifest.name),
        }));

        return {
          total: filteredThemes.length,
          result: candidates,
        };
      },
    });
  },
});

const createResetThemeCommand = (): Command => ({
  command: DefaultCommands.RESET_THEME,
  group: 'settings',
  icon: 'sym_o_palette',
  handler: () => {
    const themeStore = api.ui.useTheme();
    themeStore.resetTheme();
  },
});

interface ThemeModeOption {
  id: ThemeMode;
  icon: string;
  titleKey: I18N;
  descriptionKey: I18N;
}

const themeModes: ThemeModeOption[] = [
  {
    id: 'light',
    icon: 'sym_o_light_mode',
    titleKey: I18N.THEME_MODE_LIGHT,
    descriptionKey: I18N.THEME_MODE_LIGHT_DESCRIPTION,
  },
  {
    id: 'dark',
    icon: 'sym_o_dark_mode',
    titleKey: I18N.THEME_MODE_DARK,
    descriptionKey: I18N.THEME_MODE_DARK_DESCRIPTION,
  },
  {
    id: 'auto',
    icon: 'sym_o_routine',
    titleKey: I18N.THEME_MODE_AUTO,
    descriptionKey: I18N.THEME_MODE_AUTO_DESCRIPTION,
  },
];

const isActiveMode = (modeId: ThemeMode, isDynamicMode: boolean, isDark: boolean): boolean => {
  if (modeId === 'auto') {
    return isDynamicMode;
  }
  return !isDynamicMode && (modeId === 'dark') === isDark;
};

const createSelectThemeModeCommand = (): Command => ({
  command: DefaultCommands.SELECT_THEME_MODE,
  group: 'settings',
  icon: 'sym_o_contrast',
  description: 'choose light, dark or auto mode',
  handler: () => {
    const completion = api.core.useCompletion();
    const themeStore = api.ui.useTheme();

    completion.open<ThemeModeOption>({
      placeholder: t(I18N.SELECT_THEME_MODE_PLACEHOLDER),
      type: 'choice',
      itemsGetter: () => ({
        total: themeModes.length,
        result: themeModes.map((mode) => ({
          icon: () =>
            isActiveMode(mode.id, themeStore.isDynamicMode, themeStore.isDark)
              ? 'sym_o_check'
              : mode.icon,
          title: t(mode.titleKey),
          description: t(mode.descriptionKey),
          data: mode,
          commandHandler: () => themeStore.setMode(mode.id),
        })),
      }),
    });
  },
});

export function getThemeCommands(): Command[] {
  return [createSelectThemeCommand(), createResetThemeCommand(), createSelectThemeModeCommand()];
}
