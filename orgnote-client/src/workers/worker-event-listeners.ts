import { to } from 'orgnote-api/utils';

type WorkerEventListener = (payload: unknown) => void;
type WorkerEventErrorReporter = (event: string, error: Error) => void;

export interface WorkerEventListeners {
  subscribe(event: string, listener: WorkerEventListener): () => void;
  emit(event: string, payload: unknown): void;
  clear(): void;
}

export const createWorkerEventListeners = (
  reportError: WorkerEventErrorReporter,
): WorkerEventListeners => {
  const listeners = new Map<string, Set<WorkerEventListener>>();

  const notify = async (
    event: string,
    listener: WorkerEventListener,
    payload: unknown,
  ): Promise<void> => {
    const result = await to(() => Promise.resolve(listener(payload)))();
    if (result.isErr()) reportError(event, result.error);
  };

  const subscribe = (event: string, listener: WorkerEventListener): (() => void) => {
    const eventListeners = listeners.get(event) ?? new Set<WorkerEventListener>();
    eventListeners.add(listener);
    listeners.set(event, eventListeners);
    return () => eventListeners.delete(listener);
  };

  const emit = (event: string, payload: unknown): void => {
    listeners.get(event)?.forEach((listener) => {
      void notify(event, listener, payload);
    });
  };

  return { subscribe, emit, clear: () => listeners.clear() };
};
