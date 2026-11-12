import { test, expect, vi, beforeEach } from 'vitest';

const {
  mockGetById,
  mockWriteFile,
  mockFileInfo,
  mockSave,
  mockOpen,
  mockOpenInNewTab,
  mockOpenInAdjacentPane,
  mockReportError,
} = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockWriteFile: vi.fn(),
  mockFileInfo: vi.fn(),
  mockSave: vi.fn(),
  mockOpen: vi.fn(),
  mockOpenInNewTab: vi.fn(),
  mockOpenInAdjacentPane: vi.fn(),
  mockReportError: vi.fn(),
}));

let mockActiveContext: { filePath?: string } | null = null;
let mockEditorConfig: { autoCreateMissingNotes?: boolean } = { autoCreateMissingNotes: true };
let mockCurrentRouteName = 'File';

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileMeta: () => ({
        getById: mockGetById,
        save: mockSave,
      }),
      useFileSystem: () => ({
        writeFile: mockWriteFile,
        fileInfo: mockFileInfo,
      }),
      useBufferViewer: () => ({
        open: mockOpen,
        openInNewTab: mockOpenInNewTab,
        openInAdjacentPane: mockOpenInAdjacentPane,
      }),
      usePane: () => ({
        activeRoute: {
          name: mockCurrentRouteName,
        },
      }),
      useEditor: () => ({
        get activeContext() {
          return mockActiveContext;
        },
      }),
      useConfig: () => ({
        get config() {
          return { editor: mockEditorConfig };
        },
      }),
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError: mockReportError,
  },
}));

import { useInternalLinkHandler } from './use-internal-link-handler';

beforeEach(() => {
  vi.clearAllMocks();
  mockActiveContext = { filePath: 'notes/current.org' };
  mockEditorConfig = { autoCreateMissingNotes: true };
  mockCurrentRouteName = 'File';
  mockGetById.mockResolvedValue({ filePath: ['notes', 'existing.org'] });
  mockWriteFile.mockResolvedValue(undefined);
  mockFileInfo.mockResolvedValue(undefined);
  mockSave.mockResolvedValue(undefined);
});

test('useInternalLinkHandler handleClick opens existing note when found', async () => {
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc-123', 'My Note');
  expect(mockOpen).toHaveBeenCalledWith('file://notes/existing.org');
  expect(mockWriteFile).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleClick opens existing note in a new tab', async () => {
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc-123', 'My Note', 'new-tab');

  expect(mockOpenInNewTab).toHaveBeenCalledWith('file://notes/existing.org');
  expect(mockOpen).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleClick opens existing note in an adjacent pane', async () => {
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc-123', 'My Note', 'adjacent-pane');

  expect(mockOpenInAdjacentPane).toHaveBeenCalledWith('file://notes/existing.org');
  expect(mockOpen).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleClick creates and opens note when not found', async () => {
  mockGetById.mockResolvedValue(undefined);
  const { handleClick } = useInternalLinkHandler();
  await handleClick('new-id', 'New Note');
  expect(mockWriteFile).toHaveBeenCalledOnce();
  expect(mockSave).toHaveBeenCalledOnce();
  expect(mockOpen).toHaveBeenCalledOnce();
});

test('useInternalLinkHandler handleClick writes correct content when creating note', async () => {
  mockGetById.mockResolvedValue(undefined);
  const { handleClick } = useInternalLinkHandler();
  await handleClick('test-id', 'Test Title');
  const content = mockWriteFile.mock.calls[0]?.[1] as string;
  expect(content).toContain(':ID: test-id');
  expect(content).toContain('#+TITLE: Test Title');
});

test('useInternalLinkHandler handleClick saves meta with correct data when creating note', async () => {
  mockGetById.mockResolvedValue(undefined);
  const { handleClick } = useInternalLinkHandler();
  await handleClick('my-id', 'My Title');
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'my-id', title: 'My Title' }),
  );
  const meta = mockSave.mock.calls[0]?.[0] as { filePath: string[] };
  expect(meta.filePath).toEqual(expect.arrayContaining(['notes']));
});

