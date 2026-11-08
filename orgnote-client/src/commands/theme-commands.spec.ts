import { test, expect, vi, beforeEach, type Mock } from 'vitest';
import { getThemeCommands } from './theme-commands';
import { DefaultCommands } from 'orgnote-api';
import type { CompletionCandidate, ExtensionMeta } from 'orgnote-api';
import { api } from 'src/boot/api';
import { toValue } from 'vue';

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useExtensions: vi.fn(),
      useCompletion: vi.fn(),
    },
    ui: {
      useTheme: vi.fn(),
    },
  },
}));

vi.mock('src/boot/i18n', () => ({
  i18n: {
    global: {
      t: (key: string) => key,
    },
  },
}));

vi.mock('src/utils/search-filter', () => ({
  searchFilter: () => true,
}));

const mockExtensionsStore = {
  extensions: [
    {
      manifest: {
        name: 'theme-mock-1',
        description: 'Mock Theme 1',
        category: 'theme',
      },
    },
    {
      manifest: {
        name: 'theme-mock-2',
        description: 'Mock Theme 2',
        category: 'theme',
      },
    },
    {
      manifest: {
        name: 'not-a-theme',
        category: 'plugin',
      },
    },
  ],
  enableExtension: vi.fn(),
};

const mockThemeStore = {
  activeThemeName: 'theme-mock-1',
  resetTheme: vi.fn(),
  isDynamicMode: false,
  isDark: false,
  setMode: vi.fn(),
};

const mockCompletion = {
  open: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (api.core.useExtensions as unknown as Mock).mockReturnValue(mockExtensionsStore);
  (api.ui.useTheme as unknown as Mock).mockReturnValue(mockThemeStore);
  (api.core.useCompletion as unknown as Mock).mockReturnValue(mockCompletion);
});

test('theme-commands SELECT_THEME command filters themes correctly and sets reactive icons', () => {
  const commands = getThemeCommands();
  const selectThemeCommand = commands.find(
    (c) => c.command === DefaultCommands.SELECT_THEME
  );

  expect(selectThemeCommand).toBeDefined();

  selectThemeCommand?.handler?.(api, { data: {}, meta: {} });

  expect(mockCompletion.open).toHaveBeenCalled();

  const openCallArgs = mockCompletion.open.mock.calls[0]?.[0];
  expect(openCallArgs).toBeDefined();

  const itemsGetter = openCallArgs.itemsGetter;
  expect(itemsGetter).toBeDefined();

  const { result } = itemsGetter('');

  expect(result).toHaveLength(2);

  const candidate1 = result.find(
    (c: CompletionCandidate<ExtensionMeta>) => toValue(c.title) === 'theme-mock-1'
  );
  const candidate2 = result.find(
    (c: CompletionCandidate<ExtensionMeta>) => toValue(c.title) === 'theme-mock-2'
  );

  expect(toValue(candidate1?.icon)).toBe('check');
  expect(toValue(candidate2?.icon)).toBe('sym_o_palette');
});

test('theme-commands SELECT_THEME command updates icons when active theme changes', () => {
  const commands = getThemeCommands();
  const selectThemeCommand = commands.find(
    (c) => c.command === DefaultCommands.SELECT_THEME
  );

  selectThemeCommand?.handler?.(api, { data: {}, meta: {} });
  const openCallArgs = mockCompletion.open.mock.calls[0]?.[0];
  const itemsGetter = openCallArgs?.itemsGetter;

  const { result } = itemsGetter('');

  const candidate1 = result.find(
    (c: CompletionCandidate<ExtensionMeta>) => toValue(c.title) === 'theme-mock-1'
  );
  const candidate2 = result.find(
    (c: CompletionCandidate<ExtensionMeta>) => toValue(c.title) === 'theme-mock-2'
  );

  expect(toValue(candidate1?.icon)).toBe('check');
  expect(toValue(candidate2?.icon)).toBe('sym_o_palette');

  mockThemeStore.activeThemeName = 'theme-mock-2';

  expect(toValue(candidate1?.icon)).toBe('sym_o_palette');
  expect(toValue(candidate2?.icon)).toBe('check');
});

test('theme-commands SELECT_THEME_MODE command sets reactive icons for theme modes', () => {
  const commands = getThemeCommands();
  const selectModeCommand = commands.find(
    (c) => c.command === DefaultCommands.SELECT_THEME_MODE
  );

  expect(selectModeCommand).toBeDefined();

  selectModeCommand?.handler?.(api, { data: {}, meta: {} });

  expect(mockCompletion.open).toHaveBeenCalled();
  const openCallArgs = mockCompletion.open.mock.calls[0]?.[0];
  const itemsGetter = openCallArgs?.itemsGetter;
  const { result } = itemsGetter();

  expect(result).toHaveLength(3);

  const lightMode = result.find(
    (c: CompletionCandidate<{ id: string }>) => c.data.id === 'light'
  );
  const darkMode = result.find(
    (c: CompletionCandidate<{ id: string }>) => c.data.id === 'dark'
  );
  const autoMode = result.find(
    (c: CompletionCandidate<{ id: string }>) => c.data.id === 'auto'
  );

  expect(toValue(lightMode?.icon)).toBe('sym_o_check');
  expect(toValue(darkMode?.icon)).toBe('sym_o_dark_mode');
  expect(toValue(autoMode?.icon)).toBe('sym_o_routine');
});

test('theme-commands SELECT_THEME_MODE command updates icons when mode changes', () => {
  const commands = getThemeCommands();
  const selectModeCommand = commands.find(
    (c) => c.command === DefaultCommands.SELECT_THEME_MODE
  );

  selectModeCommand?.handler?.(api, { data: {}, meta: {} });
  const openCallArgs = mockCompletion.open.mock.calls[0]?.[0];
  const itemsGetter = openCallArgs?.itemsGetter;

  const { result } = itemsGetter();

  const lightMode = result.find(
    (c: CompletionCandidate<{ id: string }>) => c.data.id === 'light'
  );
  const darkMode = result.find(
    (c: CompletionCandidate<{ id: string }>) => c.data.id === 'dark'
  );
  const autoMode = result.find(
    (c: CompletionCandidate<{ id: string }>) => c.data.id === 'auto'
  );

  mockThemeStore.isDark = true;
  mockThemeStore.isDynamicMode = false;

  expect(toValue(lightMode?.icon)).toBe('sym_o_light_mode');
  expect(toValue(darkMode?.icon)).toBe('sym_o_check');
  expect(toValue(autoMode?.icon)).toBe('sym_o_routine');

  mockThemeStore.isDynamicMode = true;

  expect(toValue(lightMode?.icon)).toBe('sym_o_light_mode');
  expect(toValue(darkMode?.icon)).toBe('sym_o_dark_mode');
  expect(toValue(autoMode?.icon)).toBe('sym_o_check');
});
