import { test, expect, vi, beforeEach } from 'vitest';

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockDecrypt = vi.fn();
const mockEncrypt = vi.fn();

const mockFileSystemManager: {
  currentFs: { readFile: typeof mockReadFile; writeFile: typeof mockWriteFile } | null;
} = {
  currentFs: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
  },
};

const mockEncryptionConfig: { config: { encryption: { type: string } } } = {
  config: {
    encryption: {
      type: 'enabled',
    },
  },
};

const mockFileSystem = {
  writeFile: async (path: string, content: Uint8Array) => {
    if (!mockFileSystemManager.currentFs) {
      throw new Error('No file system selected');
    }
    await mockWriteFile(path, content, 'binary');
  },
};

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileSystemManager: () => mockFileSystemManager,
      useFileSystem: () => mockFileSystem,
      useEncryption: () => ({
        decrypt: mockDecrypt,
        encrypt: mockEncrypt,
      }),
      useConfig: () => mockEncryptionConfig,
    },
  },
}));

const { useFileContent, EncryptionConfigRequiredError } = await import('./use-file-content');

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFile.mockResolvedValue(new Uint8Array());
  mockWriteFile.mockResolvedValue(undefined);
  mockDecrypt.mockResolvedValue('decrypted content');
  mockEncrypt.mockResolvedValue('encrypted content');
  mockFileSystemManager.currentFs = {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
  };
  mockEncryptionConfig.config.encryption.type = 'enabled';
});

test('read returns content for non-gpg files without decryption', async () => {
  const content = new TextEncoder().encode('* Test Note');
  mockReadFile.mockResolvedValue(content);

  const fileContent = useFileContent();
  const result = await fileContent.read('/notes/test.org');

  expect(mockReadFile).toHaveBeenCalledWith('/notes/test.org', 'binary');
  expect(mockDecrypt).not.toHaveBeenCalled();
  expect(result).toEqual(content);
});

test('read decrypts armored .org.gpg files converting bytes to string', async () => {
  const armoredText = '-----BEGIN PGP MESSAGE-----\ntest\n-----END PGP MESSAGE-----';
  const encryptedContent = new TextEncoder().encode(armoredText);
  mockReadFile.mockResolvedValue(encryptedContent);
  mockDecrypt.mockResolvedValue('decrypted text');

  const fileContent = useFileContent();
  await fileContent.read('/notes/secret.org.gpg');

  expect(mockDecrypt).toHaveBeenCalledWith(armoredText);
  expect(mockDecrypt).toHaveBeenCalledWith(expect.any(String));
});

test('read decrypts binary .org.gpg files passing Uint8Array', async () => {
  const binaryContent = new Uint8Array([0xc0, 0x03, 0x04, 0x07, 0x02]);
  mockReadFile.mockResolvedValue(binaryContent);
  mockDecrypt.mockResolvedValue('decrypted text');

  const fileContent = useFileContent();
  await fileContent.read('/notes/secret.org.gpg');

  expect(mockDecrypt).toHaveBeenCalledWith(binaryContent);
  expect(mockDecrypt).toHaveBeenCalledWith(expect.any(Uint8Array));
});

test('read returns empty Uint8Array for empty gpg file without decryption', async () => {
  mockReadFile.mockResolvedValue(new Uint8Array());

  const fileContent = useFileContent();
  const result = await fileContent.read('/notes/empty.org.gpg');

  expect(mockDecrypt).not.toHaveBeenCalled();
  expect(result).toEqual(new Uint8Array());
});

test('read throws when no file system selected', async () => {
  mockFileSystemManager.currentFs = null;

  const fileContent = useFileContent();

  await expect(fileContent.read('/notes/test.org')).rejects.toThrow('No file system selected');
});

test('read throws EncryptionConfigRequiredError for gpg file when encryption disabled', async () => {
  mockEncryptionConfig.config.encryption.type = 'disabled';
  mockReadFile.mockResolvedValue(new Uint8Array([1, 2, 3]));

  const fileContent = useFileContent();

  await expect(fileContent.read('/notes/secret.org.gpg')).rejects.toThrow(
    EncryptionConfigRequiredError,
  );
});

test('read returns empty Uint8Array when readFile returns undefined', async () => {
  mockReadFile.mockResolvedValue(undefined);

  const fileContent = useFileContent();
  const result = await fileContent.read('/notes/missing.org');

  expect(result).toEqual(new Uint8Array());
});

test('write encrypts content for .org.gpg files', async () => {
  const content = new TextEncoder().encode('* Secret Note');
  mockEncrypt.mockResolvedValue('encrypted binary data');

  const fileContent = useFileContent();
  await fileContent.write('/notes/secret.org.gpg', content);

  expect(mockEncrypt).toHaveBeenCalled();
  expect(mockWriteFile).toHaveBeenCalledWith(
    '/notes/secret.org.gpg',
    expect.any(Uint8Array),
    'binary',
  );
});

test('write passes content through for non-gpg files', async () => {
  const content = new TextEncoder().encode('* Public Note');

  const fileContent = useFileContent();
  await fileContent.write('/notes/public.org', content);

  expect(mockEncrypt).not.toHaveBeenCalled();
  expect(mockWriteFile).toHaveBeenCalledWith('/notes/public.org', content, 'binary');
});

test('write throws when no file system selected', async () => {
  mockFileSystemManager.currentFs = null;
  const content = new TextEncoder().encode('test');

  const fileContent = useFileContent();

  await expect(fileContent.write('/notes/test.org', content)).rejects.toThrow(
    'No file system selected',
  );
});

test('write throws EncryptionConfigRequiredError for gpg file when encryption disabled', async () => {
  mockEncryptionConfig.config.encryption.type = 'disabled';
  const content = new TextEncoder().encode('* Secret');

  const fileContent = useFileContent();

  await expect(fileContent.write('/notes/secret.org.gpg', content)).rejects.toThrow(
    EncryptionConfigRequiredError,
  );
});
