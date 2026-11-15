import { defineBoot } from '@quasar/app-vite/wrappers';
import { createSpectralLogger } from 'src/utils/logger';
import type { OrgNoteApi } from 'orgnote-api';

type Logger = OrgNoteApi['utils']['logger'];

let logger: Logger;

const initLogger = (): Logger => {
  logger = createSpectralLogger();
  logger.info('Application startup initiated');
  return logger;
};

export default defineBoot(() => {
  initLogger();
});
export { logger, initLogger };
