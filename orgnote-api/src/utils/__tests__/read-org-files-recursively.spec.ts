import { expect, test, vi } from 'vitest';
import { readOrgFilesRecursively } from '../find-notes-files-diff';
import { FileScanParams } from '../../models';

const mockReadDir = vi.fn();
const mockFileInfo = vi.fn();

test('readOrgFilesRecursively_returnsOrgFiles_recursively', async () => {
  const mockFileSystem: FileScanParams = {
    fileInfo: mockFileInfo,
    readDir: mockReadDir,
    dirPath: '/root',
  };

  mockReadDir.mockImplementation(async (path: string) => {
    const entries: Record<
      string,
      Array<{ name: string; type: string; size: number; mtime: number }>
    > = {
      '/root': [
        { name: 'file1.org', type: 'file', size: 100, mtime: Date.now() },
        { name: 'subdir', type: 'directory', size: 0, mtime: Date.now() },
        { name: 'file2.txt', type: 'file', size: 200, mtime: Date.now() },
      ],
      '/root/subdir': [
        { name: 'file3.org', type: 'file', size: 100, mtime: Date.now() },
        { name: 'file4.md', type: 'file', size: 150, mtime: Date.now() },
      ],
    };
    return entries[path] ?? [];
  });

  const orgFiles = await readOrgFilesRecursively(mockFileSystem);
  expect(orgFiles).toEqual(['/root/file1.org', '/root/subdir/file3.org']);
  expect(mockReadDir).toHaveBeenCalledTimes(2);
});

test('readOrgFilesRecursively_returnsEmptyArray_whenNoOrgFiles', async () => {
  const mockFileSystem: FileScanParams = {
    fileInfo: mockFileInfo,
    readDir: mockReadDir,
    dirPath: '/emptyDir',
  };

  mockReadDir.mockResolvedValue([]);

  const orgFiles = await readOrgFilesRecursively(mockFileSystem);
  expect(orgFiles).toEqual([]);
  expect(mockReadDir).toHaveBeenCalledWith('/emptyDir');
});
