import { afterEach, expect, test } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { getConfig } from './config';

const createTempConfigPath = (): string => {
  const tempDir = path.join(os.tmpdir(), `orgnote-cli-config-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  return path.join(tempDir, 'config.toml');
};

const cleanupConfigFile = (configPath: string): void => {
  const parentDir = path.dirname(configPath);
  rmSync(parentDir, { recursive: true, force: true });
};

afterEach(() => {
  delete process.env.ORGNOTE_CONFIG_PATH;
});

test('getConfig maps clientAddress from [[accounts]] profile', async () => {
  const configPath = createTempConfigPath();

  writeFileSync(
    configPath,
    `[[accounts]]
name = "local"
clientAddress = "https://localhost:3001"
remoteAddress = "http://localhost:8000/v1"
token = "fake-token"
rootFolder = "~/tmp/org-roam"
logPath = "~/tmp/logs/orgnote.log"
`,
    'utf8',
  );

  process.env.ORGNOTE_CONFIG_PATH = configPath;

  const config = await getConfig();

  expect(config?.clientAddress).toBe('https://localhost:3001');
  expect(config?.remoteAddress).toBe('http://localhost:8000/v1');

  cleanupConfigFile(configPath);
});

test('getConfig reads legacy [[root]] profile with clientAddress', async () => {
  const configPath = createTempConfigPath();

  writeFileSync(
    configPath,
    `[[root]]
name = "legacy"
clientAddress = "https://localhost:3001"
remoteAddress = "http://localhost:8000/v1"
token = "fake-token"
rootFolder = "~/tmp/org-roam"
logPath = "~/tmp/logs/orgnote.log"
`,
    'utf8',
  );

  process.env.ORGNOTE_CONFIG_PATH = configPath;

  const config = await getConfig();

  expect(config?.name).toBe('legacy');
  expect(config?.clientAddress).toBe('https://localhost:3001');

  cleanupConfigFile(configPath);
});
