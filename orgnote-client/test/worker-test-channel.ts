import type {
  HostWorkerEndpoint,
  WorkerRuntimeEndpoint,
} from 'src/workers/worker-endpoint';
import type {
  HostToWorkerMessage,
  WorkerToHostMessage,
} from 'src/workers/worker-protocol';

type HostMessageListener = (event: MessageEvent<WorkerToHostMessage>) => void;
type WorkerMessageListener = (event: MessageEvent<HostToWorkerMessage>) => void;
type WorkerErrorListener = (event: ErrorEvent) => void;

export interface WorkerTestChannel {
  readonly host: HostWorkerEndpoint;
  readonly worker: WorkerRuntimeEndpoint;
  readonly hostTransfers: Transferable[][];
  readonly workerTransfers: Transferable[][];
  readonly isTerminated: () => boolean;
}

export const createWorkerTestChannel = (): WorkerTestChannel => {
  const hostMessageListeners = new Set<HostMessageListener>();
  const workerMessageListeners = new Set<WorkerMessageListener>();
  const errorListeners = new Set<WorkerErrorListener>();
  const hostTransfers: Transferable[][] = [];
  const workerTransfers: Transferable[][] = [];
  let isTerminated = false;

  const host: HostWorkerEndpoint = {
    postMessage: (message, transfer = []) => {
      hostTransfers.push(transfer);
      if (isTerminated) return;
      queueMicrotask(() =>
        workerMessageListeners.forEach((listener) => listener(new MessageEvent('message', {
          data: message,
        }))),
      );
    },
    terminate: () => {
      isTerminated = true;
    },
    addEventListener: (type: 'message' | 'error', listener: HostMessageListener | WorkerErrorListener) => {
      if (type === 'message') hostMessageListeners.add(listener as HostMessageListener);
      if (type === 'error') errorListeners.add(listener as WorkerErrorListener);
    },
    removeEventListener: (
      type: 'message' | 'error',
      listener: HostMessageListener | WorkerErrorListener,
    ) => {
      if (type === 'message') hostMessageListeners.delete(listener as HostMessageListener);
      if (type === 'error') errorListeners.delete(listener as WorkerErrorListener);
    },
  };

  const worker: WorkerRuntimeEndpoint = {
    postMessage: (message, transfer = []) => {
      workerTransfers.push(transfer);
      if (isTerminated) return;
      queueMicrotask(() =>
        hostMessageListeners.forEach((listener) => listener(new MessageEvent('message', {
          data: message,
        }))),
      );
    },
    addEventListener: (_type, listener) => workerMessageListeners.add(listener),
    removeEventListener: (_type, listener) => workerMessageListeners.delete(listener),
  };

  return {
    host,
    worker,
    hostTransfers,
    workerTransfers,
    isTerminated: () => isTerminated,
  };
};
