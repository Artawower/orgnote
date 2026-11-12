import { test, expect, vi, beforeEach } from 'vitest';
import type { Command } from 'orgnote-api';
import { DefaultCommands, I18N, RouteNames } from 'orgnote-api';

const mockModal = {
  open: vi.fn(),
  component: null as unknown,
  config: undefined as { modalProps?: { settingsRouter?: { push: ReturnType<typeof vi.fn> } } } | undefined,
  close: vi.fn(),
};

const mockSettingsRouter = {
  push: vi.fn(async () => undefined),
  currentRoute: {
    value: {
      name: RouteNames.SettingsPage,
    },
  },
};

const mockNotifications = {
  notify: vi.fn(),
};

const mockCopyToClipboard = vi.fn(async () => undefined);
const mockReportError = vi.fn();
let mockIsSelfHosted = false;

const mockBuildLocalSyncProfileToml = vi.fn(() => '[profile]\nname = "default"');
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

const mockApi = {
  ui: {
    useModal: vi.fn(() => mockModal),
    useConfirmationModal: vi.fn(() => ({
      confirm: vi.fn(),
    })),
  },
  core: {
    useAuth: vi.fn(() => ({
      user: null,
    })),
    useNotifications: vi.fn(() => mockNotifications),
  },
  infrastructure: {},
  utils: {
    copyToClipboard: mockCopyToClipboard,
  },
  vue: {},
};

vi.mock('src/boot/api', () => ({
  api: mockApi,
}));

vi.mock('./command-guards', () => ({
  isSelfHostedServer: () => mockIsSelfHosted,
}));

vi.mock('src/composables/use-route-active', () => ({
  useRouteActive: vi.fn(() => ({
    isActive: vi.fn().mockReturnValue(false),
  })),
}));

vi.mock('src/containers/TheSettings.vue', () => ({
  default: { name: 'TheSettings' },
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError: mockReportError,
  },
}));

vi.mock('src/utils/local-sync-profile-config', () => ({
  buildLocalSyncProfileToml: mockBuildLocalSyncProfileToml,
}));

const mockDefineAsyncComponent = <T>(factory: () => T): T => factory();

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    defineAsyncComponent: vi.fn(mockDefineAsyncComponent),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockModal.component = null;
  mockModal.config = undefined;
  mockIsSelfHosted = false;
  vi.stubGlobal('URL', {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });
});

test('openSettingsRoute opens settings modal with wide layout', async () => {
  const { getSettingsCommands } = await import('./settings-commands');
  const commands = getSettingsCommands();
  const settingsCommand = commands.find((cmd) => cmd.command === 'settings');

  expect(settingsCommand).toBeDefined();
  if (settingsCommand) {
    settingsCommand.handler(mockApi as never, { data: {}, meta: {} });
  }

  expect(mockModal.open).toHaveBeenCalledWith(
    expect.any(Object),
    expect.objectContaining({
      wide: true,
      noBodyPadding: true,
      modalProps: expect.objectContaining({
        initialRoute: RouteNames.SettingsPage,
      }),
    }),
  );
});

test('openSettingsRoute reuses existing modal without reopening', async () => {
  const { getSettingsCommands } = await import('./settings-commands');
  const commands = getSettingsCommands();
  const settingsCommand = commands.find((cmd) => cmd.command === 'settings');

  const TheSettingsComponent = (await import('src/containers/TheSettings.vue')).default;
  mockModal.component = TheSettingsComponent;
  mockModal.config = {
    modalProps: {
      settingsRouter: mockSettingsRouter,
    },
  };

  if (settingsCommand) {
    settingsCommand.handler(mockApi as never, { data: {}, meta: {} });
  }

  await Promise.resolve();

  expect(mockModal.open).not.toHaveBeenCalled();
  expect(mockSettingsRouter.push).toHaveBeenCalledWith({
    name: RouteNames.SettingsPage,
  });
});

test('subscription settings command is hidden and guarded on self-hosted servers', async () => {
  mockIsSelfHosted = true;
  const { getSettingsCommands } = await import('./settings-commands');
  const command = getSettingsCommands().find(
    (candidate) => candidate.command === DefaultCommands.SUBSCRIPTION_SETTINGS,
  );

  expect(command?.hide?.(mockApi as never)).toBe(true);
  command?.handler(mockApi as never, { data: {}, meta: {} });

  expect(mockModal.open).not.toHaveBeenCalled();
});

test('getSettingsCommands export available', async () => {
  const { getSettingsCommands } = await import('./settings-commands');
  const commands = getSettingsCommands();

  expect(Array.isArray(commands)).toBe(true);
  expect(commands.length).toBeGreaterThan(0);
  expect(
    commands.every(
      (cmd: Command) => typeof cmd.command === 'string' && typeof cmd.handler === 'function',
    ),
  ).toBe(true);
});

test('settings-commands EXPORT_LOCAL_SYNC_CONFIG copies generated toml and shows notification', async () => {
  const { getSettingsCommands } = await import('./settings-commands');
  const commands = getSettingsCommands();
  const exportCommand = commands.find((cmd) => cmd.command === DefaultCommands.EXPORT_LOCAL_SYNC_CONFIG);

  expect(exportCommand).toBeDefined();

  if (exportCommand) {
    await exportCommand.handler(mockApi as never, { data: {}, meta: {} });
  }

  expect(mockBuildLocalSyncProfileToml).toHaveBeenCalledTimes(1);
  expect(mockCopyToClipboard).toHaveBeenCalledWith('[profile]\nname = "default"');
  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: I18N.SYNC_PROFILE_CONFIG_EXPORTED,
      level: 'info',
    }),
  );
});

test('settings-commands DOWNLOAD_LOCAL_SYNC_CONFIG downloads generated toml and shows notification', async () => {
  const { getSettingsCommands } = await import('./settings-commands');
  const commands = getSettingsCommands();
  const downloadCommand = commands.find(
    (cmd) => cmd.command === DefaultCommands.DOWNLOAD_LOCAL_SYNC_CONFIG,
  );

  expect(downloadCommand).toBeDefined();

  if (downloadCommand) {
    await downloadCommand.handler(mockApi as never, { data: {}, meta: {} });
  }

  expect(mockBuildLocalSyncProfileToml).toHaveBeenCalledTimes(1);
  expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
  expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: I18N.SYNC_PROFILE_CONFIG_DOWNLOADED,
      level: 'info',
    }),
  );
});
