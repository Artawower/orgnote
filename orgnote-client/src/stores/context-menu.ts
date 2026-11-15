import type { CommandContext, ContextMenuStore, MenuAction, MenuGroupParams } from 'orgnote-api';
import { defineStore } from 'pinia';
import { reactive, type Ref } from 'vue';
import { usePinnedCommandsStore } from './pinned-commands';

export const useContextMenuStore = defineStore<'contextMenu', ContextMenuStore>(
  'contextMenu',
  () => {
    const commandsToMenuActions = (commands: Ref<string[]>): MenuAction[] =>
      commands.value.map((command) => ({ command }));

    const pinnedCommands = usePinnedCommandsStore();

    const groupBindings = reactive<Map<string, CommandContext>>(new Map());

    const pluginActions = reactive<Map<string, MenuAction[]>>(new Map());

    const registerGroup = (group: string, params?: { commandContext?: CommandContext }) => {
      if (groupBindings.has(group)) return;
      groupBindings.set(group, params?.commandContext ?? group);
    };

    const updateContextGroup = (group: string, params: MenuGroupParams) => {
      pluginActions.set(group, [...params.items]);
    };

    const addContextMenuAction = (group: string, action: MenuAction) => {
      const existing = pluginActions.get(group);
      if (!existing) {
        pluginActions.set(group, [action]);
        return;
      }
      existing.push(action);
    };

    const removeContextMenuAction = (group: string, action: MenuAction) => {
      const existing = pluginActions.get(group);
      if (!existing) return;

      const index = existing.indexOf(action);
      if (index !== -1) {
        existing.splice(index, 1);
      }
    };

    const getContextMenuActions = (group: string): MenuAction[] => {
      const boundContext = groupBindings.get(group);
      const baseActions = boundContext
        ? commandsToMenuActions(pinnedCommands.getCommands(boundContext))
        : [];
      const overrides = pluginActions.get(group) ?? [];
      return [...baseActions, ...overrides];
    };

    registerGroup('file', { commandContext: 'context-menu-file' });
    registerGroup('dir', { commandContext: 'context-menu-dir' });
    registerGroup('tab', { commandContext: 'file-actions' });
    registerGroup('org-link', { commandContext: 'context-menu-org-link' });
    registerGroup('external-link', { commandContext: 'context-menu-external-link' });

    const store: ContextMenuStore = {
      registerGroup,
      updateContextGroup,
      addContextMenuAction,
      removeContextMenuAction,
      getContextMenuActions,
    };

    return store;
  },
);
