import type { FileTaskKind } from 'orgnote-api';
import { textToUint8Array, to, uint8ArrayToText } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { toggleTaskInContent } from './task-toggle';
import type { TaskTreeNode } from './task-tree';

type FileContentStore = {
  read: (filePath: string) => Promise<Uint8Array>;
  write: (filePath: string, content: Uint8Array) => Promise<void>;
};

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

const readTaskContent = async (
  fileContent: FileContentStore,
  filePath: string,
): Promise<string | undefined> => {
  const readResult = await to(fileContent.read, 'Failed to read task file')(filePath);
  if (readResult.isErr()) {
    reporter.reportError(readResult.error);
    return undefined;
  }

  return uint8ArrayToText(readResult.value);
};

const buildToggledContent = (node: ToggleableTaskNode, content: string): string | undefined => {
  const nextContent = toggleTaskInContent(content, {
    taskKind: node.taskKind,
    start: node.start,
  });

  if (!nextContent) {
    reporter.reportWarning('Unable to toggle task in file content');
    return undefined;
  }

  return nextContent === content ? undefined : nextContent;
};

const persistTaskContent = async (
  fileContent: FileContentStore,
  filePath: string,
  content: string,
): Promise<boolean> => {
  const writeResult = await to(fileContent.write, 'Failed to write task file')(
    filePath,
    textToUint8Array(content),
  );

  if (writeResult.isErr()) {
    reporter.reportError(writeResult.error);
    return false;
  }

  return true;
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
    const content = await readTaskContent(deps.fileContent, node.filePath);

    if (content === undefined) {
      return;
    }

    const nextContent = buildToggledContent(node, content);

    if (!nextContent) {
      return;
    }

    const isPersisted = await persistTaskContent(deps.fileContent, node.filePath, nextContent);

    if (!isPersisted) {
      return;
    }

    await refreshTasksAfterUpdate(deps.fileSearch, deps.loadTasks, node.filePath);
  };

  return { run };
};
