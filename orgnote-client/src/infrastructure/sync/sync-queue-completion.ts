import type Queue from 'better-queue';

type TaskOutcome =
  | { status: 'finished' }
  | { status: 'failed'; error: unknown };

class SyncQueueTaskFailedError extends Error {
  constructor(taskId: string, cause: unknown) {
    super(`Sync queue task failed: ${taskId}`, { cause });
    this.name = 'SyncQueueTaskFailedError';
  }
}

class SyncQueueInsertionError extends Error {
  constructor(cause: unknown) {
    super('Failed to insert sync queue tasks', { cause });
    this.name = 'SyncQueueInsertionError';
  }
}

const createCompletionState = () => ({
  completion: Promise.withResolvers<void>(),
  outcomes: new Map<string, TaskOutcome>(),
  taskIds: null as Set<string> | null,
});

type CompletionState = ReturnType<typeof createCompletionState>;

interface TaskListeners {
  onTaskFinish: (taskId: string) => void;
  onTaskFailed: (taskId: string, error: unknown) => void;
}

const removeTaskListeners = (queue: Queue, listeners: TaskListeners): void => {
  queue.removeListener('task_finish', listeners.onTaskFinish);
  queue.removeListener('task_failed', listeners.onTaskFailed);
};

const rejectCompletion = (
  state: CompletionState,
  queue: Queue,
  listeners: TaskListeners,
  error: Error
): void => {
  removeTaskListeners(queue, listeners);
  state.completion.reject(error);
};

const settleCompletion = (
  state: CompletionState,
  queue: Queue,
  listeners: TaskListeners
): void => {
  if (!state.taskIds) return;
  const taskIds = [...state.taskIds];
  if (!taskIds.every((taskId) => state.outcomes.has(taskId))) return;

  const failedTaskId = taskIds.find(
    (taskId) => state.outcomes.get(taskId)?.status === 'failed'
  );
  if (failedTaskId) {
    const outcome = state.outcomes.get(failedTaskId);
    const cause = outcome?.status === 'failed' ? outcome.error : undefined;
    rejectCompletion(
      state,
      queue,
      listeners,
      new SyncQueueTaskFailedError(failedTaskId, cause)
    );
    return;
  }

  removeTaskListeners(queue, listeners);
  state.completion.resolve();
};

const createTaskListeners = (
  state: CompletionState,
  queue: Queue
): TaskListeners => {
  const listeners: TaskListeners = {
    onTaskFinish: (taskId) => {
      state.outcomes.set(taskId, { status: 'finished' });
      settleCompletion(state, queue, listeners);
    },
    onTaskFailed: (taskId, error) => {
      state.outcomes.set(taskId, { status: 'failed', error });
      settleCompletion(state, queue, listeners);
    },
  };
  return listeners;
};

export const waitForAddedTasks = (
  queue: Queue,
  addTasks: () => Promise<string[]>
): Promise<void> => {
  const state = createCompletionState();
  const listeners = createTaskListeners(state, queue);
  queue.on('task_finish', listeners.onTaskFinish);
  queue.on('task_failed', listeners.onTaskFailed);

  void addTasks()
    .then((taskIds) => {
      state.taskIds = new Set(taskIds);
      settleCompletion(state, queue, listeners);
    })
    .catch((error: unknown) =>
      rejectCompletion(
        state,
        queue,
        listeners,
        new SyncQueueInsertionError(error)
      )
    );
  return state.completion.promise;
};
