import { existsSync, readFileSync } from 'fs';
import {
  SyncProfileConfigSchema,
  type SyncProfile,
  type SyncProfileConfig,
} from 'orgnote-api';
import { parseToml, to } from 'orgnote-api/utils';
import { resolveHome } from './tools/with-home-dir.js';
import { getLogger } from './logger.js';
import { getDefaultConfigPath } from './tools/paths.js';

const getAccountsFromConfig = (config: SyncProfileConfig): SyncProfile[] => {
  if (config.accounts && config.accounts.length > 0) {
    return config.accounts;
  }
  return config.root ?? [];
};

export interface OrgNotePublishedConfig {
  name: string;
  remoteAddress: string;
  clientAddress?: string;
  token: string;
  rootFolder: string;
  debug: boolean;
  ignorePatterns: string[];
  logPath: string;
  backupCount: number;
  backupDir: string;
}

export const getConfigPath = (): string =>
  process.env.ORGNOTE_CONFIG_PATH || getDefaultConfigPath();

const readConfigFile = (): SyncProfile[] | null => {
  const logger = getLogger();
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    logger.warn(`Config file not found: ${configPath}`);
    return null;
  }

  const result = to(() => {
    const content = readFileSync(configPath, 'utf8');
    const config = parseToml(content, SyncProfileConfigSchema);
    return getAccountsFromConfig(config);
  })();

  if (result.isErr()) {
    logger.error(`Failed to read config: %o`, result.error);
    return null;
  }

  return result.value;
};

const findAccount = (
  accounts: SyncProfile[],
  accountName?: string
): SyncProfile | null => {
  if (!accountName) {
    return accounts[0] ?? null;
  }
  return accounts.find((a) => a.name === accountName) ?? null;
};

const mapAccountToPublished = (
  account: SyncProfile
): OrgNotePublishedConfig => ({
  name: account.name,
  remoteAddress: account.remoteAddress,
  clientAddress: account.clientAddress || undefined,
  token: account.token,
  rootFolder: resolveHome(account.rootFolder),
  debug: account.debug,
  ignorePatterns: account.ignorePatterns ?? [],
  logPath: resolveHome(account.logPath),
  backupCount: account.backupCount,
  backupDir: resolveHome(account.backupDir),
});

const applyOverrides = (
  config: OrgNotePublishedConfig,
  override: Partial<OrgNotePublishedConfig>
): OrgNotePublishedConfig => ({
  ...config,
  ...Object.fromEntries(
    Object.entries(override).filter(([, v]) => v !== undefined)
  ),
});

export async function getConfig(
  override: Partial<OrgNotePublishedConfig> = {},
  accountName?: string
): Promise<OrgNotePublishedConfig | null> {
  const logger = getLogger(override);

  const accounts = readConfigFile();
  if (!accounts || accounts.length === 0) {
    logger.error('No accounts found in config file');
    return null;
  }

  const account = findAccount(accounts, accountName);
  if (!account) {
    logger.error(`Account "${accountName}" not found in config`);
    logger.info(
      `Available accounts: ${accounts.map((a) => a.name).join(', ')}`
    );
    return null;
  }

  const baseConfig = mapAccountToPublished(account);
  const configWithOverrides = applyOverrides(baseConfig, override);

  if (!configWithOverrides.token) {
    logger.error(
      'No token provided for account "%s"',
      configWithOverrides.name
    );
    return null;
  }

  if (!configWithOverrides.rootFolder) {
    logger.error(
      'No rootFolder provided for account "%s"',
      configWithOverrides.name
    );
    return null;
  }

  return configWithOverrides;
}

export interface ValidateConfigResult {
  valid: boolean;
  configPath: string;
  rawContent: string;
  accounts: string[];
  errors: string[];
}

export function validateConfigFile(): ValidateConfigResult {
  const configPath = getConfigPath();
  const result: ValidateConfigResult = {
    valid: false,
    configPath,
    rawContent: '',
    accounts: [],
    errors: [],
  };

  if (!existsSync(configPath)) {
    result.errors.push(`Config file not found: ${configPath}`);
    return result;
  }

  const readResult = to(() => readFileSync(configPath, 'utf8'))();
  if (readResult.isErr()) {
    result.errors.push(`Failed to read config file: ${readResult.error}`);
    return result;
  }
  result.rawContent = readResult.value;

  const parseResult = to(() => {
    const config = parseToml(result.rawContent, SyncProfileConfigSchema);
    const accounts = getAccountsFromConfig(config);

    if (accounts.length === 0) {
      throw new Error(
        'No accounts defined in config (use [[accounts]] or [[root]])'
      );
    }

    result.accounts = accounts.map((a) => a.name);

    accounts.forEach((account, index) => {
      if (!account.name) {
        result.errors.push(`Account #${index + 1}: missing "name" field`);
      }
      if (!account.token) {
        result.errors.push(
          `Account "${account.name || index + 1}": missing "token" field`
        );
      }
      if (!account.rootFolder) {
        result.errors.push(
          `Account "${account.name || index + 1}": missing "rootFolder" field`
        );
      }
    });

    result.valid = result.errors.length === 0;
  })();

  if (parseResult.isErr()) {
    const e = parseResult.error;
    if (e instanceof SyntaxError) {
      result.errors.push(`Invalid TOML syntax: ${e.message}`);
    } else if (e instanceof TypeError) {
      result.errors.push(`Invalid config format: ${e.message}`);
    } else {
      result.errors.push(`Validation error: ${e}`);
    }
  }

  return result;
}
