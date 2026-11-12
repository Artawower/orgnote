import type { SettingsUiStore } from 'orgnote-api';
import { DefaultCommands } from 'orgnote-api';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsUiStore = defineStore('settings-ui', () => {
  const settingsMenu = ref({
    main: [
      DefaultCommands.AUTHENTICATION_SETTINGS,
      DefaultCommands.SYSTEM_SETTINGS,
      DefaultCommands.STORAGE_SETTINGS,
      DefaultCommands.LANGUAGE_SETTINGS,
      DefaultCommands.INTERFACE_SETTINGS,
      DefaultCommands.OPEN_GRAPH_SETTINGS,
      DefaultCommands.SYNCHRONISATION_SETTINGS,
      DefaultCommands.SUBSCRIPTION_SETTINGS,
      DefaultCommands.KEYBINDINGS_SETTINGS,
    ],
    pro: [
      DefaultCommands.DEVELOPER_SETTINGS,
      DefaultCommands.EXTENSIONS_SETTINGS,
      DefaultCommands.ENCRYPTION_SETTINGS,
      // DefaultCommands.API_SETTINGS,
    ],
    links: [DefaultCommands.SOURCE_CODE, DefaultCommands.READ_WIKI, DefaultCommands.SPONSOR],
  });

  const store: SettingsUiStore = {
    settingsMenu,
  };

  return store;
});
