import {
  isSerializedWorkerError,
  type SerializedWorkerError,
} from 'src/workers/worker-protocol';
import { isRecord } from 'src/workers/protocol-validation';

export const EXTENSION_WORKER_MESSAGE_TYPE = {
  INIT: 'orgnote-worker-init',
  READY: 'orgnote-worker-ready',
  INIT_FAILURE: 'orgnote-worker-init-failure',
} as const;

export interface ExtensionWorkerInitRequest {
  readonly type: typeof EXTENSION_WORKER_MESSAGE_TYPE.INIT;
  readonly moduleUrl: string;
}

export interface ExtensionWorkerReady {
  readonly type: typeof EXTENSION_WORKER_MESSAGE_TYPE.READY;
}

export interface ExtensionWorkerInitFailure {
  readonly type: typeof EXTENSION_WORKER_MESSAGE_TYPE.INIT_FAILURE;
  readonly error: SerializedWorkerError;
}

export type ExtensionWorkerInitResult =
  | ExtensionWorkerReady
  | ExtensionWorkerInitFailure;

export interface ExtensionWorkerInitEndpoint {
  postMessage(message: ExtensionWorkerInitResult): void;
}

export const getExtensionWorkerInitEndpoint = (): ExtensionWorkerInitEndpoint =>
  globalThis as unknown as ExtensionWorkerInitEndpoint;

export const isExtensionWorkerInitRequest = (
  value: unknown,
): value is ExtensionWorkerInitRequest =>
  isRecord(value) &&
  value.type === EXTENSION_WORKER_MESSAGE_TYPE.INIT &&
  typeof value.moduleUrl === 'string';

export const isExtensionWorkerInitResult = (
  value: unknown,
): value is ExtensionWorkerInitResult => {
  if (!isRecord(value)) return false;
  if (value.type === EXTENSION_WORKER_MESSAGE_TYPE.READY) return true;
  return value.type === EXTENSION_WORKER_MESSAGE_TYPE.INIT_FAILURE &&
    isSerializedWorkerError(value.error);
};
