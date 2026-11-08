import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { KEYBINDING_CONTEXTS, type Command } from 'orgnote-api';
import { useCommandsStore } from './command';
import { useKeybindingsStore } from './keybindings';
import { isMac } from 'src/utils/hotkey-display';

vi.mock('./config', () => ({
  useConfigStore: vi.fn(() => ({
    config: {},
  })),
}));

const createKeyEvent = (key: string, code?: string): KeyboardEvent =>
  new KeyboardEvent('keydown', {
    key,
    code,
    bubbles: true,
    cancelable: true,
  });

const createTabEvent = (): KeyboardEvent => createKeyEvent('Tab');

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  delete window.electron;
});

test('keybindings dispatch enabled completion Tab command', () => {
  const commands = useCommandsStore();
  const keybindings = useKeybindingsStore();
  const handler = vi.fn();
  const command: Command = {
    command: 'accept test autocomplete',
    keybindingContext: KEYBINDING_CONTEXTS.COMPLETION,
    defaultHotkeys: [{ key: 'Tab' }],
    handler,
  };

  commands.add(command);
  const popContext = keybindings.pushContext(KEYBINDING_CONTEXTS.COMPLETION);
  const event = createTabEvent();

  window.dispatchEvent(event);
  popContext();

  expect(event.defaultPrevented).toBe(true);
  expect(handler).toHaveBeenCalledOnce();
});

test('keybindings do not prevent disabled completion Tab command', () => {
  const commands = useCommandsStore();
  const keybindings = useKeybindingsStore();
  const handler = vi.fn();
  const command: Command = {
    command: 'disabled test autocomplete',
    keybindingContext: KEYBINDING_CONTEXTS.COMPLETION,
    defaultHotkeys: [{ key: 'Tab' }],
    disabled: () => true,
    handler,
  };

  commands.add(command);
  const popContext = keybindings.pushContext(KEYBINDING_CONTEXTS.COMPLETION);
  const event = createTabEvent();

  window.dispatchEvent(event);
  popContext();

  expect(event.defaultPrevented).toBe(false);
  expect(handler).not.toHaveBeenCalled();
});

test('keybindings sync resolved hotkeys to Electron preload', async () => {
  const setAppHotkeys = vi.fn();
  window.electron = { setAppHotkeys } as unknown as Window['electron'];
  const commands = useCommandsStore();
  const command: Command = {
    command: 'electron shortcut',
    keybindingContext: KEYBINDING_CONTEXTS.GLOBAL,
    defaultHotkeys: [{ key: '1', modifiers: ['Mod'] }],
    handler: vi.fn(),
  };

  useKeybindingsStore();
  commands.add(command);
  await nextTick();

  const mac = isMac();
  expect(setAppHotkeys).toHaveBeenLastCalledWith([
    { key: '1', control: !mac, meta: mac, alt: false, shift: false },
  ]);
});

test('keybindings match numeric row shortcuts by physical code fallback', () => {
  const commands = useCommandsStore();
  useKeybindingsStore();
  const handler = vi.fn();
  const command: Command = {
    command: 'numeric row shortcut',
    keybindingContext: KEYBINDING_CONTEXTS.SHELL,
    defaultHotkeys: [{ key: '1', modifiers: ['Mod'], data: { tabNumber: 1 } }],
    handler,
  };

  commands.add(command);
  const event = new KeyboardEvent('keydown', {
    key: '¡',
    code: 'Digit1',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });

  window.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  expect(handler).toHaveBeenCalledOnce();
  expect(handler.mock.calls[0]?.[1].data).toEqual({ tabNumber: 1 });
});

test('keybindings dispatch completion Tab before nested bubble handlers stop propagation', () => {
  const commands = useCommandsStore();
  const keybindings = useKeybindingsStore();
  const handler = vi.fn();
  const command: Command = {
    command: 'capture autocomplete',
    keybindingContext: KEYBINDING_CONTEXTS.COMPLETION,
    defaultHotkeys: [{ key: 'Tab' }],
    handler,
  };
  const input = document.createElement('input');
  input.addEventListener('keydown', (event) => event.stopPropagation());
  document.body.append(input);

  commands.add(command);
  const popContext = keybindings.pushContext(KEYBINDING_CONTEXTS.COMPLETION);
  const event = createTabEvent();

  input.dispatchEvent(event);
  popContext();
  input.remove();

  expect(event.defaultPrevented).toBe(true);
  expect(handler).toHaveBeenCalledOnce();
});

test('global keybindings do not dispatch from regular input', () => {
  const commands = useCommandsStore();
  useKeybindingsStore();
  const handler = vi.fn();
  const command: Command = {
    command: 'input global command',
    keybindingContext: KEYBINDING_CONTEXTS.GLOBAL,
    defaultHotkeys: [{ key: 'x' }],
    handler,
  };
  const input = document.createElement('input');
  document.body.append(input);

  commands.add(command);
  const event = createKeyEvent('x');

  input.dispatchEvent(event);
  input.remove();

  expect(event.defaultPrevented).toBe(false);
  expect(handler).not.toHaveBeenCalled();
});

test('shell keybindings dispatch from regular input', () => {
  const commands = useCommandsStore();
  useKeybindingsStore();
  const handler = vi.fn();
  const command: Command = {
    command: 'input shell command',
    keybindingContext: KEYBINDING_CONTEXTS.SHELL,
    defaultHotkeys: [{ key: 'x' }],
    handler,
  };
  const input = document.createElement('input');
  document.body.append(input);

  commands.add(command);
  const event = createKeyEvent('x');

  input.dispatchEvent(event);
  input.remove();

  expect(event.defaultPrevented).toBe(true);
  expect(handler).toHaveBeenCalledOnce();
});
