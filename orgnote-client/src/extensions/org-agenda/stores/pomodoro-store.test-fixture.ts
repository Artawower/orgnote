import { afterEach, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

export const mockKvGet = vi.fn();
export const mockKvSet = vi.fn();
export const mockKvDelete = vi.fn();
export const mockFileRead = vi.fn();
export const mockFileWrite = vi.fn();
export const mockConfirm = vi.fn();
const mockLoadFiles = vi.fn();
const mockAgendaTasksStore = {
  allFiles: [] as Array<{ filePath: string[]; tasks?: unknown[] }>,
  loadFiles: mockLoadFiles,
};
export const mockGetExtensionConfig = vi.fn(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileContent: () => ({ read: mockFileRead, write: mockFileWrite }),
      useExtensions: () => ({ getExtensionConfig: mockGetExtensionConfig }),
      useNotifications: () => ({ notify: vi.fn() }),
    },
    infrastructure: {
      keyValueRepository: { get: mockKvGet, set: mockKvSet, delete: mockKvDelete },
    },
    ui: {
      useConfirmationModal: () => ({ confirm: mockConfirm }),
    },
  },
}));

vi.mock('src/extensions/org-agenda/stores/agenda-tasks-store', () => ({
  useAgendaTasksStore: () => mockAgendaTasksStore,
}));

vi.mock('src/boot/report', () => ({
  reporter: { reportError: vi.fn() },
}));

vi.mock('src/boot/i18n', () => ({
  i18n: { global: { t: (key: string) => key } },
}));

vi.mock('src/extensions/org-agenda/manifest', () => ({
  orgAgendaManifest: { name: 'org-agenda' },
}));

vi.mock('src/extensions/org-agenda/mutations/clock', () => ({
  appendClock: vi.fn((content: string) => content),
}));

vi.stubGlobal(
  'AudioContext',
  class {
    createOscillator() {
      return { connect: vi.fn(), frequency: { value: 0 }, start: vi.fn(), stop: vi.fn() };
    }
    createGain() {
      return {
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      };
    }
    get currentTime() {
      return 0;
    }
    destination = {};
  },
);

export const { usePomodoroStore } = await import('./pomodoro-store');
export const { POMODORO_ACTIVE_SESSION_KEY } = await import('../constants');

export const TASK = {
  id: 't1',
  text: 'Test task',
  filePath: '/test.org',
  start: 0,
  end: 100,
  kind: 'headline-todo' as const,
  state: 'todo' as const,
};

export const NEXT_TASK = {
  ...TASK,
  id: 't2',
  text: 'Next task',
  start: 200,
  end: 300,
};

export const mockUint8 = new Uint8Array([104, 101, 108, 108, 111]);
export const orgTaskContent = new TextEncoder().encode('* TODO Test task\n');

export const setAgendaTask = (): void => {
  mockAgendaTasksStore.allFiles = [{ filePath: ['test.org'], tasks: [TASK] }];
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockKvGet.mockResolvedValue(null);
  mockKvSet.mockResolvedValue(undefined);
  mockKvDelete.mockResolvedValue(undefined);
  mockFileRead.mockResolvedValue(mockUint8);
  mockFileWrite.mockResolvedValue(undefined);
  mockConfirm.mockResolvedValue(false);
  mockLoadFiles.mockResolvedValue(undefined);
  mockAgendaTasksStore.allFiles = [];
  mockGetExtensionConfig.mockReturnValue({ value: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

export const tickSec = (seconds: number): void => {
  vi.advanceTimersByTime(seconds * 1000);
};

export const getActiveSessionPayload = (): string => {
  const activeCall = mockKvSet.mock.calls.find(
    ([key]) => key === POMODORO_ACTIVE_SESSION_KEY,
  ) as [string, string] | undefined;
  if (!activeCall) throw new Error('active session payload missing');
  return activeCall[1];
};
