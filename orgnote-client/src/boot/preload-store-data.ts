import { defineBoot } from '@quasar/app-vite/wrappers';
import { repositories } from './repositories';
import { MAX_LOGS, useLogStore } from 'src/stores/log';
import { connectLogRepository, initializeLogStore } from 'src/stores/log-dispatcher';
import { to } from 'orgnote-api/utils';
import { bootTimer } from 'src/boot/perf-timer';

export default defineBoot(async ({ store }) => {
  const logRepository = repositories?.logRepository;
  if (!logRepository || !process.env.CLIENT) return;

  await bootTimer.measure('preload-logs', async () => {
    const logStore = useLogStore(store);
    const safeQueryLogs = to(() => logRepository.query({ limit: MAX_LOGS }));
    const records = await safeQueryLogs();

    if (records.isErr()) {
      console.error('Failed to initialize log store:', records.error);
      initializeLogStore(logStore, []);
      connectLogRepository(logRepository);
      return;
    }

    initializeLogStore(logStore, records.value);
    connectLogRepository(logRepository);
  });
});
