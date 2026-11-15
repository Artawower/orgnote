import type { FileMeta, FileTask } from 'orgnote-api';
import { readonly, shallowRef } from 'vue';

type TaskPatch = Partial<FileTask>;

interface PendingPrediction {
  patch: TaskPatch;
  pending: number;
}

const patchTasks = (tasks: FileTask[], predictions: ReadonlyMap<string, PendingPrediction>) =>
  tasks.map((task) => {
    const prediction = predictions.get(task.id);
    return prediction ? { ...task, ...prediction.patch } : task;
  });

const hasPredictedTask = (file: FileMeta, predictions: ReadonlyMap<string, PendingPrediction>) =>
  !!file.tasks?.some((task) => predictions.has(task.id));

export const createTaskPredictions = () => {
  const predictions = shallowRef<ReadonlyMap<string, PendingPrediction>>(new Map());

  const release = (taskId: string): void => {
    const current = predictions.value.get(taskId);
    if (!current) return;
    const next = new Map(predictions.value);
    if (current.pending > 1) next.set(taskId, { ...current, pending: current.pending - 1 });
    else next.delete(taskId);
    predictions.value = next;
  };

  const predict = (taskId: string, patch: TaskPatch): (() => void) => {
    const pending = (predictions.value.get(taskId)?.pending ?? 0) + 1;
    predictions.value = new Map(predictions.value).set(taskId, { patch, pending });
    return () => release(taskId);
  };

  const apply = (files: FileMeta[]): FileMeta[] => {
    const current = predictions.value;
    if (current.size === 0) return files;
    return files.map((file) =>
      hasPredictedTask(file, current) ? { ...file, tasks: patchTasks(file.tasks ?? [], current) } : file,
    );
  };

  return { predictions: readonly(predictions), predict, apply };
};
