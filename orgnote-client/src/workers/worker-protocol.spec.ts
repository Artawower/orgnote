import { expect, test } from 'vitest';
import { CORE_RPC_OPERATION } from './core-rpc-contract';
import {
  isHostToWorkerMessage,
  isWorkerToHostMessage,
  WORKER_MESSAGE_TYPE,
} from './worker-protocol';

test('worker protocol accepts complete call envelopes', () => {
  expect(isHostToWorkerMessage({
    type: WORKER_MESSAGE_TYPE.CALL,
    requestId: 'call:1',
    method: 'index',
    input: undefined,
  })).toBe(true);
});

test('worker protocol rejects incomplete call envelopes', () => {
  expect(isHostToWorkerMessage({
    type: WORKER_MESSAGE_TYPE.CALL,
    requestId: 'call:1',
    method: 'index',
  })).toBe(false);
});

test('worker protocol validates Core RPC payloads', () => {
  expect(isWorkerToHostMessage({
    type: WORKER_MESSAGE_TYPE.CORE_CALL,
    requestId: 'core:1',
    operation: CORE_RPC_OPERATION.READ_DIR,
    input: { path: '/notes' },
  })).toBe(true);
  expect(isWorkerToHostMessage({
    type: WORKER_MESSAGE_TYPE.CORE_CALL,
    requestId: 'core:2',
    operation: CORE_RPC_OPERATION.READ_DIR,
    input: ['/notes'],
  })).toBe(false);
});

test('worker protocol validates serialized failures', () => {
  expect(isWorkerToHostMessage({
    type: WORKER_MESSAGE_TYPE.FAILURE,
    requestId: 'call:1',
    error: { name: 'TypeError', message: 'failed' },
  })).toBe(true);
  expect(isWorkerToHostMessage({
    type: WORKER_MESSAGE_TYPE.FAILURE,
    requestId: 'call:1',
    error: { message: 'failed' },
  })).toBe(false);
});
