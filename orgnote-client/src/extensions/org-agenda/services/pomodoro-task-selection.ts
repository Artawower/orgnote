import { api } from 'src/boot/api';
import { i18n } from 'src/boot/i18n';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { useAgendaTasksStore } from '../stores/agenda-tasks-store';
import type { AgendaTask } from '../types';

export const openPomodoroTaskCompletion = async (): Promise<AgendaTask | null> => {
  const store = useAgendaTasksStore();
  const tasks = store.allFiles.flatMap((file) =>
    (file.tasks ?? [])
      .filter((task) => task.kind !== 'list-checkbox' && task.state !== 'done')
      .map((task) => ({ ...task, filePath: file.filePath.join('/') })),
  );
  const completion = api.core.useCompletion();
  return completion.open({
    type: 'choice',
    placeholder: i18n.global.t(i18nKeys.orgAgendaPomodoroSelectTask),
    itemsGetter: async (search: string) => {
      const filtered = search
        ? tasks.filter((task) => task.text.toLowerCase().includes(search.toLowerCase()))
        : tasks;
      return {
        total: filtered.length,
        result: filtered.map((task) => ({
          icon: 'sym_o_task_alt',
          title: task.text,
          description: task.filePath,
          data: task,
          commandHandler: (selectedTask: typeof task) => completion.close(selectedTask),
        })),
      };
    },
  });
};
