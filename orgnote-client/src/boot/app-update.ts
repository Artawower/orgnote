import { defineBoot } from '@quasar/app-vite/wrappers';
import { DefaultCommands, I18N } from 'orgnote-api';
import { api } from './api';
import { CLIENT_UPDATE_NOTIFICATION_ID } from 'src/constants/client-update';
import { i18n } from './i18n';

const syncPendingUpdateNotification = (): void => {
  const clientUpdate = api.core.useClientUpdate();
  const notifications = api.core.useNotifications();
  const updateChangelog = clientUpdate.unreadUpdateChangelog;
  const existing = notifications.notifications.find(
    (notification) => notification.config.id === CLIENT_UPDATE_NOTIFICATION_ID,
  );

  if (!updateChangelog) {
    notifications.delete(CLIENT_UPDATE_NOTIFICATION_ID);
    return;
  }

  const message = i18n.global.t(I18N.UPDATED_TO_VERSION, {
    version: updateChangelog.version,
  });
  const description = i18n.global.t(I18N.LATEST_CHANGES_NOTIFICATION_DESCRIPTION);

  if (existing?.config.message === message && existing.config.description === description) {
    return;
  }

  if (existing) {
    notifications.delete(CLIENT_UPDATE_NOTIFICATION_ID);
  }

  notifications.notify({
    id: CLIENT_UPDATE_NOTIFICATION_ID,
    message,
    description,
    level: 'info',
    timeout: 0,
    stored: true,
    actionCommand: DefaultCommands.SHOW_LATEST_CHANGES,
  });
};

const detectClientUpdate = async (): Promise<void> => {
  await api.core.useClientUpdate().syncUpdateChangelog();
  syncPendingUpdateNotification();
};

export default defineBoot(async () => {
  await detectClientUpdate();
  api.utils.useAppResume(() => detectClientUpdate());
});
