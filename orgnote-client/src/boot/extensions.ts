import { defineBoot } from '@quasar/app-vite/wrappers';
import { bootTimer } from 'src/boot/perf-timer';
import { api } from './api';
import { registerExtensionInstallerWorker } from 'src/extensions/extension-installer-client';

export default defineBoot(async () => {
  registerExtensionInstallerWorker();
  api.utils.logger.info('Syncing extensions and theme...');
  await bootTimer.measure('extensions-sync', () => api.core.useExtensions().sync());
  api.utils.logger.info('Extensions synced.');
  await bootTimer.measure('theme-sync', () => api.ui.useTheme().sync());
  api.utils.logger.info('Theme synced.');
});
