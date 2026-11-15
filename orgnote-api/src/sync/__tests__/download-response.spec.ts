import { expect, test } from 'vitest';
import { hashBytes } from '../utils/content-hash';
import {
  InvalidSyncFileResponseError,
  validateSyncFileResponse,
} from '../download-response';
import { InvalidSyncResponseError } from '../invalid-response-error';
import type { RemoteFile } from '../types';

const remoteFile: RemoteFile = {
  path: '/notes/example.org',
  version: 2,
  deleted: false,
  updatedAt: '2026-07-23T20:54:43Z',
};

const createResponse = (data: unknown, contentHash?: string) => ({
  data,
  status: 200,
  headers: {
    'content-type': 'application/octet-stream',
    ...(contentHash ? { 'x-content-hash': contentHash } : {}),
  },
});

test('InvalidSyncFileResponseError exposes common sync response contract', () => {
  const error = new InvalidSyncFileResponseError({
    operation: 'syncFilesGet',
    path: remoteFile.path,
    reason: 'invalid_response',
    responseKind: 'object',
  });

  expect(error).toBeInstanceOf(InvalidSyncResponseError);
});

test('validateSyncFileResponse accepts browser ArrayBuffer data', async () => {
  const content = new TextEncoder().encode('remote org content');
  const contentHash = await hashBytes(content);

  const result = await validateSyncFileResponse(
    createResponse(content.buffer, contentHash),
    remoteFile,
  );

  expect(result).toEqual(content);
});

test('validateSyncFileResponse accepts Node typed array data', async () => {
  const content = Buffer.from('remote binary content');
  const contentHash = await hashBytes(new Uint8Array(content));

  const result = await validateSyncFileResponse(createResponse(content, contentHash), remoteFile);

  expect(result).toEqual(new Uint8Array(content));
});

test('validateSyncFileResponse accepts HTML files with matching hash', async () => {
  const content = new TextEncoder().encode(
    '<!doctype html><html><head><title>orgnote</title></head></html>',
  );
  const contentHash = await hashBytes(content);

  const result = await validateSyncFileResponse(
    createResponse(content.buffer, contentHash),
    remoteFile,
  );

  expect(result).toEqual(content);
});

test('validateSyncFileResponse rejects missing response content hash', async () => {
  const content = new TextEncoder().encode('remote content');

  await expect(
    validateSyncFileResponse(createResponse(content.buffer), remoteFile),
  ).rejects.toMatchObject({
    name: 'InvalidSyncFileResponseError',
    details: {
      reason: 'missing_content_hash',
      path: remoteFile.path,
    },
  });
});

test('validateSyncFileResponse rejects malformed response content hash', async () => {
  const content = new TextEncoder().encode('remote content');

  await expect(
    validateSyncFileResponse(createResponse(content.buffer, 'not-sha256'), remoteFile),
  ).rejects.toMatchObject({
    name: 'InvalidSyncFileResponseError',
    details: {
      reason: 'invalid_content_hash',
      actualHash: 'not-sha256',
    },
  });
});

test('validateSyncFileResponse rejects body hash mismatch', async () => {
  const content = new TextEncoder().encode('unexpected content');
  const actualHash = await hashBytes(content);

  await expect(
    validateSyncFileResponse(createResponse(content.buffer, '0'.repeat(64)), remoteFile),
  ).rejects.toMatchObject({
    name: 'InvalidSyncFileResponseError',
    details: {
      reason: 'content_hash_mismatch',
      expectedHash: '0'.repeat(64),
      actualHash,
    },
  });
});

test('validateSyncFileResponse accepts a newer response than the metadata snapshot', async () => {
  const content = new TextEncoder().encode('newer remote content');
  const responseHash = await hashBytes(content);

  const result = await validateSyncFileResponse(createResponse(content.buffer, responseHash), {
    ...remoteFile,
    contentHash: '0'.repeat(64),
  });

  expect(result).toEqual(content);
});

test('validateSyncFileResponse accepts matching metadata, response, and body hashes', async () => {
  const content = new TextEncoder().encode('verified content');
  const contentHash = await hashBytes(content);

  const result = await validateSyncFileResponse(createResponse(content.buffer, contentHash), {
    ...remoteFile,
    contentHash,
  });

  expect(result).toEqual(content);
});

test('validateSyncFileResponse rejects non-success status', async () => {
  const content = new Uint8Array();
  const response = { ...createResponse(content, await hashBytes(content)), status: 404 };

  await expect(validateSyncFileResponse(response, remoteFile)).rejects.toMatchObject({
    name: 'InvalidSyncFileResponseError',
    details: {
      reason: 'invalid_response',
      status: 404,
    },
  });
});

test('validateSyncFileResponse rejects non-binary response data', async () => {
  await expect(
    validateSyncFileResponse(createResponse('plain text', '0'.repeat(64)), remoteFile),
  ).rejects.toMatchObject({
    name: 'InvalidSyncFileResponseError',
    details: {
      reason: 'invalid_data',
      responseKind: 'text',
    },
  });
});
