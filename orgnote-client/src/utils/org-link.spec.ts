import { test, expect, vi } from 'vitest';
import {
  isInternalLink,
  extractInternalId,
  resolveInternalNoteUri,
  isRelativeFileLink,
  resolveRelativeOrgFilePath,
  extractOrgLinkTarget,
  normalizeOrgResourcePath,
  isExternalResourceLink,
  buildContextualBufferUri,
  resolveRemoteResourceUrl,
  resolveBufferSchemeFromRouteName,
} from './org-link';
import { RouteNames } from 'orgnote-api';

test('org-link isInternalLink returns true for id: prefixed links', () => {
  expect(isInternalLink('id:abc-123')).toBe(true);
});

test('org-link isInternalLink returns true for id: with uuid', () => {
  expect(isInternalLink('id:550e8400-e29b-41d4-a716-446655440000')).toBe(true);
});

test('org-link isInternalLink returns false for http links', () => {
  expect(isInternalLink('https://example.com')).toBe(false);
});

test('org-link isInternalLink returns false for file links', () => {
  expect(isInternalLink('file:///path/to/file.org')).toBe(false);
});

test('org-link isInternalLink returns false for empty string', () => {
  expect(isInternalLink('')).toBe(false);
});

test('org-link isInternalLink returns false for plain text', () => {
  expect(isInternalLink('some random text')).toBe(false);
});

test('org-link extractOrgLinkTarget extracts target from bracketed link', () => {
  expect(extractOrgLinkTarget('[[./simple-note.org][Simple link]]')).toBe('./simple-note.org');
});

test('org-link normalizeOrgResourcePath strips file: prefix', () => {
  expect(normalizeOrgResourcePath('file:/docs/img.png')).toBe('/docs/img.png');
});

test('org-link normalizeOrgResourcePath strips attachment: prefix', () => {
  expect(normalizeOrgResourcePath('attachment:./img.png')).toBe('./img.png');
});

test('org-link isExternalResourceLink returns true for https url', () => {
  expect(isExternalResourceLink('https://example.com/img.png')).toBe(true);
});

test('org-link isExternalResourceLink returns true for uppercase scheme', () => {
  expect(isExternalResourceLink('HTTPS://example.com/img.png')).toBe(true);
});

test('org-link isExternalResourceLink returns false for relative path', () => {
  expect(isExternalResourceLink('./img.png')).toBe(false);
});

test('org-link isRelativeFileLink returns true for ./ prefixed link', () => {
  expect(isRelativeFileLink('./simple-note.org')).toBe(true);
});

test('org-link isRelativeFileLink returns true for ../ prefixed link', () => {
  expect(isRelativeFileLink('../simple-note.org')).toBe(true);
});

test('org-link isRelativeFileLink returns true for deep relative ../../../ link', () => {
  expect(isRelativeFileLink('../../../simple-note.org')).toBe(true);
});

test('org-link isRelativeFileLink returns true for / prefixed link', () => {
  expect(isRelativeFileLink('/docs/simple-note.org')).toBe(true);
});

test('org-link isRelativeFileLink returns false for id: link', () => {
  expect(isRelativeFileLink('id:abc-123')).toBe(false);
});

test('org-link isRelativeFileLink returns false for external URL', () => {
  expect(isRelativeFileLink('https://example.com')).toBe(false);
});

test('org-link resolveRelativeOrgFilePath resolves ./ path against current file directory', () => {
  const resolved = resolveRelativeOrgFilePath('./simple-note.org', '/docs/info.org');
  expect(resolved).toBe('/docs/simple-note.org');
});

test('org-link resolveRelativeOrgFilePath resolves ../ path against current file directory', () => {
  const resolved = resolveRelativeOrgFilePath('../simple-note.org', '/docs/guide/info.org');
  expect(resolved).toBe('/docs/simple-note.org');
});

test('org-link resolveRelativeOrgFilePath keeps absolute paths absolute', () => {
  const resolved = resolveRelativeOrgFilePath('/docs/simple-note.org', '/docs/info.org');
  expect(resolved).toBe('/docs/simple-note.org');
});

