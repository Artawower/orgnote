import type { Ref } from 'vue';
import { StoreDefinition } from './store';
import { CommandName } from './command';

export interface SettingsUiStore {
  settingsMenu: Ref<Record<string, CommandName[]>>;
}

export type SettingsUiStoreDefinition = StoreDefinition<SettingsUiStore>;
