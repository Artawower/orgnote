import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands, I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import { defineAsyncComponent } from 'vue';
import { uploadFile } from 'src/utils/file-upload';

import { getHostRelatedPath } from 'src/utils/get-host-related-path';
import { selectCommand } from 'src/utils/select-command';
import { clearAllMeasurements } from 'src/boot/perf-timer';

export function getDeveloperCommands(): Command[] {
  const openQueueManager = () => {
    const modal = api.ui.useModal();
    modal.open(
      defineAsyncComponent(() => import('src/containers/QueueManager.vue')),
      {
        title: 'Queue Manager',
        closable: true,
        wide: true,
      },
    );
  };

  const openCronManager = () => {
    const modal = api.ui.useModal();
    modal.open(
      defineAsyncComponent(() => import('src/containers/CronManager.vue')),
      {
        title: 'Cron Manager',
        closable: true,
        wide: true,
      },
    );
  };

  const commands: Command[] = [
    {
      command: DefaultCommands.OPEN_QUEUE_MANAGER,
      handler: openQueueManager,
      hide: (api: OrgNoteApi) => {
        const config = api.core.useConfig();
        return !config.config.developer.developerMode;
      },
      icon: 'sym_o_queue',
      group: 'developer',
    },

    {
      command: DefaultCommands.RESTART_QUEUE,
      group: 'developer',
      icon: 'sym_o_play_arrow',
      description: 'Restart (resume) queue processing',
      handler: (
        api,
        params: CommandHandlerParams<{
          queueId?: string;
        }>,
      ) => {
        const queueId = params?.queueId as string | undefined;
        api.core.useQueue().resume(queueId ?? 'default');
        api.ui.useModal().close();
      },
    },
    {
      command: DefaultCommands.STOP_QUEUE,
      group: 'developer',
      icon: 'sym_o_pause',
      description: 'Stop (pause) queue processing',
      handler: (
        api,
        params: CommandHandlerParams<{
          queueId?: string;
        }>,
      ) => {
        const queueId = params?.queueId as string | undefined;
        api.core.useQueue().pause(queueId ?? 'default');
        api.ui.useModal().close();
      },
    },
    {
      command: DefaultCommands.CLEAR_QUEUE,
      group: 'developer',
      icon: 'sym_o_delete_sweep',
      description: 'Clear all tasks from queue',
      handler: async (
        api,
        params: CommandHandlerParams<{
          queueId?: string;
        }>,
      ) => {
        const queueId = params?.queueId as string | undefined;
        await api.core.useQueue().clear(queueId ?? 'default');
        api.ui.useModal().close();
      },
    },
    {
      command: DefaultCommands.OPEN_CRON,
      handler: openCronManager,
      hide: (api: OrgNoteApi) => {
        const config = api.core.useConfig();
        return !config.config.developer.developerMode;
      },
      icon: 'sym_o_schedule',
      group: 'developer',
    },
    {
      command: DefaultCommands.CLEAR_OLD_QUEUE_TASKS,
      handler: async (api: OrgNoteApi) => {
        const queueRepository = api.infrastructure.queueRepository;
        const tasks = await queueRepository.getAll();
        const m = api.core.useConfig().config.developer.storeQueueTasksMinutes;

        const cutoffTime = Date.now() - m * 60 * 1000;
        const oldQueueTasks = tasks.filter((t) => (t.added ?? 0) < cutoffTime);

        if (!oldQueueTasks.length) {
          return;
        }

        await Promise.all(oldQueueTasks.map((t) => queueRepository.delete(t.id, true)));

        api.utils.logger.info(`Cleared ${oldQueueTasks.length} old queue tasks.`);
      },
      hide: (api: OrgNoteApi) => {
        const config = api.core.useConfig();
        return !config.config.developer.developerMode;
      },
      icon: 'sym_o_schedule',
      group: 'developer',
    },
    {
      command: DefaultCommands.IMPORT_EXTENSION,
      handler: async (api: OrgNoteApi) => {
        const file = await uploadFile({ accept: '.js' });
        if (!file) {
          return;
        }
        await api.core.useExtensions().importExtension(file);
      },
      hide: (api: OrgNoteApi) => {
        const config = api.core.useConfig();
        return !config.config.developer.developerMode;
      },
      icon: 'sym_o_upload',
      group: 'developer',
    },
    {
      command: DefaultCommands.COPY_COMMAND_URL,
      handler: async (api: OrgNoteApi) => {
        const command = await selectCommand(api, I18N.SELECT_COMMAND_TO_COPY_URL);

        if (!command) {
          return;
        }

        const searchParams = new URLSearchParams();
        searchParams.set('execute', JSON.stringify({ command: command.command }));
        const url = getHostRelatedPath(`?${searchParams.toString()}`);

        await api.utils.copyToClipboard(url);
        api.core.useNotifications().notify({
          message: I18N.COPIED_TO_CLIPBOARD,
          level: 'info',
        });
      },
      icon: 'sym_o_link',
      hide: (api: OrgNoteApi) => {
        const config = api.core.useConfig();
        return !config.config.developer.developerMode;
      },
    },
    {
      command: DefaultCommands.SHOW_PERFORMANCE_REPORT,
      title: I18N.SHOW_PERFORMANCE_REPORT,
      description: I18N.SHOW_PERFORMANCE_REPORT_DESCRIPTION,
      icon: 'sym_o_speed',
      group: 'developer',
      hide: (api: OrgNoteApi) => !api.core.useConfig().config.developer.developerMode,
      handler: async (api: OrgNoteApi) => {
        const modal = api.ui.useModal();
        modal.open(
          defineAsyncComponent(() => import('src/containers/PerformanceReportContainer.vue')),
          { title: I18N.SHOW_PERFORMANCE_REPORT, closable: true },
        );
      },
    },
    {
      command: DefaultCommands.CLEAR_PERFORMANCE_REPORT,
      title: I18N.CLEAR_PERFORMANCE_REPORT,
      description: I18N.CLEAR_PERFORMANCE_REPORT_DESCRIPTION,
      icon: 'sym_o_delete_sweep',
      group: 'developer',
      hide: (api: OrgNoteApi) => !api.core.useConfig().config.developer.developerMode,
      handler: async (api: OrgNoteApi) => {
        clearAllMeasurements();
        api.core.useNotifications().notify({
          message: I18N.CLEAR_PERFORMANCE_REPORT,
          level: 'info',
        });
      },
    },
    {
      command: 'seed-demo-notes',
      title: 'Seed demo notes',
      description: 'Generate 600 seeded notes with tags, links, and varied org content',
      icon: 'sym_o_hub',
      group: 'developer',
      hide: (api: OrgNoteApi) => !api.core.useConfig().config.developer.developerMode,
      handler: async (api: OrgNoteApi) => {
        const { seedDemoNotes } = await import('src/commands/seed-demo-notes');
        await seedDemoNotes(api);
        api.core.useNotifications().notify({ message: 'Demo notes seeded', level: 'info' });
      },
    },
    {
      command: 'seed-agenda-todos',
      title: 'Seed agenda TODO files',
      description: 'Generate 100 TODO files + habit files in agenda/debug/ for completion testing',
      icon: 'sym_o_add_task',
      group: 'developer',
      hide: (api: OrgNoteApi) => !api.core.useConfig().config.developer.developerMode,
      handler: async (api: OrgNoteApi) => {
        const { seedAgendaTodos } = await import('src/commands/seed-agenda-todos');
        await seedAgendaTodos(api);
        api.core.useNotifications().notify({
          message: 'Agenda TODO files seeded in agenda/debug/',
          level: 'info',
        });
      },
    },
  ];

  return commands;
}
