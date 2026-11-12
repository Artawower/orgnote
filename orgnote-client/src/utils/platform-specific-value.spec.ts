import { test, expect, vi } from 'vitest';
import { platformSpecificValue } from './platform-specific-value';
import { Platform } from 'quasar';

vi.mock('quasar', () => ({
  Platform: {
    is: {},
  },
}));

function createPlatformMock(overrides: Partial<Platform['is']> = {}): Platform['is'] {
  return {
    name: '',
    platform: '',
    version: undefined,
    versionNumber: undefined,
    mobile: false,
    desktop: false,
    cordova: false,
    capacitor: false,
    nativeMobile: false,
    nativeMobileWrapper: undefined,
    ios: false,
    ie: false,
    android: false,
    electron: false,
    bex: false,
    chrome: false,
    firefox: false,
    safari: false,
    edge: false,
    opera: false,
    vivaldi: false,
    edgeChromium: false,
    silk: false,
    linux: false,
    mac: false,
    win: false,
    cros: false,
    ipad: false,
    iphone: false,
    ipod: false,
    kindle: false,
    winphone: false,
    webkit: false,
    blackberry: false,
    playbook: false,
    ...overrides,
  };
}

test('returns server value when SERVER is true', () => {
  process.env.SERVER = 'true';
  const result = platformSpecificValue({ data: 'default', server: 'server' });
  expect(result).toBe('server');
  delete process.env.SERVER;
});

test('returns default data when SERVER is true but server data is not provided', () => {
  process.env.SERVER = 'true';
  const result = platformSpecificValue({ data: 'default' });
  expect(result).toBe('default');
  delete process.env.SERVER;
});

test('returns default data when CLIENT is false', () => {
  process.env.CLIENT = undefined;
  vi.spyOn(Platform, 'is', 'get').mockReturnValue(createPlatformMock());
  const result = platformSpecificValue({ data: 'default', server: 'server' });
  expect(result).toBe('default');
});

test('returns platform-specific value for desktop when Platform.is.desktop is true', () => {
  process.env.CLIENT = 'true';
  vi.spyOn(Platform, 'is', 'get').mockReturnValue(createPlatformMock({ desktop: true }));
  const result = platformSpecificValue({ data: 'default', desktop: 'desktop' });
  expect(result).toBe('desktop');
});

test('returns platform-specific value for nativeMobile when Platform.is.nativeMobile is true', () => {
  process.env.CLIENT = 'true';
  vi.spyOn(Platform, 'is', 'get').mockReturnValue(createPlatformMock({ nativeMobile: true }));
  const result = platformSpecificValue({ data: 'default', nativeMobile: 'nativeMobile' });
  expect(result).toBe('nativeMobile');
});

test('returns platform-specific value for electron when Platform.is.electron is true', () => {
  process.env.CLIENT = 'true';
  vi.spyOn(Platform, 'is', 'get').mockReturnValue(createPlatformMock({ electron: true }));
  const result = platformSpecificValue({ data: 'default', electron: 'electron' });
  expect(result).toBe('electron');
});

test('returns platform-specific value for mobile when Platform.is.mobile is true', () => {
  process.env.CLIENT = 'true';
  vi.spyOn(Platform, 'is', 'get').mockReturnValue(createPlatformMock({ mobile: true }));
  const result = platformSpecificValue({ data: 'default', mobile: 'mobile' });
  expect(result).toBe('mobile');
});

test('returns default data when no platform matches', () => {
  process.env.CLIENT = 'true';
  vi.spyOn(Platform, 'is', 'get').mockReturnValue(createPlatformMock());
  const result = platformSpecificValue({ data: 'default' });
  expect(result).toBe('default');
});

test('returns default data when datasource is empty', () => {
  process.env.CLIENT = 'true';
  vi.spyOn(Platform, 'is', 'get').mockReturnValue(createPlatformMock());
  const result = platformSpecificValue({});
  expect(result).toBeUndefined();
});

test('throws error when datasource is undefined', () => {
  expect(() => platformSpecificValue(undefined as never)).toThrow();
});
