import { defineBoot } from '@quasar/app-vite/wrappers';
import type { ErrorReporter } from 'src/utils/error-reporter';
import { createErrorReporter } from 'src/utils/error-reporter';
import { logger } from './logger';
import { useNotificationsStore } from 'src/stores/notifications';
import { useCommandsStore } from 'src/stores/command';
import { useConfigStore } from 'src/stores/config';
import { DEFAULT_MIN_NOTIFICATION_LEVEL } from 'src/constants/config';

let reporter: ErrorReporter;

const initReport = (): ErrorReporter => {
  const notifications = useNotificationsStore();
  const commands = useCommandsStore();
  const { config } = useConfigStore();
  reporter = createErrorReporter(
    logger,
    notifications,
    commands.execute,
    () => config.ui.minNotificationLevel ?? DEFAULT_MIN_NOTIFICATION_LEVEL,
  );
  return reporter;
};

export default defineBoot(() => {
  initReport();
});

export { reporter, initReport };
