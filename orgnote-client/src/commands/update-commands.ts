import { DefaultCommands, I18N, type Command, type OrgNoteApi } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { version as currentClientVersion } from '../../package.json';
import { openExternalUrl } from 'src/utils/open-external-url';
import { showUpdateCheckNotification } from 'src/services/update-check-notifications';

const checkElectronUpdates = async (api: OrgNoteApi): Promise<void> => {
  const updates = window.electron?.updates;
  if (!updates) {
    showUpdateCheckNotification(api, { message: I18N.UPDATE_CHECK_FAILED });
    return;
  }

  const result = await to(updates.checkForUpdates)({ isBackground: false });
  if (result.isErr()) {
    showUpdateCheckNotification(api, { message: I18N.UPDATE_CHECK_FAILED });
  }
};

const checkMobileUpdates = async (api: OrgNoteApi): Promise<void> => {
  showUpdateCheckNotification(api, {
    message: I18N.CHECKING_FOR_UPDATES,
    persistent: true,
  });
  const update = await api.core.useClientUpdate().loadLatestChangelog({ forceRefresh: true });
  if (!update) {
    showUpdateCheckNotification(api, { message: I18N.UPDATE_CHECK_FAILED });
    return;
  }
  if (update.version === currentClientVersion) {
    showUpdateCheckNotification(api, { message: I18N.NO_UPDATES_AVAILABLE });
    return;
  }
  showUpdateCheckNotification(api, {
    message: I18N.UPDATE_AVAILABLE,
    description: I18N.OPEN_UPDATE_PAGE,
    persistent: true,
    onClick: () => openExternalUrl(update.url),
  });
};

const supportsManualUpdateCheck = (api: OrgNoteApi): boolean =>
  api.utils.platform.is.electron || api.utils.platform.is.nativeMobile;

const checkForUpdates = (api: OrgNoteApi): Promise<void> =>
  api.utils.platformMatch({
    electron: () => checkElectronUpdates(api),
    nativeMobile: () => checkMobileUpdates(api),
    default: () => {
      showUpdateCheckNotification(api, { message: I18N.UPDATE_CHECK_FAILED });
    },
  });

export const getUpdateCommands = (): Command[] => [
  {
    command: DefaultCommands.CHECK_FOR_UPDATES,
    group: 'global',
    icon: 'sym_o_system_update',
    interactive: true,
    hide: (api) => !supportsManualUpdateCheck(api),
    handler: checkForUpdates,
  },
];
