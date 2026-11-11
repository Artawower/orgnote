import type { FileContent, FileTaskKind } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { updateFileText } from 'src/utils/update-file-text';
import { reporter } from 'src/boot/report';
import { toggleTaskInContent } from './task-toggle';
import type { TaskTreeNode } from './task-tree';

type FileContentStore = Pick<FileContent, 'update'>;

type FileSearchStore = {
  processFile: (filePath: string) => Promise<void>;
};

export interface ToggleableTaskNode extends TaskTreeNode {
  kind: 'task';
  filePath: string;
  taskKind: FileTaskKind;
  start: number;
}

interface TaskToggleRunnerDeps {
  fileContent: FileContentStore;
  fileSearch: FileSearchStore;
  loadTasks: () => Promise<void>;
}

const toggleTask =
  (node: ToggleableTaskNode) =>
  (content: string): string => {
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

const refreshTasksAfterUpdate = async (
  fileSearch: FileSearchStore,
  loadTasks: () => Promise<void>,
  filePath: string,
): Promise<void> => {
  const refreshResult = await to(fileSearch.processFile, 'Failed to refresh task index')(filePath);

  if (refreshResult.isErr()) {
    reporter.reportError(refreshResult.error);
    return;
  }

  await loadTasks();
};

export const createTaskToggleRunner = (deps: TaskToggleRunnerDeps) => {
  const run = async (node: ToggleableTaskNode): Promise<void> => {
    const isPersisted = await persistToggledTask(deps.fileContent, node);
    if (!isPersisted) return;
    await refreshTasksAfterUpdate(deps.fileSearch, deps.loadTasks, node.filePath);
  };

  return { run };
};
