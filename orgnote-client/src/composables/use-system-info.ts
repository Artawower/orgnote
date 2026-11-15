import type {
  SystemInfo,
  SystemInfoDefinition,
  ScreenInfo,
  DeviceInfo,
  EncryptionInfo,
  EnvironmentInfo,
  PlatformInfo,
  WebSocketInfo,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { version } from '../../package.json';
import { api } from 'src/boot/api';
import { getApiBaseUrl, getWebSocketUrl } from 'src/utils/server-endpoints';
import { hasWindow } from 'src/utils/platform-specific';
import { wsClient } from 'src/infrastructure/websocket-client';
import { useFileMetaStore } from 'src/stores/file-meta';

const isClientEnvironment = (): boolean => (process.env.CLIENT ?? '').toString() === 'true';
const hasNavigator = (): boolean => isClientEnvironment() && typeof navigator !== 'undefined';

const getNavigatorLanguage = (): string => {
  if (!hasNavigator()) {
    return '';
  }
  return navigator.language ?? '';
};

const getStandaloneStatus = (): boolean => {
  if (!hasWindow()) {
    return false;
  }
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(navigatorWithStandalone?.standalone);
};

const getScreenInfo = (): ScreenInfo => {
  if (!hasWindow() || typeof screen === 'undefined') {
    return { width: 0, height: 0, colorDepth: 0, pixelRatio: 1 };
  }
  return {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio ?? 1,
  };
};

const getEncryptionInfo = (): EncryptionInfo => {
  if (!api?.core?.useConfig) {
    return { type: 'disabled' };
  }

  const { config } = api.core.useConfig();
  const encryption = config.encryption;

  if (encryption.type === 'disabled') {
    return { type: 'disabled' };
  }

  if (encryption.type === 'gpgPassword') {
    return {
      type: 'gpgPassword',
      passwordProvided: !!encryption.password,
    };
  }

  return {
    type: 'gpgKeys',
    publicKeyProvided: !!encryption.publicKey,
    privateKeyProvided: !!encryption.privateKey,
    passphraseProvided: !!encryption.privateKeyPassphrase,
  };
};

const getPlatformInfo = (): PlatformInfo => {
  const platform = api?.core?.useQuasar?.()?.platform?.is;

  return {
    isNativeMobile: platform?.nativeMobile ?? false,
    isAndroid: platform?.android ?? false,
    isIOS: platform?.ios ?? false,
    isDesktop: platform?.desktop ?? true,
    isElectron: platform?.electron ?? false,
    isStandalone: getStandaloneStatus(),
  };
};

const getRuntimeApiUrl = (): string => {
  const configuredUrl = api?.core?.useConfig?.().config.network.apiUrl;
  return getApiBaseUrl(configuredUrl);
};

const getEnvironmentInfo = (): EnvironmentInfo => ({
  apiUrl: process.env.API_URL || '',
  runtimeApiUrl: getRuntimeApiUrl(),
  authUrl: process.env.AUTH_URL || '',
  buildMode: process.env.NODE_ENV || '',
  deploymentTarget: process.env.DEPLOYMENT_ENV || '',
});

const getWebSocketInfo = (): WebSocketInfo => {
  const url = getWebSocketUrl();
  const isConnected = wsClient?.isConnected ?? false;
  const socketId = wsClient?.socketId ?? null;

  return {
    url,
    isConnected,
    socketId,
  };
};

const getIndexedNotesCount = async (): Promise<number | undefined> => {
  const result = await to(async () => useFileMetaStore().count())();
  if (result.isErr()) return undefined;
  return result.value;
};

const getDeviceInfo = async (): Promise<DeviceInfo | undefined> => {
  const $q = api?.core?.useQuasar?.();
  if (!$q?.platform?.is?.nativeMobile) return undefined;

  const safeGetDeviceInfo = to(async () => {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    return {
      model: info.model,
      manufacturer: info.manufacturer,
      osVersion: info.osVersion,
      androidSDKVersion: $q.platform.is.android ? Number(info.androidSDKVersion) : undefined,
    };
  });

  const result = await safeGetDeviceInfo();
  if (result.isErr()) return undefined;
  return result.value;
};

const getSystemInfo = async (): Promise<SystemInfo> => {
  const [device] = await Promise.all([getDeviceInfo()]);

  return {
    version,
    language: getNavigatorLanguage(),
    screen: getScreenInfo(),
    encryption: getEncryptionInfo(),
    websocket: getWebSocketInfo(),
    environment: getEnvironmentInfo(),
    platform: getPlatformInfo(),
    device,
  };
};

const formatHeader = (info: SystemInfo): string[] => [
  `OrgNote: ${info.version}`,
  `Language: ${info.language}`,
];

const formatScreen = (screen: ScreenInfo): string[] => [
  '',
  'Screen:',
  `  Resolution: ${screen.width}x${screen.height}`,
  `  Color depth: ${screen.colorDepth}`,
  `  Pixel ratio: ${screen.pixelRatio}`,
];

const formatEncryptionDetails = (info: EncryptionInfo): string[] => {
  if (info.type === 'gpgPassword') {
    return [`  Password provided: ${info.passwordProvided}`];
  }
  if (info.type === 'gpgKeys') {
    return [
      `  Public key provided: ${info.publicKeyProvided}`,
      `  Private key provided: ${info.privateKeyProvided}`,
      `  Passphrase provided: ${info.passphraseProvided}`,
    ];
  }
  return [];
};

const formatEncryption = (info: EncryptionInfo): string[] => {
  const base = ['', 'Encryption:', `  Type: ${info.type}`];
  return [...base, ...formatEncryptionDetails(info)];
};

const formatWebSocket = (info: WebSocketInfo): string[] => [
  '',
  'WebSocket:',
  `  URL: ${info.url}`,
  `  Connected: ${info.isConnected}`,
  `  Socket ID: ${info.socketId ?? 'N/A'}`,
];

const formatEnvironment = (env: EnvironmentInfo): string[] => [
  '',
  'Environment:',
  `  Build API URL: ${env.apiUrl}`,
  `  Runtime API URL: ${env.runtimeApiUrl}`,
  `  Build AUTH URL: ${env.authUrl}`,
  `  Build mode: ${env.buildMode}`,
  `  Deployment target: ${env.deploymentTarget}`,
];

const formatPlatform = (platform: PlatformInfo): string[] => {
  const lines = ['', 'Platform:'];
  const entries = Object.entries(platform)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${key}: ${value}`);

  return [...lines, ...entries];
};

const formatDevice = (device?: DeviceInfo): string[] => {
  if (!device) {
    return [];
  }

  const lines = [
    '',
    'Device:',
    `  Model: ${device.model}`,
    `  Manufacturer: ${device.manufacturer}`,
    `  OS Version: ${device.osVersion}`,
  ];

  if (device.androidSDKVersion !== undefined) {
    lines.push(`  Android SDK: ${device.androidSDKVersion}`);
  }

  return lines;
};

const formatNotes = (indexedNotesCount?: number): string[] => {
  if (indexedNotesCount === undefined) return [];
  return ['', 'Notes:', `  Indexed notes: ${indexedNotesCount}`];
};

const getTextSystemInfo = async (): Promise<string> => {
  const [info, indexedNotesCount] = await Promise.all([getSystemInfo(), getIndexedNotesCount()]);
  const sections = [
    formatHeader(info),
    formatNotes(indexedNotesCount),
    formatScreen(info.screen),
    formatEncryption(info.encryption),
    formatWebSocket(info.websocket),
    formatEnvironment(info.environment),
    formatPlatform(info.platform),
    formatDevice(info.device),
  ];

  return sections.flat().join('\n');
};

export const useSystemInfo = (): SystemInfoDefinition => ({
  getSystemInfo,
  getTextSystemInfo,
});
