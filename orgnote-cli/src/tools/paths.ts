import { join } from 'path';
import os from 'os';

const CONFIG_DIR = join('.config', 'orgnote');

export const getConfigDir = (): string => join(os.homedir(), CONFIG_DIR);

export const getStorePath = (accountName: string): string =>
  join(getConfigDir(), 'store', `${accountName}.json`);

export const getBaseContentDir = (accountName: string): string =>
  join(getConfigDir(), 'base-content', accountName);

export const getDefaultConfigPath = (): string =>
  join(getConfigDir(), 'config.toml');
