import {
  DefaultCommands,
  type Command,
  type CommandHandlerParams,
  type OrgNoteApi,
} from 'orgnote-api';
import { extractInternalId, isInternalLink, isRelativeFileLink } from 'src/utils/org-link';
import {
  useInternalLinkHandler,
  type OpenLinkTarget,
} from 'src/composables/use-internal-link-handler';
import { parseLinkMenuData, type LinkMenuData } from 'src/models/link-menu-data';

const getLinkMenuData = parseLinkMenuData;

const getCopiedLink = (data: LinkMenuData): string =>
  data.kind === 'org' ? data.target : data.url;

const copyLink = async (api: OrgNoteApi, params: CommandHandlerParams): Promise<void> => {
  const data = getLinkMenuData(params.data);
  if (!data) return;
  await api.utils.copyToClipboard(getCopiedLink(data));
};

const createOpenLinkHandler =
  (target: OpenLinkTarget) =>
  async (_api: OrgNoteApi, params: CommandHandlerParams): Promise<void> => {
    const data = getLinkMenuData(params.data);
    if (!data || data.kind !== 'org') return;

    const handler = useInternalLinkHandler();
    if (isInternalLink(data.target)) {
      await handler.handleClick(extractInternalId(data.target), data.title, target);
      return;
    }
    if (isRelativeFileLink(data.target)) {
      await handler.handleFileLink(data.target, target);
    }
  };

export const getLinkCommands = (): Command[] => [
  {
    command: DefaultCommands.COPY_LINK,
    icon: 'sym_o_content_copy',
    handler: copyLink,
  },
  {
    command: DefaultCommands.OPEN_LINK_IN_NEW_TAB,
    icon: 'sym_o_open_in_new',
    handler: createOpenLinkHandler('new-tab'),
  },
  {
    command: DefaultCommands.OPEN_LINK_IN_ADJACENT_PANE,
    icon: 'sym_o_splitscreen',
    handler: createOpenLinkHandler('adjacent-pane'),
  },
];
