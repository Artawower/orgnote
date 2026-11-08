import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { OrgNoteApi } from 'orgnote-api';
import { uint8ArrayToText } from 'orgnote-api/utils';
import { addTaskTimeCommand } from './add-task-time-command';

const openModal = vi.fn();
const readFile = vi.fn();
const writeFile = vi.fn();

const api = {
  core: {
    useFileContent: () => ({ read: readFile, write: writeFile }),
  },
  ui: {
    useModal: () => ({ open: openModal }),
  },
} as unknown as OrgNoteApi;

const task = {
  id: 'prepare-release',
  filePath: '/agenda/tasks.org',
  start: 0,
};

const existingContent = `* TODO Prepare release
:LOGBOOK:
CLOCK: [2026-05-13 Wed 09:00]--[2026-05-13 Wed 09:30] =>  0:30
:END:
`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T12:00:00'));
  openModal.mockResolvedValue({ hours: 1, minutes: 30 });
  readFile.mockResolvedValue(new TextEncoder().encode(existingContent));
  writeFile.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

test('add time appends a new clock interval without modifying existing records', async () => {
  await addTaskTimeCommand.handler(api, { meta: addTaskTimeCommand, data: task });

  expect(openModal).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ title: 'extensions.orgAgenda.taskTime.title' }),
  );
  expect(writeFile).toHaveBeenCalledOnce();
  const writtenContent = uint8ArrayToText(writeFile.mock.calls[0]![1]);
  expect(writtenContent).toContain(
    'CLOCK: [2026-05-13 Wed 09:00]--[2026-05-13 Wed 09:30] =>  0:30',
  );
  expect(writtenContent).toContain(
    'CLOCK: [2026-05-14 Thu 10:30]--[2026-05-14 Thu 12:00] =>  1:30',
  );
});

test('add time uses an explicit start time for the new interval', async () => {
  openModal.mockResolvedValue({ hours: 1, minutes: 30, startTime: '08:15' });

  await addTaskTimeCommand.handler(api, { meta: addTaskTimeCommand, data: task });

  const writtenContent = uint8ArrayToText(writeFile.mock.calls[0]![1]);
  expect(writtenContent).toContain(
    'CLOCK: [2026-05-14 Thu 08:15]--[2026-05-14 Thu 09:45] =>  1:30',
  );
});

test('add time records a previous-day interval after midnight', async () => {
  vi.setSystemTime(new Date(2026, 4, 15, 0, 30));
  openModal.mockResolvedValue({ hours: 1, minutes: 0, startTime: '23:00' });

  await addTaskTimeCommand.handler(api, { meta: addTaskTimeCommand, data: task });

  const writtenContent = uint8ArrayToText(writeFile.mock.calls[0]![1]);
  expect(writtenContent).toContain(
    'CLOCK: [2026-05-14 Thu 23:00]--[2026-05-15 Fri 00:00] =>  1:00',
  );
});

test('add time rejects a previous-day interval that still ends in the future', async () => {
  vi.setSystemTime(new Date(2026, 4, 15, 0, 30));
  openModal.mockResolvedValue({ hours: 1, minutes: 0, startTime: '23:45' });

  await addTaskTimeCommand.handler(api, { meta: addTaskTimeCommand, data: task });

  expect(readFile).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
});

test('add time does not write future intervals', async () => {
  openModal.mockResolvedValue({ hours: 1, minutes: 30, startTime: '11:00' });

  await addTaskTimeCommand.handler(api, { meta: addTaskTimeCommand, data: task });

  expect(readFile).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
});

test('add time does not write when the modal is cancelled', async () => {
  openModal.mockResolvedValue(undefined);

  await addTaskTimeCommand.handler(api, { meta: addTaskTimeCommand, data: task });

  expect(readFile).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
});
