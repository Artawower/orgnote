import { expect, test } from 'vitest';
import {
  CORE_RPC_OPERATION,
  isCoreRpcRequest,
} from './core-rpc-contract';

test('Core RPC accepts named filesystem inputs', () => {
  expect(isCoreRpcRequest({
    operation: CORE_RPC_OPERATION.READ_FILE,
    input: { path: '/notes/a.org', encoding: 'utf8' },
  })).toBe(true);
  expect(isCoreRpcRequest({
    operation: CORE_RPC_OPERATION.WRITE_FILE,
    input: { path: ['notes', 'a.org'], content: new Uint8Array([1]) },
  })).toBe(true);
});

test('Core RPC rejects missing and positional filesystem inputs', () => {
  expect(isCoreRpcRequest({
    operation: CORE_RPC_OPERATION.READ_FILE,
    input: ['/notes/a.org', 'utf8'],
  })).toBe(false);
  expect(isCoreRpcRequest({
    operation: CORE_RPC_OPERATION.WRITE_FILE,
    input: { path: '/notes/a.org' },
  })).toBe(false);
});

test('Core RPC rejects unknown operations and invalid encodings', () => {
  expect(isCoreRpcRequest({ operation: 'files.unknown', input: {} })).toBe(false);
  expect(isCoreRpcRequest({
    operation: CORE_RPC_OPERATION.READ_FILE,
    input: { path: '/notes/a.org', encoding: 'json' },
  })).toBe(false);
});
