import type { Command, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands, I18N, KEYBINDING_CONTEXTS, TABS_COMMAND_GROUP } from 'orgnote-api';
import { useTabCompletion } from '../composables/tab-completion';

const TAB_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const getTabNumber = (data: unknown): number | undefined => {
  if (!data || typeof data !== 'object') return;
  const record = data as Record<string, unknown>;
  if (typeof record.tabNumber === 'number') return record.tabNumber;
  if (typeof record.key === 'string' && /^\d$/.test(record.key)) return Number(record.key);
};

const selectActivePaneTabByNumber = (api: OrgNoteApi, data: unknown): void => {
  const tabNumber = getTabNumber(data);
  if (!tabNumber) return;
  const paneStore = api.core.usePane();
  const activePaneId = paneStore.activePaneId;
  const pane = activePaneId ? paneStore.panes[activePaneId]?.value : undefined;
  const tabId = pane ? Object.keys(pane.tabs.value)[tabNumber - 1] : undefined;
  if (!activePaneId || !tabId) return;
  paneStore.selectTab(activePaneId, tabId);
};

const createSelectTabByNumberCommand = (): Command => ({
  command: DefaultCommands.SELECT_TAB_BY_NUMBER,
  group: TABS_COMMAND_GROUP,
  icon: 'sym_o_tab',
  interactive: true,
  keybindingContext: KEYBINDING_CONTEXTS.SHELL,
  defaultHotkeys: TAB_NUMBERS.map((tabNumber) => ({
    key: String(tabNumber),
    modifiers: ['Mod'],
    data: { tabNumber },
  })),
  handler: (api: OrgNoteApi, params) => selectActivePaneTabByNumber(api, params.data),
});

export function getTabsCommands(): Command[] {
  const commands: Command[] = [
    {
      command: DefaultCommands.NEW_TAB,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_add_box',
      title: I18N.ADD_NEW_TAB,
      interactive: true,
      keybindingContext: KEYBINDING_CONTEXTS.SHELL,
      defaultHotkeys: [{ key: 't', modifiers: ['Mod'] }],
      handler: async (api: OrgNoteApi, params) => {
        const paneStore = api.core.usePane();
        const targetPaneId = params?.data?.paneId || paneStore.activePaneId;

        if (!targetPaneId) return;

        const tab = await paneStore.addTab(targetPaneId, params?.data);
        if (!tab) return;

        paneStore.selectTab(tab.paneId, tab.id);
        api.ui.useModal().close();
      },
    },
    {
      command: DefaultCommands.TABS,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_tabs',
      title: I18N.TABS,
      handler: useTabCompletion,
    },
    {
      command: DefaultCommands.SHOW_TAB_SWITCHER,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_tab_group',
      title: I18N.SHOW_TAB_SWITCHER,
      hide: (api: OrgNoteApi) => {
        return api.ui.useScreenDetection().desktopAbove.value;
      },
      handler: async (api: OrgNoteApi) => {
        const modal = api.ui.useModal();
        const { default: TabOverviewMobile } = await import(
          'src/containers/TabOverviewMobileModal.vue'
        );
        modal.open(TabOverviewMobile, {
          fullScreen: true,
          noBodyPadding: true,
        });
      },
    },
    {
      command: DefaultCommands.CLOSE_TAB,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_close',
      interactive: true,
      keybindingContext: KEYBINDING_CONTEXTS.SHELL,
      defaultHotkeys: [{ key: 'w', modifiers: ['Mod'] }],
      handler: (api: OrgNoteApi) => {
        const paneStore = api.core.usePane();
        const activePaneId = paneStore.activePaneId;
        const activeTabId = paneStore.activeTab?.id;
        if (!activePaneId || !activeTabId) return;
        paneStore.closeTab(activePaneId, activeTabId);
      },
    },
    createSelectTabByNumberCommand(),
  ];

  return commands;
}
