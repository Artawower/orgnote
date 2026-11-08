import type { HostToWorkerMessage, WorkerToHostMessage } from './worker-protocol';

export interface HostWorkerEndpoint {
  postMessage(message: HostToWorkerMessage, transfer?: Transferable[]): void;
  terminate(): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerToHostMessage>) => void
  ): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerToHostMessage>) => void
  ): void;
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
}

export interface WorkerRuntimeEndpoint {
  postMessage(message: WorkerToHostMessage, transfer?: Transferable[]): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<HostToWorkerMessage>) => void
  ): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<HostToWorkerMessage>) => void
  ): void;
}

export const getWorkerRuntimeEndpoint = (): WorkerRuntimeEndpoint =>
  globalThis as unknown as WorkerRuntimeEndpoint;
