import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';
import { DefaultCommands, type CronTaskConfig } from 'orgnote-api';

export default defineBoot(async () => {
  const cron = api.core.useCron();

  const cleanupHandler: CronTaskConfig['handler'] = async (api) => {
    api.core.useCommands().execute(DefaultCommands.CLEAR_OLD_QUEUE_TASKS);
    api.core.useBuffers().cleanup();
  };

  cron.register({
    id: 'cleanup',
    handler: cleanupHandler,
    interval: 15000,
    runImmediately: true,
  });

  cron.init();
});

export { api };
