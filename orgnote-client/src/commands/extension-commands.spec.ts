import { beforeEach, expect, test, vi } from 'vitest';
import {
  DefaultCommands,
  type CompletionConfig,
  type ExtensionMeta,
  type OrgNoteApi,
} from 'orgnote-api';
import { getExtensionCommands } from './extension-commands';

vi.mock('src/containers/ExtensionCompletionItem.vue', () => ({
  default: { name: 'ExtensionCompletionItem' },
}));

const enableExtension = vi.fn();
const disableExtension = vi.fn();
const completionOpen = vi.fn();
const modalOpen = vi.fn();

const extensions: ExtensionMeta[] = [
  {
    active: false,
    manifest: {
      name: 'reader-mode',
      version: '1.0.0',
      description: 'Improve reading focus',
      category: 'extension',
      source: { type: 'builtin' },
    },
  },
  {
    active: true,
    manifest: {
      name: 'solar-theme',
      version: '1.0.0',
      description: 'Warm theme',
      category: 'theme',
      source: { type: 'builtin' },
    },
  },
];

const api = {
  core: {
    useExtensions: () => ({ extensions, enableExtension, disableExtension }),
    useCompletion: () => ({ open: completionOpen }),
    useConfig: () => ({ config: { completion: { fuseThreshold: 0.4 } } }),
  },
  ui: {
    useModal: () => ({ open: modalOpen }),
  },
} as unknown as OrgNoteApi;

const getCommand = (name: DefaultCommands) => {
  const command = getExtensionCommands().find((candidate) => candidate.command === name);
  if (!command) throw new TypeError(`Expected ${name} command`);
  return command;
};

const openToggleCompletion = (): CompletionConfig<ExtensionMeta> => {
  const command = getCommand(DefaultCommands.TOGGLE_EXTENSIONS);
  command.handler(api, { meta: command });
  return completionOpen.mock.calls[0]![0] as CompletionConfig<ExtensionMeta>;
};

beforeEach(() => {
  vi.clearAllMocks();
  extensions[0]!.active = false;
  extensions[1]!.active = true;
});

test('getExtensionCommands registers extension toggle and settings commands', () => {
  const commandNames = getExtensionCommands().map((command) => command.command);

  expect(commandNames).toContain(DefaultCommands.TOGGLE_EXTENSIONS);
  expect(commandNames).toContain(DefaultCommands.OPEN_EXTENSION_SETTINGS);
  expect(getCommand(DefaultCommands.OPEN_EXTENSION_SETTINGS).system).toBe(true);
});

test('toggle extensions command filters completion candidates', () => {
  const config = openToggleCompletion();
  const result = config.itemsGetter?.('reader');

  expect(result).toEqual({
    result: [expect.objectContaining({ title: 'reader-mode', data: extensions[0] })],
    total: 1,
  });
});

test('toggle extensions command supports fuzzy name matching', () => {
  const config = openToggleCompletion();
  const result = config.itemsGetter?.('reder');

  expect(result).toEqual({
    result: [expect.objectContaining({ title: 'reader-mode', data: extensions[0] })],
    total: 1,
  });
});

test('toggle extensions completion enables an inactive extension', async () => {
  const config = openToggleCompletion();
  const result = await config.itemsGetter?.('reader');

  result?.result[0]?.commandHandler(extensions[0]!);

  expect(enableExtension).toHaveBeenCalledWith('reader-mode');
  expect(disableExtension).not.toHaveBeenCalled();
});

test('toggle extensions completion disables an active extension', async () => {
  const config = openToggleCompletion();
  const result = await config.itemsGetter?.('solar');

  result?.result[0]?.commandHandler(extensions[1]!);

  expect(disableExtension).toHaveBeenCalledWith('solar-theme');
  expect(enableExtension).not.toHaveBeenCalled();
});

test('open extension settings command opens settings for the selected extension', () => {
  const command = getCommand(DefaultCommands.OPEN_EXTENSION_SETTINGS);

  command.handler(api, {
    data: { extensionName: 'reader-mode' },
    meta: command,
  });

  expect(modalOpen).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      title: 'reader-mode',
      modalProps: { extensionName: 'reader-mode' },
    }),
  );
});

test('open extension settings command ignores missing extension data', () => {
  const command = getCommand(DefaultCommands.OPEN_EXTENSION_SETTINGS);

  command.handler(api, { meta: command });

  expect(modalOpen).not.toHaveBeenCalled();
});
