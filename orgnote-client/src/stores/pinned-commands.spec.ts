import { test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePinnedCommandsStore } from './pinned-commands';
import { DefaultCommands } from 'orgnote-api';

beforeEach(() => {
  setActivePinia(createPinia());
});

test('usePinnedCommandsStore should initialize sidebar with default commands', () => {
  const store = usePinnedCommandsStore();
  const commands = store.getCommands('sidebar');
  expect(commands.value).toContain(DefaultCommands.TOGGLE_FILE_MANAGER);
  expect(commands.value).toContain(DefaultCommands.CREATE_NOTE);
  expect(commands.value).toContain(DefaultCommands.SEARCH);
});

test('usePinnedCommandsStore should initialize sidebar-footer with default commands', () => {
  const store = usePinnedCommandsStore();
  const commands = store.getCommands('sidebar-footer');
  expect(commands.value).toContain(DefaultCommands.TOGGLE_COMMANDS);
  expect(commands.value).toContain(DefaultCommands.SETTINGS);
});

test('usePinnedCommandsStore should initialize right-sidebar with default commands', () => {
  const store = usePinnedCommandsStore();
  const commands = store.getCommands('right-sidebar');
  expect(commands.value).toContain(DefaultCommands.TOGGLE_RIGHT_SIDEBAR);
  expect(commands.value).toContain(DefaultCommands.OPEN_NOTIFICATIONS);
  expect(commands.value).toContain(DefaultCommands.TOGGLE_AST_DEBUGGER);
});

test('usePinnedCommandsStore should initialize edit-toolbar with default commands', () => {
  const store = usePinnedCommandsStore();
  const commands = store.getCommands('edit-toolbar');
  expect(commands.value).toContain(DefaultCommands.TOGGLE_SIDEBAR);
  expect(commands.value).toContain(DefaultCommands.CREATE_NOTE);
});

test('usePinnedCommandsStore.getCommands should return empty array for unknown context', () => {
  const store = usePinnedCommandsStore();
  const commands = store.getCommands('unknown-context');
  expect(commands.value).toEqual([]);
});

test('usePinnedCommandsStore.addCommand should add command to context', () => {
  const store = usePinnedCommandsStore();
  store.addCommand('custom-context', 'custom-command');
  const commands = store.getCommands('custom-context');
  expect(commands.value).toContain('custom-command');
});

test('usePinnedCommandsStore.addCommand should not add duplicate command', () => {
  const store = usePinnedCommandsStore();
  store.addCommand('custom-context', 'cmd1');
  store.addCommand('custom-context', 'cmd1');
  const commands = store.getCommands('custom-context');
  expect(commands.value.filter((c) => c === 'cmd1').length).toBe(1);
});

test('usePinnedCommandsStore.removeCommand should remove command from context', () => {
  const store = usePinnedCommandsStore();
  store.addCommand('custom-context', 'to-remove');
  store.removeCommand('custom-context', 'to-remove');
  const commands = store.getCommands('custom-context');
  expect(commands.value).not.toContain('to-remove');
});

test('usePinnedCommandsStore.removeCommand should do nothing for non-existent command', () => {
  const store = usePinnedCommandsStore();
  store.addCommand('custom-context', 'existing');
  store.removeCommand('custom-context', 'non-existent');
  const commands = store.getCommands('custom-context');
  expect(commands.value).toContain('existing');
});

test('usePinnedCommandsStore.removeCommand should do nothing for non-existent context', () => {
  const store = usePinnedCommandsStore();
  store.removeCommand('non-existent-context', 'any-command');
  const commands = store.getCommands('non-existent-context');
  expect(commands.value).toEqual([]);
});

test('usePinnedCommandsStore should isolate commands between contexts', () => {
  const store = usePinnedCommandsStore();
  store.addCommand('context-a', 'cmd-a');
  store.addCommand('context-b', 'cmd-b');

  const commandsA = store.getCommands('context-a');
  const commandsB = store.getCommands('context-b');

  expect(commandsA.value).toContain('cmd-a');
  expect(commandsA.value).not.toContain('cmd-b');
  expect(commandsB.value).toContain('cmd-b');
  expect(commandsB.value).not.toContain('cmd-a');
});

test('usePinnedCommandsStore should persist state across multiple accesses', () => {
  const store1 = usePinnedCommandsStore();
  store1.addCommand('test-context', 'persisted-cmd');

  const store2 = usePinnedCommandsStore();
  const commands = store2.getCommands('test-context');
  expect(commands.value).toContain('persisted-cmd');
});

test('usePinnedCommandsStore.addCommand should work with existing predefined context', () => {
  const store = usePinnedCommandsStore();
  const initialLength = store.getCommands('sidebar').value.length;
  store.addCommand('sidebar', 'new-sidebar-cmd');
  expect(store.getCommands('sidebar').value.length).toBe(initialLength + 1);
  expect(store.getCommands('sidebar').value).toContain('new-sidebar-cmd');
});

test('usePinnedCommandsStore.removeCommand should work with predefined context', () => {
  const store = usePinnedCommandsStore();
  store.removeCommand('sidebar', DefaultCommands.TOGGLE_FILE_MANAGER);
  expect(store.getCommands('sidebar').value).not.toContain(DefaultCommands.TOGGLE_FILE_MANAGER);
});

test('usePinnedCommandsStore.getCommands should be reactive to addCommand', () => {
  const store = usePinnedCommandsStore();
  const commands = store.getCommands('reactive-test');
  expect(commands.value).toEqual([]);

  store.addCommand('reactive-test', 'new-cmd');
  expect(commands.value).toContain('new-cmd');
});

test('usePinnedCommandsStore.getCommands should be reactive to removeCommand', () => {
  const store = usePinnedCommandsStore();
  store.addCommand('reactive-test-2', 'cmd-to-remove');
  const commands = store.getCommands('reactive-test-2');
  expect(commands.value).toContain('cmd-to-remove');

  store.removeCommand('reactive-test-2', 'cmd-to-remove');
  expect(commands.value).not.toContain('cmd-to-remove');
});
