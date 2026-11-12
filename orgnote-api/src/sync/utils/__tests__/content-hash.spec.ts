import { expect, test } from 'vitest';
import { hashBytes, hashContent } from '../content-hash';

const toBytes = (value: string): Uint8Array => new TextEncoder().encode(value);

test('hashContent returns deterministic SHA-256 digest', async () => {
  const digest = await hashContent(toBytes('abc'));

  expect(digest).toMatchInlineSnapshot(
    '"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"'
  );
  expect(digest).toMatch(/^[0-9a-f]{64}$/);
});

test('hashContent returns the same digest for the same content', async () => {
  const content = toBytes('orgnote');

  const first = await hashContent(content);
  const second = await hashContent(content);

  expect(first).toBe(second);
});

test('hashContent returns different digests for different content', async () => {
  const first = await hashContent(toBytes('orgnote-a'));
  const second = await hashContent(toBytes('orgnote-b'));

  expect(first).not.toBe(second);
});

test('hashBytes is an alias of hashContent', async () => {
  const content = toBytes('alias-check');

  const first = await hashContent(content);
  const second = await hashBytes(content);

  expect(first).toBe(second);
});

test('hashContent handles long text deterministically', async () => {
  const content = toBytes('orgnote-long-text-'.repeat(2000));

  const first = await hashContent(content);
  const second = await hashContent(content);

  expect(first).toBe(second);
  expect(first).toMatch(/^[0-9a-f]{64}$/);
});

test('hashContent handles binary bytes', async () => {
  const bytes = new Uint8Array([0, 255, 1, 128, 64, 32, 16, 8, 4, 2, 1, 0]);

  const digest = await hashContent(bytes);

  expect(digest).toMatchInlineSnapshot(
    '"c7e3c80490776a8af2e44e522fd67583434ab733dfa0488f535ebe6db5bd7f34"'
  );
  expect(digest).toMatch(/^[0-9a-f]{64}$/);
});

test('hashContent handles SharedArrayBuffer-backed subviews', async () => {
  const bytes = new Uint8Array(new SharedArrayBuffer(5), 1, 3);
  bytes.set(toBytes('abc'));

  const digest = await hashContent(bytes);

  expect(digest).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
