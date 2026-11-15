import { afterEach, expect, test, vi } from 'vitest';
import { useAndroidFs } from './android-fs';

const ROOT_URI = 'content://tree/root';

const safMock = vi.hoisted(() => ({
  delete: vi.fn(),
  fileInfo: vi.fn(),
  mkdir: vi.fn(),
  openDirectoryPicker: vi.fn(),
  readDir: vi.fn(),
  readFile: vi.fn(),
  rename: vi.fn(),
  utime: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('src/plugins/saf.plugin', () => ({
  getAndroidSaf: vi.fn(async () => safMock),
}));

afterEach(() => {
  vi.clearAllMocks();
});

test('android-fs writeFile creates missing parent directories before writing nested files', async () => {
  const existingDirectories = new Set(['']);
  safMock.mkdir.mockImplementation(async ({ path }: { path: string[] }) => {
    existingDirectories.add(path.join('/'));
    return { uri: `${ROOT_URI}/${path.join('/')}` };
  });
  safMock.writeFile.mockImplementation(async ({ path }: { path: string[] }) => {
    const parentPath = path.slice(0, -1).join('/');
    if (!existingDirectories.has(parentPath)) {
      throw new Error('Invalid URI or parameters');
    }
  });

  const fs = useAndroidFs();
  await fs.mount?.({ root: ROOT_URI });

  await expect(fs.writeFile('/agenda/inbox.org', 'content')).resolves.toBeUndefined();
  expect(safMock.mkdir).toHaveBeenCalledWith({ uri: ROOT_URI, path: ['agenda'] });
  expect(safMock.writeFile).toHaveBeenCalledWith({
    uri: ROOT_URI,
    path: ['agenda', 'inbox.org'],
    data: 'content',
  });
});
