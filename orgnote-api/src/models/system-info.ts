export interface ScreenInfo {
  width: number;
  height: number;
  colorDepth: number;
  pixelRatio: number;
}

export interface DeviceInfo {
  model: string;
  manufacturer: string;
  osVersion: string;
  androidSDKVersion?: number;
}

export interface EncryptionInfo {
  type: string;
  passwordProvided?: boolean;
  publicKeyProvided?: boolean;
  privateKeyProvided?: boolean;
  passphraseProvided?: boolean;
}

export interface WebSocketInfo {
  url: string;
  isConnected: boolean;
  socketId: string | null;
}

export interface EnvironmentInfo {
  apiUrl: string;
  runtimeApiUrl: string;
  authUrl: string;
  buildMode: string;
  deploymentTarget: string;
}

export interface PlatformInfo {
  isNativeMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  isElectron: boolean;
  isStandalone: boolean;
  [key: string]: boolean;
}

export interface SystemInfo {
  version: string;
  language: string;
  screen: ScreenInfo;
  encryption: EncryptionInfo;
  websocket: WebSocketInfo;
  environment: EnvironmentInfo;
  platform: PlatformInfo;
  device?: DeviceInfo;
}

export interface SystemInfoDefinition {
  getSystemInfo(): Promise<SystemInfo>;
  getTextSystemInfo(): Promise<string>;
}

export type UseSystemInfo = () => SystemInfoDefinition;