test('useInternalLinkHandler handleClick reports error when resolve fails', async () => {
  mockGetById.mockRejectedValue(new Error('DB error'));
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc', 'Title');
  expect(mockReportError).toHaveBeenCalledOnce();
  expect(mockOpen).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleClick reports error when no current file path', async () => {
  mockGetById.mockResolvedValue(undefined);
  mockActiveContext = { filePath: undefined };
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc', 'Title');
  expect(mockReportError).toHaveBeenCalledOnce();
  expect(mockWriteFile).not.toHaveBeenCalled();
  expect(mockOpen).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleClick reports error when activeContext is null', async () => {
  mockGetById.mockResolvedValue(undefined);
  mockActiveContext = null;
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc', 'Title');
  expect(mockReportError).toHaveBeenCalledOnce();
  expect(mockWriteFile).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleClick reports error when note creation fails', async () => {
  mockGetById.mockResolvedValue(undefined);
  mockWriteFile.mockRejectedValue(new Error('Disk full'));
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc', 'Title');
  expect(mockReportError).toHaveBeenCalledOnce();
  expect(mockOpen).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleClick does not create when existing note found', async () => {
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc', 'Title');
  expect(mockWriteFile).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleClick opens created note buffer URI', async () => {
  mockGetById.mockResolvedValue(undefined);
  const { handleClick } = useInternalLinkHandler();
  await handleClick('new-id', 'Created Note');
  const uri = mockOpen.mock.calls[0]?.[0] as string;
  expect(uri).toContain('file://');
  expect(uri).toMatch(/Created Note/);
});

test('useInternalLinkHandler handleClick skips creation when autoCreateMissingNotes is false', async () => {
  mockGetById.mockResolvedValue(undefined);
  mockEditorConfig = { autoCreateMissingNotes: false };
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc', 'Title');
  expect(mockWriteFile).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockOpen).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleClick skips creation when autoCreateMissingNotes is undefined', async () => {
  mockGetById.mockResolvedValue(undefined);
  mockEditorConfig = {};
  const { handleClick } = useInternalLinkHandler();
  await handleClick('abc', 'Title');
  expect(mockWriteFile).not.toHaveBeenCalled();
  expect(mockOpen).not.toHaveBeenCalled();
});

test('useInternalLinkHandler handleFileLink opens resolved file in current scheme', async () => {
  mockActiveContext = { filePath: '/docs/info.org' };
  mockCurrentRouteName = 'Remote';
  const { handleFileLink } = useInternalLinkHandler();

  await handleFileLink('./installation.org');

  expect(mockOpen).toHaveBeenCalledWith('remote:///docs/installation.org');
});

test('useInternalLinkHandler handleFileLink auto-creates missing local file', async () => {
  mockActiveContext = { filePath: '/notes/current.org' };
  mockCurrentRouteName = 'File';
  mockFileInfo.mockResolvedValue(undefined);
  const { handleFileLink } = useInternalLinkHandler();

  await handleFileLink('./simple-note.org');

  expect(mockWriteFile).toHaveBeenCalledOnce();
  expect(mockWriteFile).toHaveBeenCalledWith(
    '/notes/simple-note.org',
    expect.stringContaining('#+TITLE: simple-note'),
  );
  expect(mockSave).toHaveBeenCalledOnce();
  expect(mockOpen).toHaveBeenCalledWith('file:///notes/simple-note.org');
});

test('useInternalLinkHandler handleFileLink creates missing non-org files without Org content', async () => {
  mockActiveContext = { filePath: '/notes/current.org' };
  mockCurrentRouteName = 'File';
  mockFileInfo.mockResolvedValue(undefined);
  const { handleFileLink } = useInternalLinkHandler();

  await handleFileLink('./drawing.excalidraw');

  expect(mockWriteFile).toHaveBeenCalledWith('/notes/drawing.excalidraw', '');
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockOpen).toHaveBeenCalledWith('file:///notes/drawing.excalidraw');
});

test('useInternalLinkHandler handleFileLink does not auto-create when disabled', async () => {
  mockActiveContext = { filePath: '/notes/current.org' };
  mockCurrentRouteName = 'File';
  mockEditorConfig = { autoCreateMissingNotes: false };
  mockFileInfo.mockResolvedValue(undefined);
  const { handleFileLink } = useInternalLinkHandler();

  await handleFileLink('./simple-note.org');

  expect(mockWriteFile).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockOpen).toHaveBeenCalledWith('file:///notes/simple-note.org');
});

test('useInternalLinkHandler handleFileLink does not auto-create for remote scheme', async () => {
  mockActiveContext = { filePath: '/docs/info.org' };
  mockCurrentRouteName = 'Remote';
  mockFileInfo.mockResolvedValue(undefined);
  const { handleFileLink } = useInternalLinkHandler();

  await handleFileLink('./simple-note.org');

  expect(mockWriteFile).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockOpen).toHaveBeenCalledWith('remote:///docs/simple-note.org');
});

test('useInternalLinkHandler handleFileLink reports error when current file path is missing', async () => {
  mockActiveContext = { filePath: undefined };
  const { handleFileLink } = useInternalLinkHandler();

  await handleFileLink('./installation.org');

  expect(mockReportError).toHaveBeenCalledOnce();
  expect(mockOpen).not.toHaveBeenCalled();
});
