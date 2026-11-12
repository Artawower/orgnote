import type { AsyncComponentLoader } from 'vue';
import { DefaultCommands, type Command, type Extension, type OrgNoteApi } from 'orgnote-api';
import { createTaskCommand } from './commands/create-task-command';
import { startPomodoroCommand } from './commands/start-pomodoro-command';
import { startStopwatchCommand } from './commands/start-stopwatch-command';
import { stopPomodoroCommand } from './commands/stop-pomodoro-command';
import { deleteTaskCommand } from './commands/delete-task-command';
import { addTaskTimeCommand } from './commands/add-task-time-command';
import { setTaskPriorityCommand } from './commands/set-task-priority-command';
import { openTaskCommand } from './commands/open-task-command';
import { quickAddToFileCommand } from './commands/quick-add-to-file-command';
import { agendaFilterCommands } from './commands/open-agenda-filter-commands';
import { AgendaSidebarRef } from './agenda-sidebar-ref';
import { disposeAgendaBufferFollow, registerAgendaBufferFollow } from './agenda-buffer-follow';
import {
  AGENDA_CREATE_TASK,
  AGENDA_QUICK_ADD_TO_FILE_COMMAND,
  AGENDA_TASK_CONTEXT_MENU_GROUP,
  AGENDA_POMODORO_START_COMMAND,
  AGENDA_POMODORO_START_STOPWATCH_COMMAND,
  AGENDA_TASK_ADD_TIME_COMMAND,
  AGENDA_TASK_DELETE_COMMAND,
  AGENDA_TASK_SET_PRIORITY_COMMAND,
  AGENDA_TASK_OPEN_COMMAND,
  AGENDA_POMODORO_URI,
  AGENDA_POMODORO_VIEWER_ID,
  AGENDA_POMODORO_PAUSE_COMMAND,
  AGENDA_POMODORO_RESUME_COMMAND,
  AGENDA_POMODORO_STATS_URI,
  AGENDA_POMODORO_STATS_PATTERN,
  AGENDA_POMODORO_STATS_VIEWER_ID,
  AGENDA_POMODORO_STATS_COMMAND,
  AGENDA_HABITS_COMMAND,
  AGENDA_HABITS_PATTERN,
  AGENDA_HABITS_URI,
  AGENDA_HABITS_VIEWER_ID,
  AGENDA_POMODORO_COMMAND,
  AGENDA_POMODORO_PATTERN,
  AGENDA_TASKS_COMMAND,
  AGENDA_TASKS_PATTERN,
  AGENDA_TASKS_VIEWER_ID,
  AGENDA_POMODORO_SET_POMO_COMMAND,
  AGENDA_POMODORO_SET_STOPWATCH_COMMAND,
  AGENDA_TASKS_NAV_COMMAND,
} from './constants';
import { agendaSettingsSchema, defaultAgendaSettings } from './agenda-config';
import { usePomodoroStore } from './stores/pomodoro-store';

interface AgendaView {
  viewerId: string;
  pattern: string;
  name: string;
  icon: string;
  command: string;
  component: AsyncComponentLoader;
  handler: (api: OrgNoteApi) => void | Promise<void>;
  isActive?: (api: OrgNoteApi) => boolean;
  pinned?: boolean;
  sidebarSection?: boolean;
  sectionNavCommand?: string;
  viewState?: { readonly version: number };
}

const toggleTasksSidebar = (api: OrgNoteApi): void => {
  api.ui.useSidebar().openComponent(AgendaSidebarRef);
};

const showOrOpenBuffer =
  (uri: string) =>
  async (api: OrgNoteApi): Promise<void> => {
    await api.core.useCommands().execute(DefaultCommands.SHOW_OR_OPEN_BUFFER, { uri });
  };

