import { createPinia, setActivePinia } from 'pinia';
import { useBackgroundSettings } from './background';
import { StatusBar } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
import type { Mock } from 'vitest';
import { vi, test, expect, beforeEach } from 'vitest';
import { getCssVar } from 'src/utils/css-utils';

let themeMeta: HTMLMetaElement;

vi.mock('@capacitor/status-bar', () => {
  return {
    StatusBar: {
      setBackgroundColor: vi.fn(),
      setStyle: vi.fn(),
    },
    Style: {
      Dark: 'DARK',
      Light: 'LIGHT',
    },
  };
});

vi.mock('@hugotomazi/capacitor-navigation-bar', () => ({
  NavigationBar: {
    setColor: vi.fn(),
  },
}));

vi.mock('quasar', () => ({
  Platform: {
    is: {
      nativeMobile: true,
      android: true,
      mobile: true,
      electron: false,
    },
  },
}));

vi.mock('./settings', () => ({
  useSettingsStore: vi.fn(() => ({
    config: {
      ui: {
        theme: 'dark',
      },
    },
  })),
}));

vi.mock('src/utils/css-utils', () => ({
  getCssVar: vi.fn((name) => (name === 'bg' ? '#FFFFFF' : null)),
}));

const createThemeMeta = (): HTMLMetaElement => {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  return meta;
};

const clearThemeMetas = (): void => {
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove());
};

beforeEach(() => {
  setActivePinia(createPinia());
  process.env.CLIENT = 'true';
  vi.clearAllMocks();
  clearThemeMetas();
  themeMeta = createThemeMeta();
  document.head.appendChild(themeMeta);
});

test('setStatusBarBackground sets the background color and style for dark theme', async () => {
  const bgSettings = useBackgroundSettings();
  await bgSettings.setStatusBarBackground('bg');
  expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: '#FFFFFF' });
});

test('StatusBar.setBackgroundColor is called in mock', async () => {
  StatusBar.setBackgroundColor({ color: '#123456' });
  expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: '#123456' });
});

test('setStatusBarBackground does nothing if color is not found', async () => {
  const mockedGetCssVar = getCssVar as Mock;
  mockedGetCssVar.mockReturnValueOnce(null);

  const bgSettings = useBackgroundSettings();

  await bgSettings.setStatusBarBackground('bg');

  expect(StatusBar.setBackgroundColor).not.toHaveBeenCalled();
  expect(StatusBar.setStyle).not.toHaveBeenCalled();
});

test('setBottomBarBackground sets the navigation bar color', async () => {
  const bgSettings = useBackgroundSettings();
  await bgSettings.setBottomBarBackground('bg');
  expect(NavigationBar.setColor).toHaveBeenCalledWith({ color: '#FFFFFF' });
});

test('setBottomBarBackground does nothing if color is not found', async () => {
  const mockedGetCssVar = getCssVar as Mock;
  mockedGetCssVar.mockReturnValueOnce(null);

  const bgSettings = useBackgroundSettings();

  await bgSettings.setBottomBarBackground('custom-color');

  expect(NavigationBar.setColor).not.toHaveBeenCalled();
});

test('setThemeColor updates existing meta tag with the correct color', () => {
  const bgSettings = useBackgroundSettings();
  bgSettings.setBackground('bg');

  expect(getCssVar).toHaveBeenCalledWith('bg');
  expect(themeMeta.getAttribute('content')).toBe('#FFFFFF');
});

test('setThemeColor creates a new meta tag if it does not exist', () => {
  document.head.querySelector('meta[name="theme-color"]')!.remove();

  const bgSettings = useBackgroundSettings();
  bgSettings.setBackground('bg');

  const newMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;

  expect(getCssVar).toHaveBeenCalledWith('bg');
  expect(newMeta).toBeTruthy();
  expect(newMeta.getAttribute('content')).toBe('#FFFFFF');
});

test('setThemeColor does nothing if color is not found', () => {
  const mockedGetCssVar = getCssVar as Mock;
  mockedGetCssVar.mockReturnValueOnce(null);

  const bgSettings = useBackgroundSettings();
  bgSettings.setBackground('bg');

  expect(document.querySelector('meta[name="theme-color"]')).toBeTruthy();
  expect(themeMeta.getAttribute('content')).toBeNull();
});

test('setBackground calls setMobileBackground for native mobile platform', async () => {
  const bgSettings = useBackgroundSettings();
  await bgSettings.setBackground('bg');

  expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: '#FFFFFF' });
  expect(NavigationBar.setColor).toHaveBeenCalledWith({ color: '#FFFFFF' });
});

test('setBackground uses default bg color when no color provided', async () => {
  const bgSettings = useBackgroundSettings();
  await bgSettings.setBackground();

  expect(getCssVar).toHaveBeenCalledWith('bg');
});
