<template>
  <menu-group>
    <menu-item v-for="view in views" :key="view.uri" :active="activeBufferUri === view.uri" @click="onViewClick(view.uri)">
      <app-flex row start align-center gap="sm">
        <app-icon :name="view.icon" size="sm" />
        <span>{{ view.label }}</span>
      </app-flex>
    </menu-item>
  </menu-group>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import MenuGroup from 'src/components/MenuGroup.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';
import { api } from 'src/boot/api';
import { AGENDA_HABITS_URI, AGENDA_POMODORO_URI } from '../constants';

const emit = defineEmits<{ navigate: [uri: string] }>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const { activeBufferUri } = storeToRefs(api.core.usePane());

const views = computed(() => [
  {
    uri: AGENDA_HABITS_URI,
    label: t(extensionI18nKeys.orgAgendaViewHabits),
    icon: 'sym_o_check_circle_unread',
  },
  {
    uri: AGENDA_POMODORO_URI,
    label: t(extensionI18nKeys.orgAgendaViewPomodoro),
    icon: 'sym_o_timer',
  },
]);

const onViewClick = (uri: string): void => {
  emit('navigate', uri);
};
</script>
