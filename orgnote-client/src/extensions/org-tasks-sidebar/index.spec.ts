import { beforeEach, expect, test, vi } from 'vitest';
import type { Command, OrgNoteApi } from 'orgnote-api';
import { orgTasksSidebarExtension } from './index';

let registeredCommand: Command | null = null;
let removedCommand: Command | null = null;

const createMockApi = (): OrgNoteApi => {
  const commands = {
    add: vi.fn((command: Command) => {
      registeredCommand = command;
    }),
    get: vi.fn((name: string) => {
      if (registeredCommand?.command === name) {
        return registeredCommand;
      }

      return undefined;
    }),
    remove: vi.fn((command: Command) => {
      removedCommand = command;
    }),
  };

  const pinnedCommands = {
    addCommand: vi.fn(),
    removeCommand: vi.fn(),
  };

  const rightSidebar = {
    openComponent: vi.fn(),
  };

  return {
    infrastructure: {} as OrgNoteApi['infrastructure'],
    core: {
      useCommands: vi.fn(() => commands) as unknown as OrgNoteApi['core']['useCommands'],
    } as OrgNoteApi['core'],
    ui: {
      usePinnedCommands: vi.fn(
        () => pinnedCommands,
      ) as unknown as OrgNoteApi['ui']['usePinnedCommands'],
      useRightSidebar: vi.fn(() => rightSidebar) as unknown as OrgNoteApi['ui']['useRightSidebar'],
    } as OrgNoteApi['ui'],
    utils: {} as OrgNoteApi['utils'],
    vue: {} as OrgNoteApi['vue'],
  } as OrgNoteApi;
};

beforeEach(() => {
  registeredCommand = null;
  removedCommand = null;
  vi.clearAllMocks();
});

test('orgTasksSidebarExtension onMounted registers command and pins it to right sidebar', async () => {
  const api = createMockApi();

  await orgTasksSidebarExtension.onMounted(api);

  expect(registeredCommand).not.toBeNull();
  expect(registeredCommand?.command).toBe('open tasks sidebar');
  expect(registeredCommand?.group).toBe('right sidebar');
  expect(api.ui.usePinnedCommands().addCommand).toHaveBeenCalledWith(
    'right-sidebar',
    'open tasks sidebar',
  );
});

test('orgTasksSidebarExtension command handler opens tasks sidebar component', async () => {
  const api = createMockApi();

  await orgTasksSidebarExtension.onMounted(api);
  await registeredCommand?.handler(api, { meta: registeredCommand, data: undefined });

  expect(api.ui.useRightSidebar().openComponent).toHaveBeenCalledTimes(1);
});

test('orgTasksSidebarExtension onUnmounted removes command and unpins it', async () => {
  const api = createMockApi();

  await orgTasksSidebarExtension.onMounted(api);
  await orgTasksSidebarExtension.onUnmounted?.(api);

  expect(removedCommand?.command).toBe('open tasks sidebar');
  expect(api.ui.usePinnedCommands().removeCommand).toHaveBeenCalledWith(
    'right-sidebar',
    'open tasks sidebar',
  );
});
