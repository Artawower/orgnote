import { I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import { copyToClipboard } from 'src/utils/clipboard';
import { to } from 'orgnote-api/utils';
import { useI18n } from 'vue-i18n';

export const useInteractiveClipboard = () => {
  const { t } = useI18n();
  const notifications = api.core.useNotifications();

  const safeCopyToClipboard = async (text: string): Promise<void> => {
    const result = await to(copyToClipboard)(text);

    result.match(
      () => notifications.notify({ message: t(I18N.COPIED_TO_CLIPBOARD), level: 'info' }),
      (error) =>
        notifications.notify({ message: t(I18N.COPY), description: error.message, level: 'danger' }),
    );
  };

  return { safeCopyToClipboard };
};
