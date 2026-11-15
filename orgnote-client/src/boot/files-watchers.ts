import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';
import { reporter } from './report';

const reportWatcherStartError = (error: unknown): void => {
  reporter.reportError(error instanceof Error ? error : new Error('file watcher start failed'));
};

export default defineBoot(() => {
  void api.core.useFileWatcher().start().catch(reportWatcherStartError);
});
