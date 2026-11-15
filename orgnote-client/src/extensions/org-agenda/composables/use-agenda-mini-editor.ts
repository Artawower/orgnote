import { api } from 'src/boot/api';
import AgendaMiniEditor from '../components/AgendaMiniEditor.vue';
import {
  useMiniEditorStore,
  buildEmptySession,
  setIosCarrier,
} from 'src/containers/MiniEditor/mini-editor-store';
import type { AgendaTaskView } from './use-agenda-tasks';
import type { AgendaTaskDraft } from '../types';
import type { CreateTaskInput } from 'orgnote-api/utils';
import { iosPwaOnly } from 'src/utils/platform-specific';
import { focusKeyboardCarrier } from 'src/utils/ios-keyboard-carrier';

const focusCarrier = iosPwaOnly((): void => {
  setIosCarrier(focusKeyboardCarrier());
});

export const useAgendaMiniEditor = () => {
  const modal = api.ui.useModal();
  const { tabletBelow } = api.ui.useScreenDetection();
  const store = useMiniEditorStore();

  const openCreate = async (
    defaults?: Partial<AgendaTaskDraft>,
  ): Promise<CreateTaskInput | null> => {
    if (!tabletBelow.value) return null;
    focusCarrier();
    store.$patch({ ...buildEmptySession(), ...defaults, tags: defaults?.tags ?? [] });
    const result = await modal.open<CreateTaskInput | null | undefined>(AgendaMiniEditor, {
      mini: true,
      position: 'bottom',
      noBodyPadding: true,
      modalProps: { mode: 'create' },
      modalEmits: {
        submit: (payload: CreateTaskInput) => modal.close(payload),
        close: () => modal.close(null),
      },
    });
    return result ?? null;
  };

  const openEdit = (task: AgendaTaskView, filePath: string): void => {
    if (!tabletBelow.value) return;
    focusCarrier();
    store.$patch({
      ...buildEmptySession(),
      title: task.text ?? '',
      priority: task.priority,
      tags: [...(task.tags ?? [])],
      scheduled: task.scheduled
        ? {
            date: task.scheduled.date,
            to: task.scheduled.to,
            repeater: task.scheduled.repeater,
            warning: task.scheduled.warning,
          }
        : undefined,
      isHabit: task.isHabit ?? false,
    });
    void modal.open(AgendaMiniEditor, {
      mini: true,
      position: 'bottom',
      noBodyPadding: true,
      modalProps: { mode: 'edit', task, filePath },
    });
  };

  return { openCreate, openEdit };
};
