import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useSystemInfo } from './use-system-info';
import { createPinia, setActivePinia } from 'pinia';
import { invalidateCountCache } from 'src/stores/file-meta';

const repositoryMocks = vi.hoisted(() => ({
  count: vi.fn(async () => 42),
}));

vi.mock('src/boot/repositories', () => ({
  repositories: {
    fileRepository: {
      count: repositoryMocks.count,
    },
  },
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useQuasar: vi.fn(() => ({
        platform: {
          is: {
            nativeMobile: false,
            android: false,
            ios: false,
            desktop: true,
            electron: false,
            mobile: false,
          },
        },
      })),
      useConfig: vi.fn(() => ({
        config: {
          encryption: {
            type: 'disabled',
          },
          network: {
            apiUrl: 'https://runtime.example.com/v1',
            wsUrl: '',
          },
        },
      })),
    },
  },
}));

vi.mock('src/utils/server-endpoints', () => ({
  getApiBaseUrl: vi.fn((configured?: string) => configured || '/v1'),
  getWebSocketUrl: vi.fn(() => 'ws://localhost:3000/ws/events'),
}));

vi.mock('src/infrastructure/websocket-client', () => ({
  wsClient: {
    isConnected: false,
    socketId: null,
  },
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  invalidateCountCache();
  repositoryMocks.count.mockResolvedValue(42);
  setActivePinia(createPinia());
  process.env.CLIENT = 'true';
  process.env.API_URL = 'https://api.example.com';
  process.env.AUTH_URL = 'https://auth.example.com';
  process.env.NODE_ENV = 'test';
  process.env.APP_VERSION = '1.2.3';
  process.env.DEPLOYMENT_ENV = 'dev';

  global.screen = {
    width: 1920,
    height: 1080,
    colorDepth: 24,
  } as Screen;

  global.window = {
    devicePixelRatio: 2,
    navigator: {
      language: 'en-US',
      standalone: false,
    },
  } as unknown as Window & typeof globalThis;

  global.navigator = {
    language: 'en-US',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  } as Navigator;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test('getSystemInfo returns complete system information', async () => {
  const systemInfo = useSystemInfo();
  const info = await systemInfo.getSystemInfo();

  expect(info).toHaveProperty('version');
  expect(info).toHaveProperty('language');
  expect(info).toHaveProperty('screen');
  expect(info).toHaveProperty('encryption');
  expect(info).toHaveProperty('environment');
  expect(info).toHaveProperty('platform');
});

test('getSystemInfo includes screen information', async () => {
  const systemInfo = useSystemInfo();
  const info = await systemInfo.getSystemInfo();

  expect(info.screen).toHaveProperty('width');
  expect(info.screen).toHaveProperty('height');
  expect(info.screen).toHaveProperty('colorDepth');
  expect(info.screen).toHaveProperty('pixelRatio');
});

test('getSystemInfo includes encryption information with disabled type', async () => {
  const systemInfo = useSystemInfo();
  const info = await systemInfo.getSystemInfo();

  expect(info.encryption).toHaveProperty('type');
  expect(info.encryption.type).toBe('disabled');
});

test('getSystemInfo includes environment information', async () => {
  const systemInfo = useSystemInfo();
  const info = await systemInfo.getSystemInfo();

  expect(info.environment.apiUrl).toBe('https://api.example.com');
  expect(info.environment.runtimeApiUrl).toBe('https://runtime.example.com/v1');
  expect(info.environment.authUrl).toBe('https://auth.example.com');
  expect(info.environment.buildMode).toBe('test');
  expect(info.environment.deploymentTarget).toBe('dev');
});

test('getSystemInfo includes platform information', async () => {
  const systemInfo = useSystemInfo();
  const info = await systemInfo.getSystemInfo();

  expect(info.platform).toHaveProperty('isNativeMobile');
  expect(info.platform).toHaveProperty('isAndroid');
  expect(info.platform).toHaveProperty('isIOS');
  expect(info.platform).toHaveProperty('isDesktop');
  expect(info.platform).toHaveProperty('isElectron');
  expect(info.platform).toHaveProperty('isStandalone');
});

test('getTextSystemInfo returns formatted string with all sections', async () => {
  const systemInfo = useSystemInfo();
  const formatted = await systemInfo.getTextSystemInfo();

  expect(formatted).toContain('OrgNote:');
  expect(formatted).toContain('Language:');
  expect(formatted).toContain('Screen:');
  expect(formatted).toContain('Encryption:');
  expect(formatted).toContain('Environment:');
  expect(formatted).toContain('Platform:');
});

test('getTextSystemInfo includes encryption type disabled', async () => {
  const systemInfo = useSystemInfo();
  const formatted = await systemInfo.getTextSystemInfo();

  expect(formatted).toContain('Build API URL: https://api.example.com');
  expect(formatted).toContain('Runtime API URL: https://runtime.example.com/v1');
  expect(formatted).toContain('Build AUTH URL: https://auth.example.com');
  expect(formatted).toContain('Build mode: test');
  expect(formatted).toContain('Deployment target: dev');
});

test('getTextSystemInfo includes indexed notes count when metadata is available', async () => {
  const systemInfo = useSystemInfo();
  const formatted = await systemInfo.getTextSystemInfo();

  expect(repositoryMocks.count).toHaveBeenCalledOnce();
  expect(formatted).toContain('Notes:');
  expect(formatted).toContain('Indexed notes: 42');
});

test('getTextSystemInfo omits device section for non-native platforms', async () => {
  const systemInfo = useSystemInfo();
  const formatted = await systemInfo.getTextSystemInfo();

  expect(formatted).not.toContain('Device:');
});

test('platform info contains only boolean values', async () => {
  const systemInfo = useSystemInfo();
  const info = await systemInfo.getSystemInfo();

  Object.values(info.platform).forEach((value) => {
    expect(typeof value).toBe('boolean');
  });
});

test('getSystemInfo returns safe defaults without navigator', async () => {
  const systemInfo = useSystemInfo();
  const originalNavigator = global.navigator;
  const originalWindow = global.window;
  const originalScreen = global.screen;

  // @ts-expect-error - simulate SSR by removing globals
  delete global.navigator;
  // @ts-expect-error - simulate SSR by removing window
  delete global.window;
  // @ts-expect-error - simulate SSR by removing screen
  delete global.screen;
  process.env.CLIENT = 'false';

  const info = await systemInfo.getSystemInfo();

  expect(info.language).toBe('');
  expect(info.screen.width).toBe(0);
  expect(info.platform.isStandalone).toBe(false);

  global.navigator = originalNavigator;
  global.window = originalWindow;
  global.screen = originalScreen;
  process.env.CLIENT = 'true';
});