test('org-link resolveRelativeOrgFilePath strips org location suffix', () => {
  const resolved = resolveRelativeOrgFilePath('./simple-note.org::Target', '/docs/info.org');
  expect(resolved).toBe('/docs/simple-note.org');
});

test('org-link resolveRelativeOrgFilePath resolves plain filename against current file directory', () => {
  const resolved = resolveRelativeOrgFilePath('img.png', '/docs/info.org');
  expect(resolved).toBe('/docs/img.png');
});

test('org-link buildContextualBufferUri builds remote URI from relative path', () => {
  const uri = buildContextualBufferUri('./simple-note.org', {
    scheme: 'remote',
    currentFilePath: '/docs/info.org',
  });
  expect(uri).toBe('remote:///docs/simple-note.org');
});

test('org-link resolveRemoteResourceUrl resolves relative image path to host URL', () => {
  const url = resolveRemoteResourceUrl('./images/photo.png', '/docs/info.org');
  expect(url).toMatch(/\/docs\/images\/photo\.png$/);
});

test('org-link resolveBufferSchemeFromRouteName maps known route names', () => {
  expect(resolveBufferSchemeFromRouteName(RouteNames.Remote)).toBe('remote');
  expect(resolveBufferSchemeFromRouteName(RouteNames.File)).toBe('file');
});

test('org-link resolveBufferSchemeFromRouteName falls back to file', () => {
  expect(resolveBufferSchemeFromRouteName('UnknownRoute')).toBe('file');
});

test('org-link extractInternalId extracts id from id: link', () => {
  expect(extractInternalId('id:abc-123')).toBe('abc-123');
});

test('org-link extractInternalId extracts uuid from id: link', () => {
  expect(extractInternalId('id:550e8400-e29b-41d4-a716-446655440000')).toBe(
    '550e8400-e29b-41d4-a716-446655440000',
  );
});

test('org-link extractInternalId returns empty string for non-id link', () => {
  expect(extractInternalId('https://example.com')).toBe('');
});

test('org-link extractInternalId returns empty string for empty input', () => {
  expect(extractInternalId('')).toBe('');
});

test('org-link resolveInternalNoteUri resolves note id to buffer URI via file path', async () => {
  const getFileMeta = vi.fn().mockResolvedValue({ filePath: ['notes', 'my-note.org'] });
  const result = await resolveInternalNoteUri('abc-123', getFileMeta);
  expect(result.isOk()).toBe(true);
  expect(result._unsafeUnwrap()).toBe('file://notes/my-note.org');
});

test('org-link resolveInternalNoteUri returns ok undefined when note not found', async () => {
  const getFileMeta = vi.fn().mockResolvedValue(undefined);
  const result = await resolveInternalNoteUri('missing-id', getFileMeta);
  expect(result.isOk()).toBe(true);
  expect(result._unsafeUnwrap()).toBeUndefined();
});

test('org-link resolveInternalNoteUri passes note id to getter', async () => {
  const getFileMeta = vi.fn().mockResolvedValue({ filePath: ['test.org'] });
  await resolveInternalNoteUri('my-id', getFileMeta);
  expect(getFileMeta).toHaveBeenCalledWith('my-id');
});

test('org-link resolveInternalNoteUri returns err when getter rejects', async () => {
  const getFileMeta = vi.fn().mockRejectedValue(new Error('DB connection lost'));
  const result = await resolveInternalNoteUri('abc-123', getFileMeta);
  expect(result.isErr()).toBe(true);
  expect(result._unsafeUnwrapErr().message).toContain('Failed to resolve note: abc-123');
});

test('org-link resolveInternalNoteUri returns ok undefined for empty note id', async () => {
  const getFileMeta = vi.fn().mockResolvedValue(undefined);
  const result = await resolveInternalNoteUri('', getFileMeta);
  expect(result.isOk()).toBe(true);
  expect(result._unsafeUnwrap()).toBeUndefined();
});
