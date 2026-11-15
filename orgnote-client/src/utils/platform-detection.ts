import type { PlatformDetection, PlatformHandler, PlatformType } from 'orgnote-api';
import { Platform } from 'quasar';

const PLATFORMS_BY_PRIORITY: PlatformType[] = [
  'iphone',
  'ipad',
  'ipod',
  'ios',
  'android',
  'blackberry',
  'winphone',
  'nativeMobile',
  'capacitor',
  'cordova',
  'electron',
  'bex',
  'pwa',
  'mobile',
  'linux',
  'mac',
  'win',
  'desktop',
  'chrome',
  'firefox',
  'safari',
  'opera',
  'webkit',
  'ssr',
];

const getPlatformValue = (key: PlatformType): boolean => {
  if (key === 'ssr') {
    return !!process.env.SERVER;
  }
  if (key === 'pwa') {
    return !!process.env.CLIENT && 'serviceWorker' in navigator;
  }
  return !!Platform.is?.[key as keyof typeof Platform.is];
};

const createPlatformIs = (): Record<PlatformType, boolean> => {
  const result = {} as Record<PlatformType, boolean>;
  for (const key of PLATFORMS_BY_PRIORITY) {
    result[key] = getPlatformValue(key);
  }
  return result;
};

export const platform: PlatformDetection = {
  get is() {
    return createPlatformIs();
  },
  get current() {
    return PLATFORMS_BY_PRIORITY.filter(getPlatformValue);
  },
};

export const platformMatch = async <T>(handlers: PlatformHandler<T>): Promise<T> => {
  for (const key of PLATFORMS_BY_PRIORITY) {
    const handler = handlers[key];
    if (handler && platform.is[key]) {
      return handler();
    }
  }
  return handlers.default();
};
