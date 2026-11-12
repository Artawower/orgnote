import { api } from 'src/boot/api';
import { bootTimer } from 'src/boot/perf-timer';
import { bootstrapRemoteConfig } from './bootstrap-remote-config';

export const runPostActivationSync = async (): Promise<void> => {
  await bootTimer.measure('bootstrap-remote-config', bootstrapRemoteConfig);
  await bootTimer.measure('initial-sync', () => api.core.useSync().sync());
};
