import { api } from 'src/boot/api';
import { i18n } from 'src/boot/i18n';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { playPomodoroBeep } from './pomodoro-sound';

const COMPLETION_NOTIFICATION_TIMEOUT_MS = 5000;

export const notifyPomodoroComplete = (isSoundEnabled: boolean): void => {
  api.core.useNotifications().notify({
    message: i18n.global.t(i18nKeys.orgAgendaPomodoroComplete),
    level: 'info',
    timeout: COMPLETION_NOTIFICATION_TIMEOUT_MS,
  });
  if (isSoundEnabled) playPomodoroBeep();
};
