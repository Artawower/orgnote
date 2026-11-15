import { setActivePinia, createPinia } from 'pinia';
import { test, expect, beforeEach } from 'vitest';
import { useCommandsStore } from './command';
import { useCommandsGroupStore } from './command-group';
import { COMMAND_GROUPS } from 'orgnote-api';
import type { Command, CommandGroup } from 'orgnote-api';

beforeEach(() => {
  setActivePinia(createPinia());
  process.env.CLIENT = 'true';
});

test('initializes with all command groups active', () => {
  const groupStore = useCommandsGroupStore();
  expect(groupStore.currentGroups).toEqual(COMMAND_GROUPS);
});

test('activates a new group', () => {
  const groupStore = useCommandsGroupStore();
  const newGroup: CommandGroup = 'custom-group';

  groupStore.activateGroup(newGroup);

  expect(groupStore.currentGroups).toContain(newGroup);
});

test('does not duplicate groups when activating an already active group', () => {
  const groupStore = useCommandsGroupStore();
  const existingGroup: CommandGroup = COMMAND_GROUPS[0];

  groupStore.activateGroup(existingGroup);

  // Check for no duplicates
  const occurrences = groupStore.currentGroups.filter((g) => g === existingGroup).length;
  expect(occurrences).toBe(1);
});

test('deactivates a group', () => {
  const groupStore = useCommandsGroupStore();
  const groupToDeactivate: CommandGroup = COMMAND_GROUPS[0];

  groupStore.deactivateGroup(groupToDeactivate);

  expect(groupStore.currentGroups).not.toContain(groupToDeactivate);
});

test('does nothing when deactivating a non-active group', () => {
  const groupStore = useCommandsGroupStore();
  const nonExistentGroup: CommandGroup = 'non-existent-group';

  groupStore.deactivateGroup(nonExistentGroup);

  expect(groupStore.currentGroups).toEqual(COMMAND_GROUPS); // State should remain unchanged
});

test('returns commands from a specific group', () => {
  const commandsStore = useCommandsStore();
  const groupStore = useCommandsGroupStore();
  const testCommand: Command = {
    command: 'test-command',
    group: COMMAND_GROUPS[0],
    handler: () => 'test-result',
  };

  commandsStore.add(testCommand);

  const groupCommands = groupStore.getCommandsByGroup(COMMAND_GROUPS[0]);
  expect(groupCommands).toEqual([testCommand]);
});

test('currentGroupsCommands returns commands belonging to active groups', () => {
  const commandsStore = useCommandsStore();
  const groupStore = useCommandsGroupStore();

  const commandInGroup: Command = {
    command: 'in-group',
    group: COMMAND_GROUPS[0],
    handler: () => 'result1',
  };
  const commandOutOfGroup: Command = {
    command: 'out-of-group',
    group: 'inactive-group' as CommandGroup,
    handler: () => 'result2',
  };

  commandsStore.add(commandInGroup, commandOutOfGroup);

  expect(groupStore.currentGroupsCommands).toEqual([commandInGroup]);
});

test('updates currentGroupsCommands when a group is activated', () => {
  const commandsStore = useCommandsStore();
  const groupStore = useCommandsGroupStore();
  const newGroup: CommandGroup = 'custom-group';
  const newGroupCommand: Command = {
    command: 'new-group-command',
    group: newGroup,
    handler: () => 'new-result',
  };

  commandsStore.add(newGroupCommand);
  groupStore.activateGroup(newGroup);

  expect(
    groupStore.currentGroupsCommands.find((c) => c.command === newGroupCommand.command),
  ).toBeTruthy();
});

test('updates currentGroupsCommands when a group is deactivated', async () => {
  const commandsStore = useCommandsStore();
  const groupStore = useCommandsGroupStore();

  const testGroup = COMMAND_GROUPS[0];
  const testCommand: Command = {
    command: 'test-command',
    group: testGroup,
    handler: () => 'result',
  };

  commandsStore.add(testCommand);
  expect(
    groupStore.currentGroupsCommands.find((c) => c.command === testCommand.command),
  ).toBeTruthy();

  groupStore.deactivateGroup(testGroup);
  expect(
    groupStore.currentGroupsCommands.find((c) => c.command === testCommand.command),
  ).toBeFalsy();
});
