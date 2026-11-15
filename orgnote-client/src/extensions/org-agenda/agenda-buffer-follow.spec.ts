import { beforeEach, expect, test, vi } from 'vitest';
import type { BufferActivationCallback, BufferActivatedEvent, OrgNoteApi } from 'orgnote-api';
import {
  AGENDA_HABITS_URI,
  AGENDA_POMODORO_STATS_URI,
  AGENDA_POMODORO_URI,
  AGENDA_TASKS_URI,
} from './constants';
import { AgendaSidebarRef } from './agenda-sidebar-ref';
import { disposeAgendaBufferFollow, registerAgendaBufferFollow } from './agenda-buffer-follow';

let activationCallback: BufferActivationCallback | undefined;
const unsubscribe = vi.fn();
const afterBufferActivated = vi.fn((callback: BufferActivationCallback) => {
  activationCallback = callback;
  return unsubscribe;
});
const config = {
  ui: {
    followActiveBufferInSidebar: true,
  },
};
const sidebar = {
  opened: false,
  setComponent: vi.fn(),
};

const api = {
  core: {
    useConfig: () => ({ config }),
    usePane: () => ({ afterBufferActivated }),
  },
  ui: {
    useSidebar: () => sidebar,
  },
} as unknown as OrgNoteApi;

const activateBuffer = async (uri: string): Promise<void> => {
  const event: BufferActivatedEvent = {
    current: { paneId: 'pane-1', tabId: 'tab-1', uri },
  };
  await activationCallback?.(event);
};

beforeEach(() => {
  disposeAgendaBufferFollow();
  activationCallback = undefined;
  config.ui.followActiveBufferInSidebar = true;
  sidebar.opened = false;
  sidebar.setComponent.mockReset();
  unsubscribe.mockReset();
  afterBufferActivated.mockClear();
});

test.each([
  AGENDA_TASKS_URI,
  'builtin:///agenda-tasks/day/2026-05-14',
  AGENDA_HABITS_URI,
  AGENDA_POMODORO_URI,
  AGENDA_POMODORO_STATS_URI,
])('selects the Agenda sidebar for %s without opening it', async (uri) => {
  registerAgendaBufferFollow(api);

  await activateBuffer(uri);

  expect(afterBufferActivated).toHaveBeenCalledWith(expect.any(Function), { immediate: true });
  expect(sidebar.setComponent).toHaveBeenCalledWith(AgendaSidebarRef);
  expect(sidebar.opened).toBe(false);
});

test('keeps an open sidebar open while selecting the Agenda view', async () => {
  sidebar.opened = true;
  registerAgendaBufferFollow(api);

  await activateBuffer(AGENDA_TASKS_URI);

  expect(sidebar.setComponent).toHaveBeenCalledWith(AgendaSidebarRef);
  expect(sidebar.opened).toBe(true);
});

test('ignores disabled and unrelated buffer activation', async () => {
  registerAgendaBufferFollow(api);

  config.ui.followActiveBufferInSidebar = false;
  await activateBuffer(AGENDA_TASKS_URI);
  config.ui.followActiveBufferInSidebar = true;
  await activateBuffer('file:///notes/today.org');

  expect(sidebar.setComponent).not.toHaveBeenCalled();
});

test('disposes the active buffer subscription', () => {
  registerAgendaBufferFollow(api);

  disposeAgendaBufferFollow();
  disposeAgendaBufferFollow();

  expect(unsubscribe).toHaveBeenCalledOnce();
});
