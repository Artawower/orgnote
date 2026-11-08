import { beforeEach, expect, test, vi } from 'vitest';
import { ErrorFileNotFound } from 'orgnote-api';

const mockReportError = vi.fn();

vi.mock('src/boot/report', () => ({
  reporter: { reportError: mockReportError },
}));

const mockRead = vi.fn();
const mockWrite = vi.fn();

const fileContent = { read: mockRead, write: mockWrite };

const { ensureFileExists } = await import('./ensure-file-exists');

beforeEach(() => {
  vi.clearAllMocks();
  mockWrite.mockResolvedValue(undefined);
});

test('ensureFileExists_doesNotOverwrite_existingFile', async () => {
  mockRead.mockResolvedValue(new Uint8Array([1, 2, 3]));

  const ok = await ensureFileExists(fileContent, '/notes/inbox.org');

  expect(ok).toBe(true);
  expect(mockWrite).not.toHaveBeenCalled();
});

test('ensureFileExists_createsEmpty_whenFileNotFound', async () => {
  mockRead.mockRejectedValue(new ErrorFileNotFound('/notes/new.org'));
  mockWrite.mockResolvedValue(undefined);

  const ok = await ensureFileExists(fileContent, '/notes/new.org');

  expect(ok).toBe(true);
  expect(mockWrite).toHaveBeenCalledWith('/notes/new.org', new Uint8Array(0));
});

test('ensureFileExists_returnsFalse_whenReadFailsWithUnknownError', async () => {
  mockRead.mockRejectedValue(new Error('Permission denied'));

  const ok = await ensureFileExists(fileContent, '/notes/file.org');

  expect(ok).toBe(false);
  expect(mockWrite).not.toHaveBeenCalled();
  expect(mockReportError).toHaveBeenCalledOnce();
});

test('ensureFileExists_returnsFalse_whenWriteFails', async () => {
  mockRead.mockRejectedValue(new ErrorFileNotFound('/notes/new.org'));
  mockWrite.mockRejectedValue(new Error('Disk full'));

  const ok = await ensureFileExists(fileContent, '/notes/new.org');

  expect(ok).toBe(false);
  expect(mockReportError).toHaveBeenCalledOnce();
});
