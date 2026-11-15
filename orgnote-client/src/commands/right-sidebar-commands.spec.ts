import { beforeEach, expect, test, vi, type Mock } from 'vitest';
import { DefaultCommands, type Command, type OrgNoteApi } from 'orgnote-api';
import { getRightSidebarCommands } from './right-sidebar-commands';
import { api } from 'src/boot/api';
import { createPinia, setActivePinia } from 'pinia';
import { useRightSidebarStore } from 'src/stores/right-sidebar';
import { ref } from 'vue';

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useCommands: vi.fn(),
    },
    ui: {
      useRightSidebar: vi.fn(),
      usePinnedCommands: vi.fn(),
    },
  },
}));

type MinimalCommandsStore = Pick<ReturnType<OrgNoteApi['core']['useCommands']>, 'get' | 'execute'>;

const createCommandsStore = (commandsByName: Record<string, Command>): MinimalCommandsStore => {
  return {
    get: (name: string) => commandsByName[name],
    execute: vi.fn(async () => undefined),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
});

test('right sidebar toggle executes first visible pinned content command', async () => {
  const rightSidebar = useRightSidebarStore();
  const openSpy = vi.spyOn(rightSidebar, 'open');

  const pinned = ref<string[]>([DefaultCommands.TOGGLE_RIGHT_SIDEBAR, 'hidden-cmd', 'visible-cmd']);

  const commandsStore = createCommandsStore({
    'hidden-cmd': {
      command: 'hidden-cmd',
      handler: vi.fn(),
      hide: () => true,
    } as unknown as Command,
    'visible-cmd': {
      command: 'visible-cmd',
      handler: vi.fn(),
    } as unknown as Command,
  });

  (api.ui.useRightSidebar as unknown as Mock).mockReturnValue(rightSidebar);
  (api.ui.usePinnedCommands as unknown as Mock).mockReturnValue({
    getCommands: () => pinned,
  });
  (api.core.useCommands as unknown as Mock).mockReturnValue(commandsStore);

  const toggle = getRightSidebarCommands().find(
    (c) => c.command === DefaultCommands.TOGGLE_RIGHT_SIDEBAR,
  );

  await toggle?.handler(api as unknown as OrgNoteApi, { data: undefined, meta: {} as Command });

  expect(commandsStore.execute).toHaveBeenCalledWith('visible-cmd');
  expect(openSpy).not.toHaveBeenCalled();
});

test('right sidebar toggle opens empty sidebar when no visible content commands', async () => {
  const rightSidebar = useRightSidebarStore();

  const pinned = ref<string[]>([DefaultCommands.TOGGLE_RIGHT_SIDEBAR, 'hidden-cmd']);
  const commandsStore = createCommandsStore({
    'hidden-cmd': {
      command: 'hidden-cmd',
      handler: vi.fn(),
      hide: () => true,
    } as unknown as Command,
  });

  (api.ui.useRightSidebar as unknown as Mock).mockReturnValue(rightSidebar);
  (api.ui.usePinnedCommands as unknown as Mock).mockReturnValue({
    getCommands: () => pinned,
  });
  (api.core.useCommands as unknown as Mock).mockReturnValue(commandsStore);

  const toggle = getRightSidebarCommands().find(
    (c) => c.command === DefaultCommands.TOGGLE_RIGHT_SIDEBAR,
  );

  await toggle?.handler(api as unknown as OrgNoteApi, { data: undefined, meta: {} as Command });

  expect(commandsStore.execute).not.toHaveBeenCalled();
  expect(rightSidebar.opened).toBe(true);
});
