import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';
import AgendaPomodoroBuffer from './AgendaPomodoroBuffer.vue';

const stores = vi.hoisted(() => ({
  ensureLoaded: vi.fn(),
  loadFiles: vi.fn(),
  restoreSession: vi.fn(),
}));

vi.mock('./stores/agenda-tasks-store', () => ({
  useAgendaTasksStore: () => ({
    ensureLoaded: stores.ensureLoaded,
    loadFiles: stores.loadFiles,
  }),
}));

vi.mock('./stores/pomodoro-store', () => ({
  usePomodoroStore: () => ({ restoreSession: stores.restoreSession }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  stores.ensureLoaded.mockResolvedValue(undefined);
  stores.loadFiles.mockResolvedValue(undefined);
  stores.restoreSession.mockResolvedValue(undefined);
});

test('Pomodoro buffer reuses loaded agenda files before restoring its session', async () => {
  mount(AgendaPomodoroBuffer, {
    global: {
      stubs: {
        AgendaPomodoroTimer: true,
        AppBufferContent: { template: '<div><slot /></div>' },
        AppFlex: true,
        CommandActionButton: true,
        ContainerLayout: { template: '<div><slot name="header" /><slot name="body" /></div>' },
      },
    },
  });
  await flushPromises();

  expect(stores.ensureLoaded).toHaveBeenCalledOnce();
  expect(stores.loadFiles).not.toHaveBeenCalled();
  expect(stores.ensureLoaded.mock.invocationCallOrder[0]!).toBeLessThan(
    stores.restoreSession.mock.invocationCallOrder[0]!,
  );
});
