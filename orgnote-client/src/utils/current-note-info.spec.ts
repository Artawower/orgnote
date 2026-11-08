import type { FileMeta, OrgNoteApi } from 'orgnote-api';
import { I18N } from 'orgnote-api';
import type { SyncStateData } from 'orgnote-api';
import { expect, test, vi } from 'vitest';
import { getCurrentNoteInfo } from './current-note-info';

interface BuildApiOptions {
  editorPath?: string;
  routePath?: string | string[];
  meta?: FileMeta;
  syncStateData?: SyncStateData | null;
}

const buildApi = (options: BuildApiOptions) => {
  const getByPath = vi.fn(async () => options.meta);

  const api = {
    core: {
      useEditor: () => ({
        activeContext: options.editorPath ? { filePath: options.editorPath } : null,
      }),
      usePane: () => ({
        activeTab:
          options.routePath === undefined
            ? undefined
            : {
                router: {
                  currentRoute: {
                    value: {
                      params: {
                        path: options.routePath,
                      },
                    },
                  },
                },
              },
      }),
      useFileMeta: () => ({
        getByPath,
      }),
      useSync: () => ({
        stateData: options.syncStateData ?? null,
      }),
    },
  } as unknown as OrgNoteApi;

  return { api, getByPath };
};

test('current-note-info uses editor file path before route path', async () => {
  const { api, getByPath } = buildApi({
    editorPath: '/notes/editor-note.org',
    routePath: ['notes', 'route-note.org'],
    meta: {
      id: '1',
      filePath: ['notes', 'editor-note.org'],
      title: 'Editor note',
      tags: ['zettel'],
      links: ['a', 'b'],
      backlinks: ['c'],
    },
    syncStateData: {
      files: {
        '/notes/editor-note.org': {
          mtime: 10,
          size: 20,
          status: 'synced',
          syncedAt: '2026-03-06T12:00:00.000Z',
        },
      },
    },
  });

  const result = await getCurrentNoteInfo(api);

  expect(getByPath).toHaveBeenCalledWith(['notes', 'editor-note.org']);
  expect(result).toEqual({
    title: 'Editor note',
    filePath: '/notes/editor-note.org',
    description: undefined,
    tags: ['zettel'],
    linksCount: 2,
    backlinksCount: 1,
    createdAt: undefined,
    updatedAt: undefined,
    touchedAt: undefined,
    lastSyncAt: '2026-03-06T12:00:00.000Z',
  });
});

test('current-note-info uses route path when editor path is missing', async () => {
  const { api, getByPath } = buildApi({
    routePath: ['notes', 'from-route.org'],
    meta: {
      id: '2',
      filePath: ['notes', 'from-route.org'],
      title: 'Route note',
    },
  });

  const result = await getCurrentNoteInfo(api);

  expect(getByPath).toHaveBeenCalledWith(['notes', 'from-route.org']);
  expect(result?.filePath).toBe('notes/from-route.org');
  expect(result?.title).toBe('Route note');
  expect(result?.lastSyncAt).toBeUndefined();
});

test('current-note-info returns undefined when there is no active note path', async () => {
  const { api, getByPath } = buildApi({});

  const result = await getCurrentNoteInfo(api);

  expect(result).toBeUndefined();
  expect(getByPath).not.toHaveBeenCalled();
});

test('current-note-info falls back to file name when meta title is empty', async () => {
  const { api } = buildApi({
    routePath: '/notes/fallback-title.org',
    meta: {
      id: '3',
      filePath: ['notes', 'fallback-title.org'],
      title: '   ',
    },
  });

  const result = await getCurrentNoteInfo(api);

  expect(result?.title).toBe('fallback-title.org');
});

test('current-note-info falls back to untitled key when file name is empty', async () => {
  const { api } = buildApi({
    routePath: '/',
  });

  const result = await getCurrentNoteInfo(api);

  expect(result?.title).toBe(I18N.UNTITLED);
});

test('current-note-info resolves last sync from relative path key', async () => {
  const { api } = buildApi({
    routePath: '/notes/relative-sync.org',
    syncStateData: {
      files: {
        'notes/relative-sync.org': {
          mtime: 11,
          size: 22,
          status: 'synced',
          syncedAt: '2026-03-05T08:00:00.000Z',
        },
      },
    },
  });

  const result = await getCurrentNoteInfo(api);

  expect(result?.lastSyncAt).toBe('2026-03-05T08:00:00.000Z');
});
