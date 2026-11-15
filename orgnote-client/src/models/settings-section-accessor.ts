export interface SectionAccessor {
  get: (key: string) => unknown;
  set: (key: string, val: unknown) => void;
}

export const SETTINGS_SECTION_INJECT_KEY = 'settingsSection';
