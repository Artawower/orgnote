import { beforeEach, expect, test, vi } from 'vitest';
import { DefaultCommands, type CommandHandlerParams, type OrgNoteApi } from 'orgnote-api';
import type { LinkMenuData } from 'src/models/link-menu-data';

const { mockCopyToClipboard, mockHandleClick, mockHandleFileLink } = vi.hoisted(() => ({
  mockCopyToClipboard: vi.fn(),
  mockHandleClick: vi.fn(),
  mockHandleFileLink: vi.fn(),
}));

vi.mock('src/composables/use-internal-link-handler', () => ({
  useInternalLinkHandler: () => ({
    handleClick: mockHandleClick,
    handleFileLink: mockHandleFileLink,
  }),
}));

import { getLinkCommands } from './link-commands';

type LinkCommandApi = {
  utils: Pick<OrgNoteApi['utils'], 'copyToClipboard'>;
};

const commandApi = {
  utils: {
    copyToClipboard: mockCopyToClipboard,
  },
} satisfies LinkCommandApi;

const api = commandApi as unknown as OrgNoteApi;

const getCommand = (command: DefaultCommands) =>
  getLinkCommands().find((item) => item.command === command)!;

const createParams = (data: LinkMenuData): CommandHandlerParams<LinkMenuData> => ({
  data,
  meta: {},
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('COPY_LINK copies the Org link target', async () => {
  const command = getCommand(DefaultCommands.COPY_LINK);

  await command.handler(
    api,
    createParams({
      kind: 'org',
      target: 'id:abc',
      title: 'Title',
    }),
  );

  expect(mockCopyToClipboard).toHaveBeenCalledWith('id:abc');
});

test('COPY_LINK copies the URL of an external link', async () => {
  const command = getCommand(DefaultCommands.COPY_LINK);

  await command.handler(api, createParams({ kind: 'external', url: 'https://example.com' }));

  expect(mockCopyToClipboard).toHaveBeenCalledWith('https://example.com');
});

test('link opening commands use distinct icons', () => {
  const newTabCommand = getCommand(DefaultCommands.OPEN_LINK_IN_NEW_TAB);
  const adjacentPaneCommand = getCommand(DefaultCommands.OPEN_LINK_IN_ADJACENT_PANE);

  expect(adjacentPaneCommand.icon).toBe('sym_o_splitscreen');
  expect(adjacentPaneCommand.icon).not.toBe(newTabCommand.icon);
});

test('OPEN_LINK_IN_NEW_TAB opens an internal Org link', async () => {
  const command = getCommand(DefaultCommands.OPEN_LINK_IN_NEW_TAB);

  await command.handler(api, createParams({ kind: 'org', target: 'id:abc', title: 'Title' }));

  expect(mockHandleClick).toHaveBeenCalledWith('abc', 'Title', 'new-tab');
  expect(mockHandleFileLink).not.toHaveBeenCalled();
});

test('OPEN_LINK_IN_NEW_TAB opens a relative Org file link', async () => {
  const command = getCommand(DefaultCommands.OPEN_LINK_IN_NEW_TAB);

  await command.handler(
    api,
    createParams({
      kind: 'org',
      target: './other.org',
      title: 'Other',
    }),
  );

  expect(mockHandleFileLink).toHaveBeenCalledWith('./other.org', 'new-tab');
  expect(mockHandleClick).not.toHaveBeenCalled();
});

test('OPEN_LINK_IN_ADJACENT_PANE opens an internal Org link', async () => {
  const command = getCommand(DefaultCommands.OPEN_LINK_IN_ADJACENT_PANE);

  await command.handler(api, createParams({ kind: 'org', target: 'id:abc', title: 'Title' }));

  expect(mockHandleClick).toHaveBeenCalledWith('abc', 'Title', 'adjacent-pane');
  expect(mockHandleFileLink).not.toHaveBeenCalled();
});

test('OPEN_LINK_IN_NEW_TAB ignores external links', async () => {
  const command = getCommand(DefaultCommands.OPEN_LINK_IN_NEW_TAB);

  await command.handler(api, createParams({ kind: 'external', url: 'https://example.com' }));

  expect(mockHandleClick).not.toHaveBeenCalled();
  expect(mockHandleFileLink).not.toHaveBeenCalled();
});
