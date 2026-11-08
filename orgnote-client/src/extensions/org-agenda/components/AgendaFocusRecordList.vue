<template>
  <app-flex v-if="groups.length" column start align-stretch gap="sm" class="focus-record-list">
    <app-spoiler v-for="group in groups" :key="group.filePath" variant="flat" default-expanded>
      <template #title>
        <app-title :level="5" no-margin>{{ group.fileTitle }}</app-title>
      </template>
      <template #actions>
        <app-badge :label="String(group.records.length)" size="xs" />
      </template>
      <template #body>
        <menu-group>
          <menu-item
            v-for="record in group.records"
            :key="`${record.taskStart}:${record.startTime}`"
            :capitalize="false"
            flat
            @click="emit('select-record', record, group.filePath)"
          >
            <app-flex column align-start gap="xxs" class="record-content">
              <overflow-line class="record-title">{{ record.taskText }}</overflow-line>
              <span class="record-time">{{ record.timeRange }}</span>
            </app-flex>
            <template #right>
              <span class="record-duration">{{ record.duration }}</span>
            </template>
          </menu-item>
        </menu-group>
      </template>
    </app-spoiler>
  </app-flex>
</template>

<script lang="ts" setup>
import AppBadge from 'src/components/AppBadge.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppSpoiler from 'src/components/AppSpoiler.vue';
import AppTitle from 'src/components/AppTitle.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import OverflowLine from 'src/components/OverflowLine.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import type {
  AgendaFocusRecordItem,
  AgendaFocusRecordListProps,
} from './agenda-focus-record-types';

defineProps<AgendaFocusRecordListProps>();

const emit = defineEmits<{
  'select-record': [record: AgendaFocusRecordItem, filePath: string];
}>();
</script>

<style lang="scss" scoped>
.focus-record-list {
  width: 100%;
}

.record-content {
  min-width: 0;
  white-space: normal;
}

.record-title {
  @include fontify(var(--font-size-sm), var(--font-weight-regular), var(--fg));
}

.record-time {
  @include fontify(var(--font-size-xs), var(--font-weight-regular), var(--fg-muted));
}

.record-duration {
  @include fontify(var(--font-size-sm), var(--font-weight-regular), var(--fg-muted));
  white-space: nowrap;
}
</style>
