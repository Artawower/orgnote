import type { FileSystemChange, OrgNoteConfig, SyncPlan } from 'orgnote-api';
import { logger } from 'src/boot/logger';
import { ORGNOTE_CONFIG_FILE_PATH } from 'src/constants/system-file-paths';

const LOG_MESSAGE = 'Config lifecycle';
const SESSION_ID_LENGTH = 8;
const SESSION_ID_RADIX = 36;

const HIGH_FREQUENCY_EVENTS = new Set([
  'memory-config-changed',
  'config-storage-context-changed',
  'memory-config-write-requested',
]);

type LifecycleScalar = string | number | boolean | null;
type LifecycleDetails = Readonly<Record<string, LifecycleScalar | undefined>>;
type ConfigFileChangeSource = 'explicit' | 'native' | 'poll';

let sequence = 0;

const createSessionId = (): string =>
  `${Date.now().toString(SESSION_ID_RADIX)}-${Math.random()
    .toString(SESSION_ID_RADIX)
    .slice(2, SESSION_ID_LENGTH + 2)}`;

const sessionId = createSessionId();

const normalizePath = (path: string): string => `/${path.split('/').filter(Boolean).join('/')}`;
const CONFIG_FILE_PATH = normalizePath(ORGNOTE_CONFIG_FILE_PATH);
const isConfigPath = (path: string): boolean => normalizePath(path) === CONFIG_FILE_PATH;

const classifyApiEndpoint = (apiUrl: string): string => {
  if (!apiUrl) return 'missing';
  if (apiUrl.startsWith('/')) return 'relative';

  const normalizedUrl = apiUrl.toLowerCase();
  if (normalizedUrl.includes('localhost') || normalizedUrl.includes('127.0.0.1')) {
    return 'localhost';
  }
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return 'remote';
  }
  return 'custom';
};

const getConfigSnapshot = (config?: OrgNoteConfig): LifecycleDetails => {
  if (!config) return {};
  return {
    apiEndpointKind: classifyApiEndpoint(config.network.apiUrl ?? ''),
    syncType: config.synchronization.type,
  };
};

const shouldSuppressEvent = (event: string, config?: OrgNoteConfig): boolean =>
  HIGH_FREQUENCY_EVENTS.has(event) && !config?.developer?.developerMode;

export const recordConfigLifecycleEvent = (
  event: string,
  config?: OrgNoteConfig,
  details: LifecycleDetails = {},
): void => {
  if (shouldSuppressEvent(event, config)) return;
  sequence += 1;
  logger?.info(LOG_MESSAGE, {
    ...details,
    ...getConfigSnapshot(config),
    event,
    sequence,
    sessionId,
  });
};

export const recordConfigFileChangeEvent = (
  source: ConfigFileChangeSource,
  change: FileSystemChange,
): void => {
  if (!isConfigPath(change.path) && !isConfigPath(change.previousPath ?? '')) return;
  recordConfigLifecycleEvent('config-file-change', undefined, {
    changeType: change.type,
    hasMtime: typeof change.mtime === 'number',
    source,
  });
};

const findConfigPlanOperation = (plan: SyncPlan): LifecycleDetails | null => {
  const upload = plan.toUpload.find(({ path }) => isConfigPath(path));
  if (upload) return { operation: 'upload', size: upload.size };

  const download = plan.toDownload.find(({ path }) => isConfigPath(path));
  if (download) return { operation: 'download', remoteVersion: download.version };

  if (plan.toDeleteLocal.some(isConfigPath)) return { operation: 'delete-local' };
  if (plan.toDeleteRemote.some(isConfigPath)) return { operation: 'delete-remote' };
  return null;
};

export const recordConfigPlanEvent = (plan: SyncPlan): void => {
  const operation = findConfigPlanOperation(plan);
  if (!operation) return;
  recordConfigLifecycleEvent('config-sync-plan', undefined, operation);
};

export const recordConfigSyncOperationEvent = (
  event: string,
  path: string,
  operation: string,
  details: LifecycleDetails = {},
): void => {
  if (!isConfigPath(path)) return;
  recordConfigLifecycleEvent(event, undefined, { ...details, operation });
};
