import { textToUint8Array, to, uint8ArrayToText } from 'orgnote-api/utils';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { changeTaskTitle } from '../mutations/task-title';
import { changeTaskPriority } from '../mutations/task-priority';
import { changeTaskTags } from '../mutations/task-tags';
import { changeTaskScheduled } from '../mutations/task-scheduled';
import { changeTaskBody } from '../mutations/task-body';
import type { AgendaTaskView } from './use-agenda-tasks';
import type { AgendaTaskDraft } from '../types';

export const useAgendaTaskEdit = () => {
  const fileContent = api.core.useFileContent();

  const applyMutation = async (
    task: AgendaTaskView,
    filePath: string,
    mutateFn: (c: string) => string,
  ): Promise<void> => {
    if (task.start === undefined) return;
    const readResult = await to(fileContent.read, 'Failed to read file')(filePath);
    if (readResult.isErr()) {
      reporter.reportError(readResult.error);
      return;
    }
    const original = uint8ArrayToText(readResult.value);
    const next = mutateFn(original);
    if (next === original) return;
    const writeResult = await to(fileContent.write, 'Failed to write file')(
      filePath,
      textToUint8Array(next),
    );
    if (writeResult.isErr()) reporter.reportError(writeResult.error);
  };

  const saveTask = async (
    task: AgendaTaskView,
    filePath: string,
    draft: AgendaTaskDraft,
  ): Promise<void> => {
    if (task.start === undefined) return;
    const mutations: Array<(c: string) => string> = [];

    if (draft.title && draft.title !== task.text)
      mutations.push((c) => changeTaskTitle(c, task.start!, draft.title));
    if (draft.priority !== task.priority)
      mutations.push((c) => changeTaskPriority(c, task.start!, draft.priority));
    const draftTags = draft.tags ?? [];
    if (JSON.stringify(draftTags) !== JSON.stringify(task.tags ?? []))
      mutations.push((c) => changeTaskTags(c, task.start!, draftTags));
    if (JSON.stringify(draft.scheduled) !== JSON.stringify(task.scheduled))
      mutations.push((c) => changeTaskScheduled(c, task.start!, draft.scheduled));
    mutations.push((c) => changeTaskBody(c, task.start!, draft.body));

    if (!mutations.length) return;
    await applyMutation(task, filePath, (c) => mutations.reduce((acc, fn) => fn(acc), c));
  };

  return { applyMutation, saveTask };
};
