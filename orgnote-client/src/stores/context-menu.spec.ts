import { test, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useContextMenuStore } from './context-menu';
import { usePinnedCommandsStore } from './pinned-commands';
import { DefaultCommands } from 'orgnote-api';

beforeEach(() => {
  setActivePinia(createPinia());
});

test('useContextMenuStore tab group derives actions from file-actions pinned commands', () => {
  const store = useContextMenuStore();
  const actions = store.getContextMenuActions('tab');

  expect(actions).toEqual(
    expect.arrayContaining([
      { command: DefaultCommands.RENAME_FILE },
      { command: DefaultCommands.DELETE_FILE },
    ]),
  );
});

test('useContextMenuStore file group derives actions from context-menu-file pinned commands', () => {
  const store = useContextMenuStore();
  const actions = store.getContextMenuActions('file');

  expect(actions).toEqual(
    expect.arrayContaining([
      { command: DefaultCommands.CREATE_NOTE },
      { command: DefaultCommands.RENAME_FILE },
      { command: DefaultCommands.SELECT_FILE },
    ]),
  );
});

test('useContextMenuStore dir group derives actions from context-menu-dir pinned commands', () => {
  const store = useContextMenuStore();
  const actions = store.getContextMenuActions('dir');

  expect(actions).toEqual(
    expect.arrayContaining([
      { command: DefaultCommands.CREATE_FOLDER },
      { command: DefaultCommands.CREATE_NOTE },
    ]),
  );
});

test('useContextMenuStore org link group exposes open and copy actions', () => {
  const store = useContextMenuStore();
  const actions = store.getContextMenuActions('org-link');

  expect(actions).toEqual([
    { command: DefaultCommands.OPEN_LINK_IN_NEW_TAB },
    { command: DefaultCommands.OPEN_LINK_IN_ADJACENT_PANE },
    { command: DefaultCommands.COPY_LINK },
  ]);
});

test('useContextMenuStore external link group exposes only copy action', () => {
  const store = useContextMenuStore();

  expect(store.getContextMenuActions('external-link')).toEqual([
    { command: DefaultCommands.COPY_LINK },
  ]);
});

test('useContextMenuStore reacts to pinned commands changes', () => {
  const contextMenu = useContextMenuStore();
  const pinnedCommands = usePinnedCommandsStore();

  const actionsBefore = contextMenu.getContextMenuActions('tab');
  const countBefore = actionsBefore.length;

  pinnedCommands.addCommand('file-actions', 'custom-file-command');

  const actionsAfter = contextMenu.getContextMenuActions('tab');
  expect(actionsAfter.length).toBe(countBefore + 1);
  expect(actionsAfter).toEqual(expect.arrayContaining([{ command: 'custom-file-command' }]));
});

test('useContextMenuStore addContextMenuAction appends plugin actions after command-based', () => {
  const store = useContextMenuStore();
  const pluginAction = { command: 'plugin-action' };

  store.addContextMenuAction('tab', pluginAction);

  const actions = store.getContextMenuActions('tab');
  expect(actions[actions.length - 1]).toEqual(pluginAction);
});

test('useContextMenuStore removeContextMenuAction removes only plugin actions', () => {
  const store = useContextMenuStore();
  const pluginAction = { command: 'plugin-action' };

  store.addContextMenuAction('file', pluginAction);
  const countWithPlugin = store.getContextMenuActions('file').length;

  store.removeContextMenuAction('file', pluginAction);
  const countAfter = store.getContextMenuActions('file').length;

  expect(countAfter).toBe(countWithPlugin - 1);
});

test('useContextMenuStore registerGroup creates new empty group', () => {
  const store = useContextMenuStore();
  store.registerGroup('custom-group');

  expect(store.getContextMenuActions('custom-group')).toEqual([]);
});

test('useContextMenuStore registerGroup does not overwrite existing group', () => {
  const store = useContextMenuStore();
  const existingActions = store.getContextMenuActions('file');

  store.registerGroup('file');

  expect(store.getContextMenuActions('file')).toEqual(existingActions);
});

test('useContextMenuStore getContextMenuActions returns empty array for unknown group', () => {
  const store = useContextMenuStore();

  expect(store.getContextMenuActions('nonexistent')).toEqual([]);
});

test('useContextMenuStore registerGroup with commandContext binds to pinned commands', () => {
  const contextMenu = useContextMenuStore();
  const pinnedCommands = usePinnedCommandsStore();

  pinnedCommands.addCommand('my-context', 'ctx-cmd');
  contextMenu.registerGroup('plugin-group', { commandContext: 'my-context' });

  const actions = contextMenu.getContextMenuActions('plugin-group');
  expect(actions).toEqual([{ command: 'ctx-cmd' }]);
});

test('useContextMenuStore registerGroup allows adding plugin actions to new group', () => {
  const contextMenu = useContextMenuStore();

  contextMenu.registerGroup('custom');
  contextMenu.addContextMenuAction('custom', { command: 'cmd-a' });

  expect(contextMenu.getContextMenuActions('custom')).toEqual([{ command: 'cmd-a' }]);
});

test('useContextMenuStore updateContextGroup adds items as plugin overrides', () => {
  const store = useContextMenuStore();

  store.updateContextGroup('tab', {
    items: [{ command: 'override-cmd' }],
  });

  const actions = store.getContextMenuActions('tab');
  expect(actions).toEqual(expect.arrayContaining([{ command: 'override-cmd' }]));
});
