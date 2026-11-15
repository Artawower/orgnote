import type { I18N, OrgNoteApi } from 'orgnote-api';
import { i18n } from 'src/boot/i18n';

const UPDATE_CHECK_NOTIFICATION_ID = 'manual-update-check';

interface UpdateCheckNotification {
  message: I18N;
  description?: I18N;
  persistent?: boolean;
  onClick?: () => void;
}

export const clearUpdateCheckNotification = (api: OrgNoteApi): void => {
  api.core.useNotifications().delete(UPDATE_CHECK_NOTIFICATION_ID);
};

export const showUpdateCheckNotification = (
  api: OrgNoteApi,
  config: UpdateCheckNotification,
): void => {
  const notifications = api.core.useNotifications();
  notifications.delete(UPDATE_CHECK_NOTIFICATION_ID);
  notifications.notify({
    id: UPDATE_CHECK_NOTIFICATION_ID,
    message: i18n.global.t(config.message),
    level: 'info',
    icon: 'sym_o_system_update',
    ...(config.description ? { description: i18n.global.t(config.description) } : {}),
    ...(config.persistent ? { timeout: 0 } : {}),
    ...(config.onClick ? { onClick: config.onClick } : {}),
  });
};