const AGENDA_VIEWS: readonly AgendaView[] = [
  {
    viewerId: AGENDA_TASKS_VIEWER_ID,
    pattern: AGENDA_TASKS_PATTERN,
    name: 'Agenda Tasks',
    icon: 'sym_o_checklist',
    command: AGENDA_TASKS_COMMAND,
    component: () => import('./AgendaTasksBuffer.vue'),
    handler: toggleTasksSidebar,
    isActive: (api: OrgNoteApi) => {
      const sidebar = api.ui.useSidebar();
      return sidebar.opened && sidebar.component === AgendaSidebarRef;
    },
    pinned: true,
    sidebarSection: true,
    sectionNavCommand: AGENDA_TASKS_NAV_COMMAND,
    viewState: { version: 1 },
  },
  {
    viewerId: AGENDA_HABITS_VIEWER_ID,
    pattern: AGENDA_HABITS_PATTERN,
    name: 'Agenda Habits',
    icon: 'sym_o_check_circle_unread',
    command: AGENDA_HABITS_COMMAND,
    component: () => import('./AgendaHabitsBuffer.vue'),
    handler: showOrOpenBuffer(AGENDA_HABITS_URI),
  },
  {
    viewerId: AGENDA_POMODORO_VIEWER_ID,
    pattern: AGENDA_POMODORO_PATTERN,
    name: 'Agenda Pomodoro',
    icon: 'sym_o_timer',
    command: AGENDA_POMODORO_COMMAND,
    component: () => import('./AgendaPomodoroBuffer.vue'),
    handler: showOrOpenBuffer(AGENDA_POMODORO_URI),
  },
  {
    viewerId: AGENDA_POMODORO_STATS_VIEWER_ID,
    pattern: AGENDA_POMODORO_STATS_PATTERN,
    name: 'Agenda Pomodoro Stats',
    icon: 'sym_o_bar_chart',
    command: AGENDA_POMODORO_STATS_COMMAND,
    component: () => import('./AgendaPomodoroStatsBuffer.vue'),
    handler: showOrOpenBuffer(AGENDA_POMODORO_STATS_URI),
  },
];

const buildNavCommand = (view: AgendaView): Command => ({
  command: view.sectionNavCommand!,
  group: 'agenda',
  icon: view.icon,
  title: view.name,
  system: true,
  isActive: view.isActive,
  handler: (api: OrgNoteApi) => {
    const sidebar = api.ui.useSidebar();
    if (sidebar.opened && sidebar.component === AgendaSidebarRef) return;
    sidebar.openComponent(AgendaSidebarRef);
  },
});

const buildCommand = (view: AgendaView): Command => ({
  command: view.command,
  group: 'agenda',
  icon: view.icon,
  isActive: view.isActive,
  handler: view.handler,
});

const registerTaskContextMenu = (api: OrgNoteApi): void => {
  const contextMenu = api.ui.useContextMenu();
  contextMenu.registerGroup(AGENDA_TASK_CONTEXT_MENU_GROUP);
  contextMenu.addContextMenuAction(AGENDA_TASK_CONTEXT_MENU_GROUP, {
    command: AGENDA_TASK_SET_PRIORITY_COMMAND,
  });
  contextMenu.addContextMenuAction(AGENDA_TASK_CONTEXT_MENU_GROUP, {
    command: AGENDA_TASK_ADD_TIME_COMMAND,
  });
  contextMenu.addContextMenuAction(AGENDA_TASK_CONTEXT_MENU_GROUP, {
    command: AGENDA_POMODORO_START_COMMAND,
  });
  contextMenu.addContextMenuAction(AGENDA_TASK_CONTEXT_MENU_GROUP, {
    command: AGENDA_POMODORO_START_STOPWATCH_COMMAND,
  });
  contextMenu.addContextMenuAction(AGENDA_TASK_CONTEXT_MENU_GROUP, {
    command: AGENDA_TASK_OPEN_COMMAND,
  });
  contextMenu.addContextMenuAction(AGENDA_TASK_CONTEXT_MENU_GROUP, {
    command: AGENDA_TASK_DELETE_COMMAND,
  });
};

