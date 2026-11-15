import { mkdirSync, writeFileSync, utimesSync, readdirSync } from 'fs';
import { afterEach, beforeEach, test, expect } from 'vitest';
import { DiskFile, StoredNoteInfo } from '../../models';
import { findNoteFilesDiff } from '../find-notes-files-diff';
import { statSync } from 'fs';
import { Stats } from 'fs';
import { rmSync } from 'fs';
import { getFileName } from '../get-file-name';
import { join } from '../join-path';

const testFilesFolder = 'src/utils/__tests__/miscellaneous/';
const nestedFolder = 'nested-folder/';
const fn = (fileName: string) => `${testFilesFolder}${fileName}`;
const fns = (fileName: string) =>
  `${testFilesFolder}${nestedFolder}${fileName}`;

function initFiles(): void {
  mkdirSync(testFilesFolder.slice(0, -1));
  mkdirSync(fn(nestedFolder));
}

function cleanFiles(): void {
  try {
    rmSync(testFilesFolder, { recursive: true });
  } catch {
    return;
  }
}

function createTestFile(
  filePath: string,
  updated: Date,
  content: string
): void {
  writeFileSync(filePath, content);

  const time = updated.getTime() / 1000; // Convert to seconds
  utimesSync(filePath, time, time);
}

beforeEach(() => initFiles());
afterEach(() => cleanFiles());

const fileStatToFileInfo = (path: string, stat: Stats): DiskFile => ({
  path,
  name: getFileName(path),
  type: stat.isFile() ? 'file' : 'directory',
  size: stat.size,
  atime: stat.atime.getTime(),
  mtime: stat.mtime.getTime(),
  ctime: stat.ctime.getTime(),
});

test('Should sync notes files', async () => {
  const files = [
    [fn('file-1.org')],
    [fn('file-2.org')],
    [fn('file-9.org'), new Date('2024-10-10')],
    [fns('file-3.org')],
    [fns('file-4.org'), new Date('2024-08-09')],
  ] as const;

  files.forEach(([f, d], i) =>
    createTestFile(
      f,
      d ?? new Date('2024-01-01'),
      `:PROPERTIES:
:ID: ${i + 1}
:PROPERTIES:

* Hello world from note:
- ${f}`
    )
  );

  const storedNotesInfo: StoredNoteInfo[] = [
    {
      id: '2',
      filePath: fn('file-1.org').split('/'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '3',
      filePath: fns('file-3.org').split('/'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '9',
      filePath: fn('file-9.org').split('/'),
      updatedAt: new Date('2020-01-01'),
    },
    {
      id: '10',
      filePath: fns('file-10.org').split('/'),
      updatedAt: new Date('2020-01-01'),
    },
  ];

  const notesFilesDiff = await findNoteFilesDiff({
    fileInfo: async (path: string) => {
      const stats = statSync(path);

      const fileInfo: DiskFile = fileStatToFileInfo(path, stats);

      return Promise.resolve(fileInfo);
    },
    readDir: async (path: string) => {
      const dirents = readdirSync(path, { withFileTypes: true });

      const fileInfos: DiskFile[] = dirents.map((dirent) => {
        const stats = statSync(join(path, dirent.name));
        const fileInfo = fileStatToFileInfo(join(path, dirent.name), stats);
        return fileInfo;
      });

      return Promise.resolve(fileInfos);
    },
    storedNotesInfo,
    dirPath: testFilesFolder,
  });

  expect(notesFilesDiff).toMatchInlineSnapshot(`
    {
      "created": [
        {
          "filePath": "src/utils/__tests__/miscellaneous/file-2.org",
        },
        {
          "filePath": "src/utils/__tests__/miscellaneous/nested-folder/file-4.org",
        },
      ],
      "deleted": [
        {
          "filePath": "src/utils/__tests__/miscellaneous/nested-folder/file-10.org",
          "id": "10",
        },
      ],
      "updated": [
        {
          "filePath": "src/utils/__tests__/miscellaneous/file-9.org",
        },
      ],
    }
  `);
});

test('Should detect no changes when all files match stored info', async () => {
  const files = [
    [fn('file-1.org'), new Date('2024-01-01')],
    [fn('file-2.org'), new Date('2024-01-01')],
    [fns('file-3.org'), new Date('2024-01-01')],
  ] as const;

  files.forEach(([f, d], i) =>
    createTestFile(
      f,
      d ?? new Date('2024-01-01'),
      `:PROPERTIES:
:ID: ${i + 1}
:PROPERTIES:

* Note:
- ${f}`
    )
  );

  const storedNotesInfo: StoredNoteInfo[] = [
    {
      id: '1',
      filePath: fn('file-1.org').split('/'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      filePath: fn('file-2.org').split('/'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '3',
      filePath: fns('file-3.org').split('/'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const notesFilesDiff = await findNoteFilesDiff({
    fileInfo: async (path: string) => {
      const stats = statSync(path);
      const fileInfo: DiskFile = fileStatToFileInfo(path, stats);
      return Promise.resolve(fileInfo);
    },
    readDir: async (path: string) => {
      const dirents = readdirSync(path, { withFileTypes: true });
      const fileInfos: DiskFile[] = dirents.map((dirent) => {
        const stats = statSync(join(path, dirent.name));
        const fileInfo = fileStatToFileInfo(join(path, dirent.name), stats);
        return fileInfo;
      });
      return Promise.resolve(fileInfos);
    },
    storedNotesInfo,
    dirPath: testFilesFolder,
  });

  expect(notesFilesDiff).toEqual({
    created: [],
    updated: [],
    deleted: [],
  });
});
