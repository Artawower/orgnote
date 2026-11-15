import { test, expect, vi, beforeEach } from 'vitest';
import { I18N, type OrgNoteApi } from 'orgnote-api';
import { useTransferDestinationCompletion } from './transfer-destination-completion';
import { createDirItemsGetter } from 'src/utils/dir-items-getter';

vi.mock('src/utils/dir-items-getter', () => ({
  createDirItemsGetter: vi.fn(() => vi.fn(async () => ({ total: 0, result: [] }))),
}));

type MockFs = {
  isDirExist: ReturnType<typeof vi.fn>;
  isFileExist: ReturnType<typeof vi.fn>;
};

const createMockApi = (params?: {
  pickedPath?: string;
  fs?: Partial<MockFs>;
  withFs?: boolean;
}) => {
  const open = vi.fn().mockResolvedValue(params?.pickedPath ?? '/dest');

  const fs: MockFs = {
    isDirExist: vi.fn(async () => false),
    isFileExist: vi.fn(async () => false),
    ...params?.fs,
  };

  const api: Partial<OrgNoteApi> = {
    core: {
      useCompletion: () => ({ open }),
      useFileSystemManager: () => ({ currentFs: params?.withFs === false ? undefined : fs }),
    } as unknown as OrgNoteApi['core'],
  };

  return { api: api as OrgNoteApi, open, fs };
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('useTransferDestinationCompletion opens input-choice completion with folder picker settings', async () => {
  const { api, open } = createMockApi();

  await useTransferDestinationCompletion(api, '/notes');

  expect(open).toHaveBeenCalledWith({
    type: 'input-choice',
    searchText: '/notes',
    placeholder: I18N.PICK_FOLDER,
    itemsGetter: expect.any(Function),
  });
  expect(vi.mocked(createDirItemsGetter)).toHaveBeenCalledWith(api);
});

test('useTransferDestinationCompletion returns undefined when user cancels selection', async () => {
  const { api } = createMockApi({ pickedPath: '' });

  const result = await useTransferDestinationCompletion(api, '/notes');

  expect(result).toBeUndefined();
});

test('useTransferDestinationCompletion trims trailing slash from selected directory', async () => {
  const { api, fs } = createMockApi({ pickedPath: '/dest/' });

  const result = await useTransferDestinationCompletion(api, '/notes');

  expect(result).toEqual({
    destinationDir: '/dest',
  });
  expect(fs.isDirExist).not.toHaveBeenCalled();
  expect(fs.isFileExist).not.toHaveBeenCalled();
});

test('useTransferDestinationCompletion keeps root slash unchanged', async () => {
  const { api } = createMockApi({ pickedPath: '/' });

  const result = await useTransferDestinationCompletion(api, '/notes');

  expect(result).toEqual({
    destinationDir: '/',
  });
});

test('useTransferDestinationCompletion returns selected path when directory exists', async () => {
  const { api, fs } = createMockApi({
    pickedPath: '/dest',
    fs: {
      isDirExist: vi.fn(async () => true),
    },
  });

  const result = await useTransferDestinationCompletion(api, '/notes');

  expect(result).toEqual({
    destinationDir: '/dest',
  });
  expect(fs.isDirExist).toHaveBeenCalledWith('/dest');
});

test('useTransferDestinationCompletion returns parent directory when selected path is file', async () => {
  const { api, fs } = createMockApi({
    pickedPath: '/dest/file.org',
    fs: {
      isDirExist: vi.fn(async () => false),
    },
  });

  const result = await useTransferDestinationCompletion(api, '/notes');

  expect(result).toEqual({
    destinationDir: '/dest',
    explicitFilePath: '/dest/file.org',
  });
  expect(fs.isDirExist).toHaveBeenCalledWith('/dest/file.org');
});

test('useTransferDestinationCompletion falls back to parent directory when path does not exist', async () => {
  const { api, fs } = createMockApi({
    pickedPath: '/new/place/file.org',
    fs: {
      isDirExist: vi.fn(async () => false),
    },
  });

  const result = await useTransferDestinationCompletion(api, '/notes');

  expect(result).toEqual({
    destinationDir: '/new/place',
    explicitFilePath: '/new/place/file.org',
  });
  expect(fs.isDirExist).toHaveBeenCalledWith('/new/place/file.org');
});

test('useTransferDestinationCompletion uses parent directory fallback when file system manager is unavailable', async () => {
  const { api } = createMockApi({
    withFs: false,
    pickedPath: '/new/place/file.org',
  });

  const result = await useTransferDestinationCompletion(api, '/notes');

  expect(result).toEqual({
    destinationDir: '/new/place',
  });
});
