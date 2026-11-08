import { defineBoot } from '@quasar/app-vite/wrappers';
import { initRepositories as _initRepositories } from 'src/infrastructure/repositories';
import {
  LOGS_REPOSITORY_PROVIDER_TOKEN,
  REPOSITORIES_PROVIDER_TOKEN,
} from 'src/constants/app-providers';
import type { Repositories } from 'orgnote-api';
import { bootTimer } from 'src/boot/perf-timer';

let repositories: Repositories;

const initRepositories = async (): Promise<Repositories> => {
  repositories = await _initRepositories();
  return repositories;
};

export default defineBoot(async ({ app }) => {
  await bootTimer.measure('repositories-init', initRepositories);
  app.provide(REPOSITORIES_PROVIDER_TOKEN, repositories);
  app.provide(LOGS_REPOSITORY_PROVIDER_TOKEN, repositories.logRepository);
});

export { repositories };
