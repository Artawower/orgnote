import { afterEach, beforeEach, expect, test } from 'vitest';
import { mkdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'fs';
import { join } from 'path';
import { findFilesDiff } from '../find-notes-files-diff';
import { StoredNoteInfo } from '../../models';

const testFilesFolder = 'src/utils/__tests__/miscellaneous2/';

function initFiles(): void {
  cleanFiles();
  mkdirSync(testFilesFolder, { recursive: true });
  mkdirSync(testFilesFolder + '/nested-folder', { recursive: true });
}

function cleanFiles(): void {
  rmSync(testFilesFolder, { recursive: true, force: true });
}

function createTestFile(
  content: string,
  fileName: string,
  updated: Date
): void {
  const filePath = join(testFilesFolder, fileName);

  writeFileSync(filePath, content);

  const time = updated.getTime() / 1000; // Convert to seconds
  utimesSync(filePath, time, time);
}

beforeEach(() => initFiles());
afterEach(() => cleanFiles());

test('Should find files diff', () => {
  createTestFile(`unchanged file!`, 'org-file.org', new Date('2021-01-01'));
  createTestFile(
    `changed org file 2!`,
    'org-file2.org',
    new Date('2022-01-01')
  );
  createTestFile(
    `deleted org in the nested folder file!`,
    'nested-folder/org-file3.org',
    new Date('2021-01-01')
  );
  createTestFile(
    `created file in the nested folder!`,
    'nested-folder/org-file4.org',
    new Date('2021-02-01')
  );

  const storedNoteInfos: StoredNoteInfo[] = [
    {
      filePath: [testFilesFolder + 'deleted-org-file.org'],
      id: 'deleted-org-file.org',
      updatedAt: new Date('2021-01-01'),
    },
    {
      filePath: [testFilesFolder + 'org-file.org'],
      id: 'org-file.org',
      updatedAt: new Date('2021-01-01'),
    },
    {
      filePath: [testFilesFolder + 'org-file2.org'],
      id: 'org-file2.org',
      updatedAt: new Date('2021-01-01'),
    },
    {
      filePath: [testFilesFolder + 'nested-folder/org-file3.org'],
      id: 'nested-folder/org-file3.org',
      updatedAt: new Date('2021-01-01'),
    },
  ];

  const changedFiles = findFilesDiff(
    [
      testFilesFolder + 'org-file.org',
      testFilesFolder + 'org-file2.org',
      testFilesFolder + 'nested-folder/org-file3.org',
      testFilesFolder + 'nested-folder/org-file4.org',
    ],
    storedNoteInfos,
    (filePath: string) => new Date(statSync(filePath).mtime)
  );

  expect(changedFiles).toEqual({
    created: [testFilesFolder + 'nested-folder/org-file4.org'],
    updated: [testFilesFolder + 'org-file2.org'],
    deleted: [testFilesFolder + 'deleted-org-file.org'],
  });
});

test('Should find files diff when folder was renamed', () => {
  createTestFile(
    `nested file!`,
    'nested-folder/org-file.org',
    new Date('2021-01-01')
  );
  createTestFile(
    `nested file2!`,
    'nested-folder/org-file-2.org',
    new Date('2021-01-01')
  );

  const storedNoteInfos: StoredNoteInfo[] = [
    {
      filePath: [testFilesFolder + 'nested-folder/org-file.org'],
      id: 'nested-folder/org-file.org',
      updatedAt: new Date('2021-01-01'),
    },
    {
      filePath: [testFilesFolder + 'nested-folder/org-file2.org'],
      id: 'nested-folder/org-file2.org',
      updatedAt: new Date('2021-01-01'),
    },
  ];

  rmSync(testFilesFolder + 'nested-folder', { recursive: true, force: true });

  const changedFiles = findFilesDiff(
    [],
    storedNoteInfos,
    (filePath: string) => new Date(statSync(filePath).mtime)
  );

  expect(changedFiles).toMatchInlineSnapshot(`
    {
      "created": [],
      "deleted": [
        "src/utils/__tests__/miscellaneous2/nested-folder/org-file.org",
        "src/utils/__tests__/miscellaneous2/nested-folder/org-file2.org",
      ],
      "updated": [],
    }
  `);
});

test('Should find created note when nested folder created', () => {
  mkdirSync(testFilesFolder + 'new-nested-folder', { recursive: true });
  createTestFile(
    `new nested file!`,
    'new-nested-folder/org-file.org',
    new Date('2023-01-01')
  );

  const storedNoteInfos: StoredNoteInfo[] = [];

  const changedFiles = findFilesDiff(
    [testFilesFolder + 'new-nested-folder/org-file.org'],
    storedNoteInfos,
    (filePath: string) => new Date(statSync(filePath).mtime)
  );

  expect(changedFiles).toEqual({
    created: [testFilesFolder + 'new-nested-folder/org-file.org'],
    updated: [],
    deleted: [],
  });
});

test('Should find nothing when no files provided', () => {
  const storedNoteInfos: StoredNoteInfo[] = [];

  const changedFiles = findFilesDiff(
    [],
    storedNoteInfos,
    (filePath: string) => new Date(statSync(filePath).mtime)
  );

  expect(changedFiles).toEqual({
    created: [],
    updated: [],
    deleted: [],
  });
});
