import type { OrgNoteLogFields } from 'orgnote-api';
import { isNullable } from 'orgnote-api/utils';
import { isCoreRpcRequest, type CoreRpcRequest } from './core-rpc-contract';
import { hasOwn, isRecord } from './protocol-validation';

export const WORKER_MESSAGE_TYPE = {
  CALL: 'call',
  CANCEL: 'cancel',
  CORE_RESULT: 'core-result',
  CORE_FAILURE: 'core-failure',
  RESULT: 'result',
  FAILURE: 'failure',
  EVENT: 'event',
  CORE_CALL: 'core-call',
  LOG: 'log',
} as const;

export interface SerializedWorkerError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
}

export interface WorkerCallRequest {
  readonly type: typeof WORKER_MESSAGE_TYPE.CALL;
  readonly requestId: string;
  readonly method: string;
  readonly input: unknown;
}

export interface WorkerCancelRequest {
  readonly type: typeof WORKER_MESSAGE_TYPE.CANCEL;
  readonly requestId: string;
}

export interface WorkerCoreResult {
  readonly type: typeof WORKER_MESSAGE_TYPE.CORE_RESULT;
  readonly requestId: string;
  readonly value: unknown;
}

export interface WorkerCoreFailure {
  readonly type: typeof WORKER_MESSAGE_TYPE.CORE_FAILURE;
  readonly requestId: string;
  readonly error: SerializedWorkerError;
}

export type HostToWorkerMessage =
  | WorkerCallRequest
  | WorkerCancelRequest
  | WorkerCoreResult
  | WorkerCoreFailure;

export interface WorkerCallResult {
  readonly type: typeof WORKER_MESSAGE_TYPE.RESULT;
  readonly requestId: string;
  readonly value: unknown;
}

export interface WorkerCallFailure {
  readonly type: typeof WORKER_MESSAGE_TYPE.FAILURE;
  readonly requestId: string;
  readonly error: SerializedWorkerError;
}

export interface WorkerEventMessage {
  readonly type: typeof WORKER_MESSAGE_TYPE.EVENT;
  readonly event: string;
  readonly payload: unknown;
}

export type WorkerCoreCall = CoreRpcRequest & {
  readonly type: typeof WORKER_MESSAGE_TYPE.CORE_CALL;
  readonly requestId: string;
};

export interface WorkerLogMessage {
  readonly type: typeof WORKER_MESSAGE_TYPE.LOG;
  readonly level: 'info' | 'error' | 'warn' | 'debug';
  readonly message: string;
  readonly fields?: OrgNoteLogFields;
}

export type WorkerToHostMessage =
  | WorkerCallResult
  | WorkerCallFailure
  | WorkerEventMessage
  | WorkerCoreCall
  | WorkerLogMessage;

export const isSerializedWorkerError = (value: unknown): value is SerializedWorkerError =>
  isRecord(value) && typeof value.name === 'string' && typeof value.message === 'string';

const isLogLevel = (value: unknown): value is WorkerLogMessage['level'] =>
  value === 'info' || value === 'error' || value === 'warn' || value === 'debug';

const isLogValue = (value: unknown): boolean => {
  if (isNullable(value)) return value !== undefined;
  if (['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isLogValue);
  if (isRecord(value)) return Object.values(value).every(isLogValue);
  return false;
};

const isLogFields = (value: unknown): value is OrgNoteLogFields =>
  value === undefined || (isRecord(value) && Object.values(value).every(isLogValue));

export const isHostToWorkerMessage = (value: unknown): value is HostToWorkerMessage => {
  if (!isRecord(value)) return false;
  if (value.type === WORKER_MESSAGE_TYPE.CANCEL) return typeof value.requestId === 'string';
  if (value.type === WORKER_MESSAGE_TYPE.CALL) {
    return typeof value.requestId === 'string' &&
      typeof value.method === 'string' &&
      hasOwn(value, 'input');
  }
  if (value.type === WORKER_MESSAGE_TYPE.CORE_RESULT) {
    return typeof value.requestId === 'string' && hasOwn(value, 'value');
  }
  if (value.type !== WORKER_MESSAGE_TYPE.CORE_FAILURE) return false;
  return typeof value.requestId === 'string' && isSerializedWorkerError(value.error);
};

export const isWorkerToHostMessage = (value: unknown): value is WorkerToHostMessage => {
  if (!isRecord(value)) return false;
  if (value.type === WORKER_MESSAGE_TYPE.RESULT) {
    return typeof value.requestId === 'string' && hasOwn(value, 'value');
  }
  if (value.type === WORKER_MESSAGE_TYPE.FAILURE) {
    return typeof value.requestId === 'string' && isSerializedWorkerError(value.error);
  }
  if (value.type === WORKER_MESSAGE_TYPE.EVENT) {
    return typeof value.event === 'string' && hasOwn(value, 'payload');
  }
  if (value.type === WORKER_MESSAGE_TYPE.LOG) {
    return isLogLevel(value.level) &&
      typeof value.message === 'string' &&
      isLogFields(value.fields);
  }
  if (value.type !== WORKER_MESSAGE_TYPE.CORE_CALL) return false;
  return typeof value.requestId === 'string' && isCoreRpcRequest(value);
};

export const serializeWorkerError = (value: unknown): SerializedWorkerError => {
  if (!(value instanceof Error)) {
    return { name: 'Error', message: String(value) };
  }
  return {
    name: value.name,
    message: value.message,
    ...(value.stack ? { stack: value.stack } : {}),
  };
};
