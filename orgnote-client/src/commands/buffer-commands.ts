import { DefaultCommands, TABS_COMMAND_GROUP, type Command } from 'orgnote-api';

const getBufferUri = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return;
  const uri = (data as Record<string, unknown>).uri;
  return typeof uri === 'string' && uri.trim() ? uri : undefined;
};

export const getBufferCommands = (): Command[] => [
  {
    command: DefaultCommands.SHOW_OR_OPEN_BUFFER,
    group: TABS_COMMAND_GROUP,
    hide: () => true,
    system: true,
    handler: async (api, params) => {
      const uri = getBufferUri(params.data);
      if (!uri) return;
      await api.core.useBufferViewer().showOrOpen(uri);
    },
  },
];
