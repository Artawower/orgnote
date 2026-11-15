<template>
  <menu-group>
    <menu-item v-for="stat in statList" :key="stat.label" flat :capitalize="false">
      {{ stat.label }}
      <template #right>
        <span class="stat-value">{{ stat.value }}</span>
      </template>
    </menu-item>
  </menu-group>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { isToday } from 'date-fns';
import MenuGroup from 'src/components/MenuGroup.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import { extensionI18nKeys as i18nKeys } from 'src/constants/extension-i18n-keys';
import { useAgendaTasksStore } from '../stores/agenda-tasks-store';
import { formatDurationMin } from '../utils/format-duration';
import type { ClockEntry } from 'org-mode-ast';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const store = useAgendaTasksStore();

const clockDurationMin = (c: ClockEntry): number => {
  if (!c.to || !c.date) return 0;
  return Math.floor((new Date(c.to).getTime() - new Date(c.date).getTime()) / 60000);
};

const isValidClock = (c: ClockEntry): boolean => !!c.to && clockDurationMin(c) > 0;

const allClocks = computed<ClockEntry[]>(() =>
  store.allFiles.flatMap((file) =>
    (file.tasks ?? []).flatMap((task) => (task.clocks ?? []).filter(isValidClock)),
  ),
);

const todayClocks = computed(() =>
  allClocks.value.filter((c) => c.date && isToday(new Date(c.date))),
);

const statList = computed(() => [
  { label: t(i18nKeys.orgAgendaPomodoroTodayPomo), value: String(todayClocks.value.length) },
  {
    label: t(i18nKeys.orgAgendaPomodoroTodayFocus),
    value: formatDurationMin(todayClocks.value.reduce((s, c) => s + clockDurationMin(c), 0)),
  },
  { label: t(i18nKeys.orgAgendaPomodoroTotalPomo), value: String(allClocks.value.length) },
  {
    label: t(i18nKeys.orgAgendaPomodoroTotalFocus),
    value: formatDurationMin(allClocks.value.reduce((s, c) => s + clockDurationMin(c), 0)),
  },
]);
</script>

<style lang="scss" scoped>
.stat-value {
  @include fontify(var(--font-size-md), var(--font-weight-medium), false);
  white-space: nowrap;
}
</style>
