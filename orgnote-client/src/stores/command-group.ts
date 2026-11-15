import type { Command, CommandGroup, CommandsGroupStore } from 'orgnote-api'; //
import { COMMAND_GROUPS } from 'orgnote-api';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useCommandsStore } from './command';

export const useCommandsGroupStore = defineStore<'commands-group', CommandsGroupStore>(
  'commands-group',
  () => {
    const commandsStore = useCommandsStore();
    const currentGroups = ref<CommandGroup[]>([...COMMAND_GROUPS]);

    const currentGroupsCommands = computed(() => {
      return commandsStore.commands.filter((c) => c.group && currentGroups.value.includes(c.group));
    });

    const activateGroup = (group: CommandGroup) => {
      if (currentGroups.value.includes(group)) {
        return;
      }
      currentGroups.value.push(group);
    };

    const deactivateGroup = (group: CommandGroup) => {
      currentGroups.value = currentGroups.value.filter((g) => g !== group);
    };

    const getCommandsByGroup = (group: CommandGroup): Command[] => {
      return commandsStore.commands.filter((c) => c.group === group);
    };

    return {
      activateGroup,
      deactivateGroup,
      getCommandsByGroup,
      currentGroups,
      currentGroupsCommands,
    };
  },
);
