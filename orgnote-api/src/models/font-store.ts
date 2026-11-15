import type { Ref } from 'vue';
import type { StoreDefinition } from './store';

export type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
export type FontStyle = 'normal' | 'italic' | 'oblique';
export type FontCategory = 'main' | 'editor' | 'headline' | 'code';

export interface FontDefinition {
  id: string;
  name: string;
  family: string;
  src?: string;
  filePath?: string;
  weight?: string | number;
  style?: FontStyle;
  display?: FontDisplay;
}

export interface FontCategoryConfig {
  main: string;
  editor: string;
  headline: string;
  code: string;
}

export interface FontStore {
  availableFonts: Ref<FontDefinition[]>;
  activeFonts: Ref<FontCategoryConfig>;

  registerFont: (font: FontDefinition) => void;
  unregisterFont: (fontId: string) => void;
  sync: () => Promise<void>;
}

export type FontStoreDefinition = StoreDefinition<FontStore>;
