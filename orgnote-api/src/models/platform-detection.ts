export type PlatformType =
  | 'mobile'
  | 'desktop'
  | 'capacitor'
  | 'nativeMobile'
  | 'electron'
  | 'linux'
  | 'mac'
  | 'win'
  | 'chrome'
  | 'firefox'
  | 'opera'
  | 'safari'
  | 'webkit'
  | 'ios'
  | 'ipad'
  | 'iphone'
  | 'ipod'
  | 'winphone'
  | 'blackberry'
  | 'android'
  | 'cordova'
  | 'pwa'
  | 'ssr'
  | 'bex';

export interface PlatformDetection {
  is: Record<PlatformType, boolean>;
  current: PlatformType[];
}

export type PlatformHandler<T> = {
  [K in PlatformType]?: () => T | Promise<T>;
} & {
  default: () => T | Promise<T>;
};

export type PlatformMatch = <T>(handlers: PlatformHandler<T>) => Promise<T>;