const registerViews = (api: OrgNoteApi): void => {
  const viewer = api.core.useBufferViewer();
  const commands = api.core.useCommands();
  const pinned = api.ui.usePinnedCommands();
  AGENDA_VIEWS.forEach((view) => {
    viewer.register({
      pattern: view.pattern,
      component: view.component,
      meta: {
        id: view.viewerId,
        name: view.name,
        icon: view.icon,
        viewState: view.viewState,
      },
    });
    commands.add(buildCommand(view));
    if (view.pinned) pinned.addCommand('sidebar', view.command);
    if (view.sectionNavCommand) {
      commands.add(buildNavCommand(view));
      pinned.addCommand('sidebar-sections', view.sectionNavCommand);
      return;
    }
    if (view.sidebarSection) pinned.addCommand('sidebar-sections', view.command);
  });
  commands.add(createTaskCommand);
  commands.add(startPomodoroCommand);
  commands.add(startStopwatchCommand);
  commands.add(stopPomodoroCommand);
  commands.add(deleteTaskCommand);
  commands.add(addTaskTimeCommand);
  commands.add(setTaskPriorityCommand);
  commands.add(openTaskCommand);
  commands.add(quickAddToFileCommand);
  agendaFilterCommands.forEach((cmd) => commands.add(cmd));
  commands.add({
    command: AGENDA_POMODORO_PAUSE_COMMAND,
    group: 'agenda',
    icon: 'sym_o_pause',
    disabled: () => {
      const store = usePomodoroStore();
      return store.isTransitioning || !store.hasSession || !store.isRunning;
    },
    handler: async () => {
      await usePomodoroStore().pauseSession();
    },
  });
  commands.add({
    command: AGENDA_POMODORO_RESUME_COMMAND,
    group: 'agenda',
    icon: 'sym_o_play_arrow',
    disabled: () => {
      const store = usePomodoroStore();
      return store.isTransitioning || !store.hasSession || !store.isPaused;
    },
    handler: async () => {
      await usePomodoroStore().resumeSession();
    },
  });
  commands.add({
    command: AGENDA_POMODORO_SET_POMO_COMMAND,
    group: 'agenda',
    icon: 'sym_o_timer',
    disabled: () => {
      const store = usePomodoroStore();
      return store.isTransitioning || store.sessionType === 'pomo';
    },
    handler: async () => {
      await usePomodoroStore().changeSessionType('pomo');
    },
  });
  commands.add({
    command: AGENDA_POMODORO_SET_STOPWATCH_COMMAND,
    group: 'agenda',
    icon: 'sym_o_hourglass_empty',
    disabled: () => {
      const store = usePomodoroStore();
      return store.isTransitioning || store.sessionType === 'stopwatch';
    },
    handler: async () => {
      await usePomodoroStore().changeSessionType('stopwatch');
    },
  });
  registerTaskContextMenu(api);
};

const unregisterViews = (api: OrgNoteApi): void => {
  const viewer = api.core.useBufferViewer();
  const commands = api.core.useCommands();
  const pinned = api.ui.usePinnedCommands();
  AGENDA_VIEWS.forEach((view) => {
    viewer.unregister(view.viewerId);
    const existing = commands.get(view.command);
    if (existing) commands.remove(existing);
    if (view.pinned) pinned.removeCommand('sidebar', view.command);
    if (view.sectionNavCommand) {
      pinned.removeCommand('sidebar-sections', view.sectionNavCommand);
      const navCmd = commands.get(view.sectionNavCommand);
      if (navCmd) commands.remove(navCmd);
      return;
    }
    if (view.sidebarSection) pinned.removeCommand('sidebar-sections', view.command);
  });
  [AGENDA_CREATE_TASK, AGENDA_QUICK_ADD_TO_FILE_COMMAND].forEach((commandName) => {
    const existing = commands.get(commandName);
    if (existing) commands.remove(existing);
  });
  agendaFilterCommands.forEach((cmd) => {
    const registered = commands.get(cmd.command!);
    if (registered) commands.remove(registered);
  });
};

export const orgAgendaExtension: Extension = {
  settingsSchema: agendaSettingsSchema,
  defaultSettings: defaultAgendaSettings,
  onMounted: async (api) => {
    registerViews(api);
    registerAgendaBufferFollow(api);
  },
  onUnmounted: async (api) => {
    disposeAgendaBufferFollow();
    unregisterViews(api);
  },
};

export { orgAgendaManifest } from './manifest';
export { resolveAgendaConfig, type AgendaConfig } from './agenda-config';
