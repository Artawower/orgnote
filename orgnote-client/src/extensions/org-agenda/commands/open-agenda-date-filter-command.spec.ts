import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DefaultCommands, type Command, type OrgNoteApi } from 'orgnote-api';
import { useAgendaFilterStore } from '../stores/agenda-filter-store';
import {
  clearAgendaDateFilterCommand,
  openAgendaDateFilterCommand,
} from './open-agenda-date-filter-command';
import { agendaFilterCommands, openAgendaFileFilterCommand } from './open-agenda-filter-commands';
import {
  AGENDA_TASKS_NEXT7DAYS_COMMAND,
  AGENDA_TASKS_TODAY_COMMAND,
  AGENDA_TASKS_TOMORROW_COMMAND,
} from '../constants';

const openModal = vi.fn();
const execute = vi.fn();
let activeBufferUri: string | undefined;
const api = {
  ui: { useModal: () => ({ open: openModal }) },
  core: {
    useCommands: () => ({ execute }),
    usePane: () => ({ activeBufferUri }),
  },
} as unknown as OrgNoteApi;

const getFilterCommand = (name: string): Command =>
  agendaFilterCommands.find(({ command }) => command === name)!;

beforeEach(() => {
  setActivePinia(createPinia());
  activeBufferUri = undefined;
  openModal.mockReset();
  execute.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

test('Today opens one buffer for the concrete local date', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T12:00:00'));
  const command = getFilterCommand(AGENDA_TASKS_TODAY_COMMAND);

  await command.handler(api, { meta: command });

  expect(execute).toHaveBeenCalledWith(DefaultCommands.SHOW_OR_OPEN_BUFFER, {
    uri: 'builtin:///agenda-tasks/day/2026-05-14/today',
  });
});

test('Tomorrow opens a separate concrete day buffer', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T12:00:00'));
  const command = getFilterCommand(AGENDA_TASKS_TOMORROW_COMMAND);

  await command.handler(api, { meta: command });

  expect(execute).toHaveBeenCalledWith(DefaultCommands.SHOW_OR_OPEN_BUFFER, {
    uri: 'builtin:///agenda-tasks/day/2026-05-15/tomorrow',
  });
});

test('Next 7 days opens a concrete range buffer', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T12:00:00'));
  const command = getFilterCommand(AGENDA_TASKS_NEXT7DAYS_COMMAND);

  await command.handler(api, { meta: command });

  expect(execute).toHaveBeenCalledWith(DefaultCommands.SHOW_OR_OPEN_BUFFER, {
    uri: 'builtin:///agenda-tasks/range/2026-05-14/2026-05-21/next7days',
  });
});

test('date filter command opens the selected range buffer', async () => {
  openModal.mockResolvedValue({ selection: { from: '2026-05-14', to: '2026-05-18' } });

  await openAgendaDateFilterCommand.handler(api, { meta: openAgendaDateFilterCommand });

  expect(execute).toHaveBeenCalledWith(DefaultCommands.SHOW_OR_OPEN_BUFFER, {
    uri: 'builtin:///agenda-tasks/range/2026-05-14/2026-05-18',
  });
});

test('date filter command initializes the picker from the active day buffer', async () => {
  activeBufferUri = 'builtin:///agenda-tasks/day/2026-05-15';
  openModal.mockResolvedValue(undefined);

  await openAgendaDateFilterCommand.handler(api, { meta: openAgendaDateFilterCommand });

  expect(openModal).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      modalProps: {
        modelValue: '2026-05-15',
        selectionMode: 'both',
        confirmMode: true,
      },
    }),
  );
  expect(execute).not.toHaveBeenCalled();
});

test('selected Today preserves relative semantics in its concrete day buffer', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-18T12:00:00'));
  openModal.mockResolvedValue({ selection: '2026-05-18' });

  await openAgendaDateFilterCommand.handler(api, { meta: openAgendaDateFilterCommand });

  expect(execute).toHaveBeenCalledWith(DefaultCommands.SHOW_OR_OPEN_BUFFER, {
    uri: 'builtin:///agenda-tasks/day/2026-05-18/today',
  });
});

test('file filter preserves the active date buffer', async () => {
  activeBufferUri = 'builtin:///agenda-tasks/range/2026-05-14/2026-05-18';

  await openAgendaFileFilterCommand.handler(api, {
    meta: openAgendaFileFilterCommand,
    data: { filePath: '/agenda/work.org' },
  });

  expect(useAgendaFilterStore().selectedFilePath).toBe('/agenda/work.org');
  expect(execute).toHaveBeenCalledWith(DefaultCommands.SHOW_OR_OPEN_BUFFER, {
    uri: activeBufferUri,
  });
});

test('clear date filter opens the stable All buffer without clearing search', async () => {
  const store = useAgendaFilterStore();
  store.searchQuery = 'quarterly';

  await clearAgendaDateFilterCommand.handler(api, { meta: clearAgendaDateFilterCommand });

  expect(execute).toHaveBeenCalledWith(DefaultCommands.SHOW_OR_OPEN_BUFFER, {
    uri: 'builtin:///agenda-tasks/preset/all',
  });
  expect(store.searchQuery).toBe('quarterly');
});
