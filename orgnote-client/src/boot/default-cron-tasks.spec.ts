import { DefaultCommands, type CronTaskConfig, type OrgNoteApi } from 'orgnote-api';
import { beforeEach, expect, test, vi } from 'vitest';
import defaultCronTasksBoot from './default-cron-tasks';

const mocks = vi.hoisted(() => {
  const cleanupBuffers = vi.fn();
  const executeCommand = vi.fn();
  const initCron = vi.fn();
  const registerCron = vi.fn();
  const api = {
    core: {
      useBuffers: () => ({ cleanup: cleanupBuffers }),
      useCommands: () => ({ execute: executeCommand }),
      useCron: () => ({ init: initCron, register: registerCron }),
    },
  };
  return { api, cleanupBuffers, executeCommand, initCron, registerCron };
});

const api = mocks.api as unknown as OrgNoteApi;

vi.mock('./api', () => ({ api: mocks.api }));

beforeEach(() => {
  vi.clearAllMocks();
});

test('default cleanup cron clears old queue tasks and unused buffers', async () => {
  await defaultCronTasksBoot({} as never);
  const config = mocks.registerCron.mock.calls[0]?.[0] as CronTaskConfig | undefined;
  expect(config).toBeDefined();

  await config!.handler(api);

  expect(mocks.executeCommand).toHaveBeenCalledWith(DefaultCommands.CLEAR_OLD_QUEUE_TASKS);
  expect(mocks.cleanupBuffers).toHaveBeenCalledOnce();
});
