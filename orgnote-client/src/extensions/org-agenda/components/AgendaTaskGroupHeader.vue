<template>
  <app-spoiler v-model="expanded" variant="flat">
    <template #title>
      <app-title :level="5" no-margin>{{ group.fileTitle }}</app-title>
    </template>
    <template #actions>
      <app-flex row end align-center gap="xs">
        <app-badge :label="String(group.tasks.length)" size="xs" />
        <command-action-button
          :command="AGENDA_QUICK_ADD_TO_FILE_COMMAND"
          :data="{ filePath: group.filePath }"
          :aria-label="t(extensionI18nKeys.orgAgendaQuickAddAddButton)"
          size="xs"
        />
        <command-action-button
          :command="DefaultCommands.OPEN_NOTE"
          :data="{ path: group.filePath }"
          :aria-label="t(extensionI18nKeys.orgAgendaOpenNote)"
          size="xs"
        />
      </app-flex>
    </template>
  </app-spoiler>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import AppSpoiler from 'src/components/AppSpoiler.vue';
import AppTitle from 'src/components/AppTitle.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppBadge from 'src/components/AppBadge.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import type { AgendaTaskGroup } from '../composables/use-agenda-tasks';
import { DefaultCommands } from 'orgnote-api';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';
import { AGENDA_QUICK_ADD_TO_FILE_COMMAND } from '../constants';

defineProps<{ group: AgendaTaskGroup }>();
const expanded = defineModel<boolean>('expanded', { default: true });
const { t } = useI18n({ useScope: 'global', inheritLocale: true });
</script>
