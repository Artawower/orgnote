import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands, KEYBINDING_CONTEXTS } from 'orgnote-api';
import { useFileSearchStore } from 'src/stores/file-search';
import { useNoteSearchCompletion } from 'src/composables/note-search-completion';

export const getSearchCommands = (): Command[] => [
  {
    command: DefaultCommands.INIT_SEARCH_INDEX,
    group: 'system',
    system: true,
    handler: async () => {
      const fileSearch = useFileSearchStore();
      await fileSearch.loadIndex();
      await fileSearch.indexFiles();
    },
  },
  {
    command: DefaultCommands.SEARCH,
    group: 'search',
    icon: 'sym_o_search',
    interactive: true,
    keybindingContext: KEYBINDING_CONTEXTS.SHELL,
    defaultHotkeys: [{ key: 'f', modifiers: ['Mod', 'Shift'] }],
    handler: async (api: OrgNoteApi, params: CommandHandlerParams<{ searchText?: string }>) => {
      await useNoteSearchCompletion(api, params.data?.searchText);
    },
  },
  {
    command: DefaultCommands.OPEN_FILE_SEARCH,
    group: 'search',
    icon: 'sym_o_search',
    interactive: true,
    keybindingContext: KEYBINDING_CONTEXTS.SHELL,
    defaultHotkeys: [{ key: 'o', modifiers: ['Mod'] }],
    handler: async (api: OrgNoteApi) => {
      await useNoteSearchCompletion(api);
    },
  },
];
