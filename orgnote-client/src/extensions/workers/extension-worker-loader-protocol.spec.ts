import { expect, test } from 'vitest';
import {
  EXTENSION_WORKER_MESSAGE_TYPE,
  isExtensionWorkerInitRequest,
  isExtensionWorkerInitResult,
} from './extension-worker-loader-protocol';

test('extension worker protocol validates initialization request', () => {
  expect(isExtensionWorkerInitRequest({
    type: EXTENSION_WORKER_MESSAGE_TYPE.INIT,
    moduleUrl: 'blob:https://example.com/worker',
  })).toBe(true);
  expect(isExtensionWorkerInitRequest({
    type: EXTENSION_WORKER_MESSAGE_TYPE.INIT,
  })).toBe(false);
});

test('extension worker protocol validates initialization failure', () => {
  expect(isExtensionWorkerInitResult({
    type: EXTENSION_WORKER_MESSAGE_TYPE.INIT_FAILURE,
    error: { name: 'TypeError', message: 'failed' },
  })).toBe(true);
  expect(isExtensionWorkerInitResult({
    type: EXTENSION_WORKER_MESSAGE_TYPE.INIT_FAILURE,
    error: {},
  })).toBe(false);
});
