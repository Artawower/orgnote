import type { Platform as QuasarPlatform } from 'quasar';

export type Platform = Exclude<
  keyof QuasarPlatform['is'],
  'name' | 'platform' | 'version' | 'versionNumber'
>;
