import type { OrgRepeater } from 'org-mode-ast';
import type { extensionI18nKeys } from 'src/constants/extension-i18n-keys';

export interface RepeatPreset {
  key: string;
  labelKey: keyof typeof extensionI18nKeys;
  repeater?: OrgRepeater;
}
