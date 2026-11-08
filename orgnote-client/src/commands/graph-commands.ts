import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands, I18N } from 'orgnote-api';
import type { GraphUiConfig } from 'orgnote-api';

export interface GraphSettingsCommandData {
  nodesCount: number;
  edgesCount: number;
  config: GraphUiConfig;
  refresh: () => void;
  configChange: (config: GraphUiConfig) => void;
}

export const getGraphCommands = (): Command[] => [
  {
    command: DefaultCommands.GRAPH_SETTINGS,
    title: I18N.GRAPH_SETTINGS_TITLE,
    group: I18N.GRAPH_SETTINGS_GROUP,
    icon: 'sym_o_tune',
    handler: async (api: OrgNoteApi, params: CommandHandlerParams<GraphSettingsCommandData>) => {
      if (!params?.data) {
        await api.core.useCommands().execute(DefaultCommands.OPEN_GRAPH_SETTINGS, undefined, {
          interactive: true,
        });
        return;
      }

      const modal = api.ui.useModal();
      const { default: GraphInfoModal } = await import('src/components/graph/GraphInfoModal.vue');
      modal.open(GraphInfoModal, {
        mini: true,
        position: 'bottom',
        modalProps: params.data,
      });
    },
  },
];
