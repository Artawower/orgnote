import axios from 'axios';
import { toAbsolutePath, validateSyncFileResponse } from 'orgnote-api';
import { stringifyToml, to } from 'orgnote-api/utils';
import { sdk } from 'src/boot/axios';
import { reporter } from 'src/boot/report';
import { DEFAULT_CONFIG_CONTENT } from 'src/constants/config';
import { ORGNOTE_CONFIG_FILE_PATH } from 'src/constants/system-file-paths';
import { useConfigStore } from 'src/stores/config';
import { useFileSystemManagerStore } from 'src/stores/file-system-manager';
import { parseOrgNoteConfigToml } from 'src/utils/parse-orgnote-config-toml';
import { recordConfigLifecycleEvent } from 'src/infrastructure/config/config-lifecycle-record';

const absoluteConfigPath = toAbsolutePath(ORGNOTE_CONFIG_FILE_PATH);

const isRemoteConfigMissing = (error: unknown): boolean => {
  return axios.isAxiosError(error) && error.response?.status === 404;
};

const reportRemoteConfigFetchError = (error: Error): void => {
  if (isRemoteConfigMissing(error)) return;
  reporter.reportError(error);
};

const readLocalConfigContent = async (): Promise<string | undefined> => {
  const fs = useFileSystemManagerStore().currentFs;
  if (!fs) {
    return;
  }

  const readConfig = to(fs.readFile.bind(fs), 'Failed to read config.toml');
  const result = await readConfig(absoluteConfigPath, 'utf8');
  if (result.isErr()) {
    reporter.reportError(result.error);
    return;
  }

  return result.value || undefined;
};

const fetchRemoteConfigContent = async (): Promise<string | undefined> => {
  const result = await to(() =>
    sdk.sync.syncFilesGet(absoluteConfigPath, {
      responseType: 'arraybuffer',
    }),
  )();

  if (result.isErr()) {
    reportRemoteConfigFetchError(result.error);
    return;
  }

  const validated = await to(validateSyncFileResponse)(result.value, {
    path: absoluteConfigPath,
  });
  if (validated.isErr()) {
    reporter.reportError(validated.error);
    return;
  }

  return new TextDecoder().decode(validated.value);
};

const parseRemoteConfig = (content: string) => {
  const parseResult = parseOrgNoteConfigToml(content);
  if (parseResult.isErr()) {
    reporter.reportError(parseResult.error);
    return;
  }

  return parseResult.value;
};

const persistRemoteConfig = async (content: string): Promise<boolean> => {
  const fs = useFileSystemManagerStore().currentFs;
  if (!fs) {
    return false;
  }

  const writeConfig = to(fs.writeFile.bind(fs), 'Failed to write config.toml');
  const writeResult = await writeConfig(absoluteConfigPath, content);
  if (writeResult.isErr()) {
    reporter.reportError(writeResult.error);
    return false;
  }

  return true;
};

const updateConfigStore = (content: ReturnType<typeof parseRemoteConfig>): void => {
  if (!content) {
    return;
  }

  const configStore = useConfigStore();
  configStore.configErrors = [];
  Object.assign(configStore.config, content);
  recordConfigLifecycleEvent('bootstrap-remote-config-applied', configStore.config);
};

type ConfigStore = ReturnType<typeof useConfigStore>;

const isLocalConfigUnchanged = async (
  configStore: ConfigStore,
  expectedDiskContent: string,
  expectedStoreContent: string,
): Promise<boolean> => {
  if (stringifyToml(configStore.config) !== expectedStoreContent) return false;
  return (await readLocalConfigContent()) === expectedDiskContent;
};

const applyRemoteConfig = async (content: string): Promise<void> => {
  const parsedRemoteConfig = parseRemoteConfig(content);
  if (!parsedRemoteConfig) {
    return;
  }
  recordConfigLifecycleEvent('bootstrap-remote-config-received', parsedRemoteConfig);

  if (!(await persistRemoteConfig(content))) {
    return;
  }

  updateConfigStore(parsedRemoteConfig);
};

export const bootstrapRemoteConfig = async (): Promise<void> => {
  const configStore = useConfigStore();
  recordConfigLifecycleEvent('bootstrap-started', configStore.config);

  await configStore.sync();

  const localConfigContent = await readLocalConfigContent();
  const isGeneratedConfig = localConfigContent === DEFAULT_CONFIG_CONTENT;
  recordConfigLifecycleEvent('bootstrap-local-config-classified', configStore.config, {
    hasLocalConfig: typeof localConfigContent === 'string',
    isGeneratedConfig,
  });
  if (!isGeneratedConfig) return;
  const configStoreContent = stringifyToml(configStore.config);

  const remoteConfigContent = await fetchRemoteConfigContent();
  if (!remoteConfigContent) return;
  if (!(await isLocalConfigUnchanged(configStore, localConfigContent, configStoreContent))) return;

  await applyRemoteConfig(remoteConfigContent);
};
