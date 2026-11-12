import { expect, test, vi } from 'vitest';
import type { DiskFile, OrgNoteApi } from 'orgnote-api';
import { createDirItemsGetter, walkDir } from './dir-items-getter';
import {
  createFileSearchTraversalPolicy,
  FILE_VISIT_DECISIONS,
  userContentTraversalPolicy,
} from './file-traversal-policy';

const file = (path: string): DiskFile => ({ path, name: path.slice(path.lastIndexOf('/') + 1), type: 'file', size: 0, mtime: 0 });
const dir = (path: string): DiskFile => ({ path, name: path.slice(path.lastIndexOf('/') + 1), type: 'directory', size: 0, mtime: 0 });

const createApi = (readDir: (path: string) => Promise<DiskFile[]>): OrgNoteApi =>
  ({
    core: {
      useCompletion: () => ({ close: vi.fn() }),
      useConfig: () => ({ config: { completion: { fuseThreshold: 0.3 } } }),
      useFileSystem: () => ({ readDir }),
    },
  }) as unknown as OrgNoteApi;

test('walkDir keeps all directories and filters files by allowedExtensions', async () => {
  const readDir = vi.fn(async (path: string): Promise<DiskFile[]> => {
    if (path !== '/root') return [];
    return [
      dir('/root/sub'),
      file('/root/a.org.tmpl'),
      file('/root/b.txt'),
    ];
  });

  const result = await walkDir(readDir, '/root', {
    includeFiles: true,
    allowedExtensions: ['.org.tmpl'],
    recursive: false,
  });

  expect(result).toEqual([
    dir('/root/sub'),
    file('/root/a.org.tmpl'),
  ]);
  expect(readDir).toHaveBeenCalledWith('/root');
  expect(readDir).not.toHaveBeenCalledWith('/root/sub');
});

test('walkDir includes system files when no traversal policy is provided', async () => {
  const readDir = vi.fn(async (path: string): Promise<DiskFile[]> => {
    if (path === '/') return [dir('/.orgnote'), dir('/notes')];
    if (path === '/.orgnote') return [file('/.orgnote/config.toml')];
    if (path === '/notes') return [file('/notes/note.org')];
    return [];
  });

  const result = await walkDir(readDir, '/', { includeFiles: true });

  expect(result).toContainEqual(dir('/.orgnote'));
  expect(result).toContainEqual(file('/.orgnote/config.toml'));
  expect(readDir).toHaveBeenCalledWith('/.orgnote');
});

test('walkDir prunes system files with the user content policy', async () => {
  const readDir = vi.fn(async (path: string): Promise<DiskFile[]> => {
    if (path === '/') return [dir('/.orgnote'), dir('/notes')];
    if (path === '/.orgnote') return [file('/.orgnote/config.toml')];
    if (path === '/notes') return [file('/notes/note.org')];
    return [];
  });

  const result = await walkDir(readDir, '/', {
    includeFiles: true,
    traversalPolicy: userContentTraversalPolicy,
  });

  expect(result).not.toContainEqual(dir('/.orgnote'));
  expect(readDir).not.toHaveBeenCalledWith('/.orgnote');
  expect(result).toContainEqual(file('/notes/note.org'));
});

test('walkDir descends without including the directory', async () => {
  const readDir = vi.fn(async (path: string): Promise<DiskFile[]> => {
    if (path === '/') return [dir('/group')];
    if (path === '/group') return [file('/group/note.org')];
    return [];
  });

  const result = await walkDir(readDir, '/', {
    includeFiles: true,
    traversalPolicy: (entry) =>
      entry.path === '/group'
        ? FILE_VISIT_DECISIONS.DESCEND_ONLY
        : FILE_VISIT_DECISIONS.INCLUDE,
  });

  expect(result).toEqual([file('/group/note.org')]);
});

test('file search allows an explicitly selected system root', () => {
  const policy = createFileSearchTraversalPolicy('/.orgnote/templates');

  expect(policy(file('/.orgnote/templates/default.org.tmpl'))).toBe(
    FILE_VISIT_DECISIONS.INCLUDE,
  );
});

test('createDirItemsGetter excludes system files from default searches', async () => {
  const readDir = vi.fn(async (path: string): Promise<DiskFile[]> => {
    if (path === '/') return [dir('/.orgnote'), file('/note.org')];
    return [];
  });
  const getItems = createDirItemsGetter(createApi(readDir), true);

  const result = await getItems('');

  expect(result.result.map(({ data }) => data.path)).toEqual(['/note.org']);
  expect(readDir).not.toHaveBeenCalledWith('/.orgnote');
});

test('createDirItemsGetter traverses an explicitly selected system root', async () => {
  const readDir = vi.fn(async (path: string): Promise<DiskFile[]> =>
    path === '/.orgnote/templates'
      ? [file('/.orgnote/templates/default.org.tmpl')]
      : [],
  );
  const getItems = createDirItemsGetter(createApi(readDir), {
    includeFiles: true,
    rootPath: '/.orgnote/templates',
  });

  const result = await getItems('');

  expect(result.result.map(({ data }) => data.path)).toEqual([
    '/.orgnote/templates/default.org.tmpl',
  ]);
});

test('walkDir with recursive false returns only the immediate level', async () => {
  const readDir = vi.fn(async (path: string): Promise<DiskFile[]> => {
    if (path !== '/root') return [];
    return [dir('/root/sub'), file('/root/a.org')];
  });

  const result = await walkDir(readDir, '/root', {
    includeFiles: true,
    recursive: false,
  });

  expect(result).toEqual([dir('/root/sub'), file('/root/a.org')]);
  expect(readDir).toHaveBeenCalledTimes(1);
  expect(readDir).toHaveBeenCalledWith('/root');
});

test('walkDir excludes files when includeFiles is false but keeps directories', async () => {
  const readDir = vi.fn(async (): Promise<DiskFile[]> => [
    dir('/root/sub'),
    file('/root/a.org.tmpl'),
  ]);

  const result = await walkDir(readDir, '/root', {
    includeFiles: false,
    allowedExtensions: ['.org.tmpl'],
    recursive: false,
  });

  expect(result).toEqual([dir('/root/sub')]);
});

test('walkDir recurses into nested directories in level-then-nested order', async () => {
  const readDir = vi.fn(async (path: string): Promise<DiskFile[]> => {
    if (path === '/root') return [dir('/root/a'), file('/root/top.org')];
    if (path === '/root/a') return [file('/root/a/nested.org')];
    return [];
  });

  const result = await walkDir(readDir, '/root', { includeFiles: true });

  expect(result).toEqual([
    dir('/root/a'),
    file('/root/top.org'),
    file('/root/a/nested.org'),
  ]);
});
