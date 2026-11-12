import { DefaultCommands, type OrgNoteApi } from 'orgnote-api';
import { beforeEach, expect, test, vi } from 'vitest';
import { pickNewOrgFilePath } from 'src/composables/create-file-completion';
import { orgTemplatesExtension } from './index';

vi.mock('src/composables/create-file-completion', () => ({
  pickNewOrgFilePath: vi.fn(),
}));

const writeFile = vi.fn();
const readFile = vi.fn();
const execute = vi.fn();
const next = vi.fn();
let createNoteWrapper: (context: { next: () => Promise<string | undefined> }) => Promise<unknown>;

const api = {
  core: {
    useCommands: () => ({
      add: vi.fn(),
      execute,
      remove: vi.fn(),
      wrap: vi.fn(
        (
          command: string,
          wrapper: {
            handler: (
              context: { next: () => Promise<string | undefined> },
            ) => Promise<unknown>;
          },
        ) => {
          if (command === DefaultCommands.CREATE_NOTE) createNoteWrapper = wrapper.handler;
          return vi.fn();
        },
      ),
    }),
    useExtensions: () => ({
      getExtensionConfig: () => ({
        value: { defaultTemplatePath: '/.orgnote/templates/default.org.tmpl' },
      }),
      setExtensionConfig: vi.fn(),
    }),
    useFileManager: () => ({ path: '/', focusDirPath: '/drawings' }),
    useFileSystem: () => ({
      createDir: vi.fn(),
      fileInfo: vi.fn().mockResolvedValue({ path: '/.orgnote/templates/default.org.tmpl' }),
      readDir: vi.fn().mockResolvedValue([]),
      readFile,
      writeFile,
    }),
  },
} as unknown as OrgNoteApi;

beforeEach(async () => {
  writeFile.mockReset();
  readFile.mockReset().mockResolvedValue(':PROPERTIES:\n:ID: {{uuid()}}\n:END:\n#+TITLE: {{title}}\n');
  execute.mockReset();
  next.mockReset();
  vi.mocked(pickNewOrgFilePath).mockReset();
  await orgTemplatesExtension.onMounted?.(api);
});

test('default note command renders the template for Org files', async () => {
  vi.mocked(pickNewOrgFilePath).mockResolvedValue('/notes/new.org');

  await createNoteWrapper({ next });

  expect(writeFile).toHaveBeenCalledWith(
    '/notes/new.org',
    expect.stringContaining(':PROPERTIES:'),
  );
});

test('default note command creates non-org files without Org template content', async () => {
  vi.mocked(pickNewOrgFilePath).mockResolvedValue('/drawings/new.excalidraw');

  await createNoteWrapper({ next });

  expect(writeFile).toHaveBeenCalledWith('/drawings/new.excalidraw', '');
  expect(execute).toHaveBeenCalledWith(DefaultCommands.OPEN_NOTE, {
    path: '/drawings/new.excalidraw',
  });
  expect(next).not.toHaveBeenCalled();
});
