import { expect, test } from 'vitest';
import type { OrgNoteApi } from 'orgnote-api';
import { getActiveFilePath } from './get-active-file-path';

const createMockApi = (params: {
  activeBufferUri?: string;
  activeContextFilePath?: string;
}): OrgNoteApi =>
  ({
    core: {
      usePane: () => ({
        activeBufferUri: params.activeBufferUri,
      }),
      useEditor: () => ({
        activeContext: {
          filePath: params.activeContextFilePath,
        },
      }),
    },
  }) as unknown as OrgNoteApi;

test('getActiveFilePath returns file path from active file buffer uri', () => {
  const api = createMockApi({
    activeBufferUri: 'file:///notes/today.org',
    activeContextFilePath: '/fallback.org',
  });

  expect(getActiveFilePath(api)).toBe('/notes/today.org');
});

test('getActiveFilePath returns fallback path when active buffer uri is missing', () => {
  const api = createMockApi({
    activeContextFilePath: '/notes/fallback.org',
  });

  expect(getActiveFilePath(api)).toBe('/notes/fallback.org');
});

test('getActiveFilePath returns fallback path when active buffer uri is non-file', () => {
  const api = createMockApi({
    activeBufferUri: 'remote:///docs/info.org',
    activeContextFilePath: '/notes/fallback.org',
  });

  expect(getActiveFilePath(api)).toBe('/notes/fallback.org');
});

test('getActiveFilePath returns undefined when no route uri and no fallback path', () => {
  const api = createMockApi({});

  expect(getActiveFilePath(api)).toBeUndefined();
});
