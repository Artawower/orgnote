import type { FileContent, FileTask, FileTaskKind } from 'orgnote-api';
import { isTaskLineAt, to, updateFileText } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { toggleTaskInContent } from './task-toggle';
import type { TaskTreeNode } from './task-tree';

type FileContentStore = Pick<FileContent, 'update'>;

export interface ToggleableTaskNode extends TaskTreeNode {
  kind: 'task';
  filePath: string;
  taskKind: FileTaskKind;
  start: number;
}

interface TaskToggleRunnerDeps {
  fileContent: FileContentStore;
  loadTasks: () => Promise<void>;
  predict?: (taskId: string, patch: Partial<FileTask>) => () => void;
}

const TASK_MOVED_WARNING = 'Task changed before it could be toggled';

const toggleTask =
  (node: ToggleableTaskNode) =>
  (content: string): string => {
    if (!isTaskLineAt(content, node.start, node.label)) {
      reporter.reportWarning(TASK_MOVED_WARNING);
      return content;
    }
    const nextContent = toggleTaskInContent(content, {
      taskKind: node.taskKind,
      start: node.start,
    });
    if (nextContent) return nextContent;
    reporter.reportWarning('Unable to toggle task in file content');
    return content;
  };

const persistToggledTask = async (
  fileContent: FileContentStore,
  node: ToggleableTaskNode,
): Promise<boolean> => {
  const updateResult = await to(updateFileText, 'Failed to update task file')(
    fileContent,
    node.filePath,
    toggleTask(node),
  );
  if (updateResult.isErr()) {
    reporter.reportError(updateResult.error);
    return false;
  }
  return updateResult.value;
};

export const createTaskToggleRunner = (deps: TaskToggleRunnerDeps) => {
  const predictToggle = (node: ToggleableTaskNode): (() => void) | undefined =>
    deps.predict?.(node.id, { state: node.taskState === 'done' ? 'todo' : 'done' });

  const run = async (node: ToggleableTaskNode): Promise<void> => {
    const releasePrediction = predictToggle(node);
    const isPersisted = await persistToggledTask(deps.fileContent, node);
    if (isPersisted) await deps.loadTasks();
    releasePrediction?.();
  };

  return { run };
};
