<template>
  <safe-area fit>
    <container-layout gap="lg">
      <app-description v-if="startupWallClock > 0" class="perf-summary" padded>
        Startup wall clock: {{ startupWallClock.toFixed(1) }}{{ t(I18N.MS) }} | Boot critical path:
        {{ bootCriticalPath.toFixed(1) }}{{ t(I18N.MS) }} | Measurements sum:
        {{ measurementsSum.toFixed(1) }}{{ t(I18N.MS) }} | {{ rows.length }}
        {{ t(I18N.MEASUREMENTS) }}
      </app-description>
      <easy-data-table
        class="perf-table"
        :headers="headers"
        :items="rows"
        hide-footer
        header-text-direction="left"
        body-text-direction="left"
      >
        <template #item-duration="{ duration }">
          <span class="tabular">{{ formatDuration(duration) }}</span>
        </template>
        <template #item-startTime="{ startTime }">
          <span class="tabular">{{ startTime.toFixed(1) }}</span>
        </template>
      </easy-data-table>

      <template #footer>
        <menu-group>
          <menu-item type="info" @click="handleCopyJson">
            {{ t(I18N.COPY) }}
          </menu-item>
          <menu-item type="warning" @click="handleClear">
            {{ t(I18N.CLEAR_MEASUREMENTS) }}
          </menu-item>
        </menu-group>
      </template>
    </container-layout>
  </safe-area>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { I18N } from 'orgnote-api';
import { useI18n } from 'vue-i18n';
import type { Header, Item } from 'vue3-easy-data-table';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import EasyDataTable from 'vue3-easy-data-table';
import MenuItem from 'src/containers/MenuItem.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import SafeArea from 'src/components/SafeArea.vue';
import { useInteractiveClipboard } from 'src/composables/use-interactive-clipboard';
import AppDescription from 'src/components/AppDescription.vue';
import {
  BOOT_SCOPE,
  reportVersion,
  getFullReport,
  getBrowserTimingReport,
  clearAllMeasurements,
} from 'src/boot/perf-timer';

const { t } = useI18n();
const { safeCopyToClipboard } = useInteractiveClipboard();

const SECTION_ORDER = ['Network', 'Paint', 'Boot', 'Resources'] as const;

const headers: Header[] = [
  { text: 'Section', value: 'section' },
  { text: 'Name', value: 'name' },
  { text: 'Type', value: 'type' },
  { text: 'Size', value: 'size' },
  { text: 'Duration (ms)', value: 'duration' },
  { text: 'Start (ms)', value: 'startTime' },
];

const formatBytes = (bytes: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (val: number): string => (val === 0 ? '\u2014' : val.toFixed(1));

type SectionName = (typeof SECTION_ORDER)[number];

type PerformanceRow = {
  section: SectionName;
  name: string;
  type: string;
  size: string;
  duration: number;
  startTime: number;
};

const sortRows = (a: PerformanceRow, b: PerformanceRow): number => {
  const ai = SECTION_ORDER.indexOf(a.section);
  const bi = SECTION_ORDER.indexOf(b.section);

  if (ai !== bi) return ai - bi;
  return a.startTime - b.startTime;
};

const toNetworkRows = (
  rows: ReturnType<typeof getBrowserTimingReport>['navigation'],
): PerformanceRow[] =>
  rows.map((phase) => ({
    section: 'Network',
    name: phase.name,
    type: '',
    size: '',
    duration: phase.duration,
    startTime: phase.startTime,
  }));

const toPaintRows = (rows: ReturnType<typeof getBrowserTimingReport>['paint']): PerformanceRow[] =>
  rows.map((paint) => ({
    section: 'Paint',
    name: paint.name,
    type: '',
    size: '',
    duration: 0,
    startTime: paint.startTime,
  }));

const toBootRows = (rows: ReturnType<typeof getFullReport>['measurements']): PerformanceRow[] =>
  rows.map((m) => ({
    section: 'Boot',
    name: m.name,
    type: m.scope,
    size: '',
    duration: m.duration,
    startTime: m.startTime,
  }));

const toResourceRows = (
  rows: ReturnType<typeof getBrowserTimingReport>['resources'],
): PerformanceRow[] =>
  rows.map((r) => ({
    section: 'Resources',
    name: r.name,
    type: r.type,
    size: formatBytes(r.size),
    duration: r.duration,
    startTime: r.startTime,
  }));

const rows = computed<Item[]>(() => {
  void reportVersion.value;

  const browser = getBrowserTimingReport();
  const bootRows = toBootRows(getFullReport().measurements);
  const allRows = [
    ...toNetworkRows(browser.navigation),
    ...toPaintRows(browser.paint),
    ...bootRows,
    ...toResourceRows(browser.resources),
  ].sort(sortRows);

  return allRows;
});

const customMeasurements = computed(() => {
  void reportVersion.value;
  return getFullReport().measurements;
});

const findMeasurement = (name: string, scope = BOOT_SCOPE) =>
  customMeasurements.value.find(
    (measurement) => measurement.name === name && measurement.scope === scope,
  );

const startupWallClock = computed<number>(() => {
  const start = findMeasurement('html-inline-script');
  const end = findMeasurement('splash-hidden');

  if (!start || !end) {
    return 0;
  }

  return Math.max(0, end.startTime - start.startTime);
});

const bootCriticalPath = computed<number>(() => {
  const total = customMeasurements.value.find(
    (measurement) => measurement.scope === 'boot' && measurement.name === 'total',
  );

  return total?.duration ?? 0;
});

const measurementsSum = computed<number>(() => {
  void reportVersion.value;
  return getFullReport().totalDuration;
});

const snapshotJson = (): string => {
  const report = getFullReport();
  const browserReport = getBrowserTimingReport();
  return JSON.stringify({ custom: report, browser: browserReport }, null, 2);
};

const handleCopyJson = (): void => {
  safeCopyToClipboard(snapshotJson());
};

const handleClear = (): void => {
  clearAllMeasurements();
};
</script>

<style lang="scss" scoped>
.tabular {
  font-variant-numeric: tabular-nums;
}

.perf-summary {
  margin: 0;
  padding: var(--padding-sm) 0;
  color: var(--fg-muted, #999);
  font-size: var(--font-size-sm, 0.85em);
}
</style>
