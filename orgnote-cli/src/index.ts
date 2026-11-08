
import { getLogger } from './logger.js';
import { OrgNotePublishedConfig, getConfig } from './config.js';
import { CliCommand, handleCommand } from './commands/command-handlers.js';
import { initStore } from './store/store.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { resolveHome } from './tools/with-home-dir.js';
import { prettifyHttpError } from './tools/prettify-http-error';
import { AxiosError } from 'axios';
import { CliArguments, run } from './cli';
import { to } from 'orgnote-api/utils';

run(commandHandler);

async function commandHandler(
  command: string,
  options: CliArguments
): Promise<void> {
  if (!command) {
    getLogger().error('No command provided');
    return;
  }

  if (command === CliCommand.ValidateConfig) {
    await handleCommand(CliCommand.ValidateConfig, null, '');
    return;
  }

  const config = await getConfig(
    {
      debug: options.debug,
      rootFolder: options.rootFolder,
    },
    options.account
  );

  if (!config) {
    return;
  }

  const logger = getLogger(config);

  const { clear } = initStore(config.name);
  if (options.force) {
    logger.warn('Force sync enabled. All cache will be cleared.');
    clear();
  }

  logger.debug('Current configuration: \n%o', getPrettyConfig(config));

  createLogFile(config);

  const result = await to(() =>
    handleCommand(command as CliCommand, config, config.rootFolder)
  )();

  if (result.isErr()) {
    const e = result.error;
    if (e instanceof AxiosError) {
      logger.error(`[index.ts] Unexpected error: ${prettifyHttpError(e)}`);
    } else {
      logger.error(`[index.ts] Unexpected error: %o`, e);
    }
    if (config.logPath) {
      writeFileSync(config.logPath, String(e));
    }
  }
}

function getPrettyConfig(
  config: OrgNotePublishedConfig
): Partial<OrgNotePublishedConfig> {
  return {
    ...config,
    token: config.token ? '********' : 'NO TOKEN PROVIDED',
  };
}

function createLogFile(config: OrgNotePublishedConfig): void {
  const logger = getLogger(config);
  if (!config.logPath) {
    logger.debug(`No log file provided`);
    return;
  }
  const logPath = resolveHome(config.logPath);
  if (existsSync(logPath)) {
    return;
  }
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, '');
}
