import { test, expect } from 'vitest';
import {
  extractFiles,
  traverseDirectory,
  type FileSystemFileEntry,
  type FileSystemDirectoryEntry,
  type FileSystemEntry,
} from './file-traversal';

const createMockFile = (name: string) => new File([''], name);

const createMockFileEntry = (name: string): FileSystemFileEntry => ({
  isFile: true,
  isDirectory: false,
  name,
  fullPath: `/${name}`,
  file: (cb: (file: File) => void) => cb(createMockFile(name)),
});

const createMockDirectoryEntry = (name: string, children: FileSystemEntry[] = []): FileSystemDirectoryEntry => ({
  isFile: false,
  isDirectory: true,
  name,
  fullPath: `/${name}`,
  createReader: () => {
    let read = false;
    return {
      readEntries: (cb: (entries: FileSystemEntry[]) => void) => {
        if (!read) {
          read = true;
          cb(children);
        } else {
          cb([]);
        }
      },
    };
  },
});

test('traverseDirectory: should traverse nested directories', async () => {
  const file1 = createMockFileEntry('test1.js');
  const file2 = createMockFileEntry('test2.txt');
  const file3 = createMockFileEntry('test3.js');
  const subDir = createMockDirectoryEntry('subdir', [file2, file3]);
  const rootDir = createMockDirectoryEntry('root', [file1, subDir]);

  const files = await traverseDirectory(rootDir);
  expect(files).toHaveLength(3);
  expect(files.map(f => f.name)).toEqual(['test1.js', 'test2.txt', 'test3.js']);
});

test('traverseDirectory: should filter files by accept extensions', async () => {
  const file1 = createMockFileEntry('test1.js');
  const file2 = createMockFileEntry('test2.txt');
  const rootDir = createMockDirectoryEntry('root', [file1, file2]);

  const files = await traverseDirectory(rootDir, ['js']);
  expect(files).toHaveLength(1);
  expect(files[0]?.name).toBe('test1.js');
});

test('extractFiles: should extract files from DataTransferItems', async () => {
  const fileEntry = createMockFileEntry('test.js');
  const dirEntry = createMockDirectoryEntry('folder', [createMockFileEntry('inner.js')]);

  const itemsArray = [
    { webkitGetAsEntry: () => fileEntry },
    { webkitGetAsEntry: () => dirEntry },
    { webkitGetAsEntry: () => null },
  ];

  const mockItems = {
    length: itemsArray.length,
    [Symbol.iterator]: function* () {
        for (const item of itemsArray) yield item;
    }
  } as unknown as DataTransferItemList;

  const files = await extractFiles(mockItems);
  expect(files).toHaveLength(2);
  expect(files.map(f => f.name)).toEqual(['test.js', 'inner.js']);
});

test('extractFiles: should handle undefined items', async () => {
  const files = await extractFiles(undefined);
  expect(files).toEqual([]);
});
