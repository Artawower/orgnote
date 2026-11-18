import { afterEach, expect, test, vi } from 'vitest';
import { base64ToUint8Array, isNullable, uint8ArrayToBase64 } from 'orgnote-api/utils';
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
    encoding: 'utf8',
  });
});

type NativeEncoding = 'utf8' | 'base64' | undefined;
type NativeFileOptions = { path: string[]; data?: string; encoding?: NativeEncoding };

const JPEG_HEADER_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);

const nativeFiles = new Map<string, Uint8Array>();

const toNativeData = (bytes: Uint8Array, encoding: NativeEncoding): string =>
  encoding === 'base64' ? uint8ArrayToBase64(bytes) : new TextDecoder().decode(bytes);

const fromNativeData = (data: string, encoding: NativeEncoding): Uint8Array =>
  encoding === 'base64' ? base64ToUint8Array(data) : new TextEncoder().encode(data);

const readNativeFile = (path: string[]): Uint8Array => {
  const bytes = nativeFiles.get(path.join('/'));
  if (!bytes) throw new Error('File not found');
  return bytes;
};

const useNativeStorage = (): void => {
  nativeFiles.clear();
  safMock.readFile.mockImplementation(async ({ path, encoding }: NativeFileOptions) => ({
    data: toNativeData(readNativeFile(path), encoding),
  }));
  safMock.writeFile.mockImplementation(async ({ path, data, encoding }: NativeFileOptions) => {
    if (isNullable(data)) throw new Error('Invalid URI or parameters');
    nativeFiles.set(path.join('/'), fromNativeData(data, encoding));
  });
};

const mountAndroidFs = async () => {
  const fs = useAndroidFs();
  await fs.mount?.({ root: ROOT_URI });
  return fs;
};

test('android-fs readFile returns original bytes for binary files', async () => {
  useNativeStorage();
  nativeFiles.set('image.jpg', JPEG_HEADER_BYTES);
  const fs = await mountAndroidFs();

  const content = await fs.readFile('/image.jpg', 'binary');

  expect(Array.from(content)).toEqual(Array.from(JPEG_HEADER_BYTES));
});

test('android-fs writeFile stores original bytes for binary files', async () => {
  useNativeStorage();
  const fs = await mountAndroidFs();

  await fs.writeFile('/image.jpg', JPEG_HEADER_BYTES);

  expect(Array.from(nativeFiles.get('image.jpg') ?? [])).toEqual(Array.from(JPEG_HEADER_BYTES));
});

test('android-fs writeFile and readFile preserve every byte value', async () => {
  useNativeStorage();
  const allBytes = Uint8Array.from({ length: 256 }, (_, byte) => byte);
  const fs = await mountAndroidFs();

  await fs.writeFile('/all-bytes.bin', allBytes);
  const content = await fs.readFile('/all-bytes.bin', 'binary');

  expect(Array.from(content)).toEqual(Array.from(allBytes));
});

test('android-fs writeFile stores only the viewed bytes of a subarray', async () => {
  useNativeStorage();
  const buffer = new Uint8Array([0x01, ...JPEG_HEADER_BYTES, 0x02]);
  const fs = await mountAndroidFs();

  await fs.writeFile('/image.jpg', buffer.subarray(1, -1));

  expect(Array.from(nativeFiles.get('image.jpg') ?? [])).toEqual(Array.from(JPEG_HEADER_BYTES));
});

test('android-fs readFile returns empty bytes for an empty binary file', async () => {
  useNativeStorage();
  nativeFiles.set('empty.bin', new Uint8Array());
  const fs = await mountAndroidFs();

  const content = await fs.readFile('/empty.bin', 'binary');

  expect(content).toEqual(new Uint8Array());
});

test('android-fs writeFile and readFile keep multilingual text as utf8', async () => {
  useNativeStorage();
  const text = '* Заметка 📝\r\n:PROPERTIES:';
  const fs = await mountAndroidFs();

  await fs.writeFile('/note.org', text);
  const content = await fs.readFile('/note.org');

  expect(content).toBe(text);
  expect(safMock.readFile).toHaveBeenCalledWith(expect.objectContaining({ encoding: 'utf8' }));
});

test('android-fs readFile rejects when the binary file is missing', async () => {
  useNativeStorage();
  const fs = await mountAndroidFs();

  await expect(fs.readFile('/missing.jpg', 'binary')).rejects.toThrow('File not found');
});

test('android-fs writeFile rejects when the native write fails', async () => {
  useNativeStorage();
  safMock.writeFile.mockRejectedValueOnce(new Error('Permission denied'));
  const fs = await mountAndroidFs();

  await expect(fs.writeFile('/image.jpg', JPEG_HEADER_BYTES)).rejects.toThrow('Permission denied');
  expect(nativeFiles.has('image.jpg')).toBe(false);
});
