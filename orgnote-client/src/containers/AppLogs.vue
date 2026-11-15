<template>
  <app-flex class="logs" column start align-stretch gap="md">
    <app-dropdown
      v-model="selectedLogLevelOption"
      :options="logLevelOptions"
      option-label="label"
      class="log-filter"
    >
    </app-dropdown>

    <app-card class="error-log-card">
      <div class="store-errors">
        <div class="log-list">
          <template v-if="hasFallbackErrors">
            <app-title :level="5">{{ $t(I18N.BOOT_ERRORS) }}</app-title>
            <log-entry
              v-for="(log, index) in fallbackLogs"
              :key="index"
              :log="log"
              :position="fallbackLogs.length - index"
            />
          </template>

          <template v-if="hasStoreLogs">
            <log-entry
              v-for="(log, index) in filteredLogs"
              :key="index"
              :log="log"
              :position="getLogPosition(index)"
            />
          </template>
        </div>

        <p v-if="hasStoreLogs && filteredLogs.length === 0" class="no-filtered-logs">
          {{ $t(I18N.NO_LOGS_MATCH_BY_FILTER) }}
        </p>
      </div>

      <p v-if="!hasFallbackErrors && !hasStoreLogs" class="no-errors">
        {{ $t(I18N.NO_ERRORS) }}
      </p>
    </app-card>
  </app-flex>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import AppCard from 'src/components/AppCard.vue';
import AppDropdown from 'src/components/AppDropdown.vue';
import LogEntry from 'src/components/LogEntry.vue';
import { useAppLogs } from 'src/composables/useAppLogs';
import { I18N, type LogLevel } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';
import AppTitle from 'src/components/AppTitle.vue';

interface LogLevelOption {
  label: string;
  value: LogLevel;
}

const { fallbackLogs, hasFallbackErrors, storeLogs, hasStoreLogs, errorLogText } = useAppLogs();

const logLevelOptions: LogLevelOption[] = [
  { label: 'All levels', value: null as unknown as LogLevel },
  { label: 'Error', value: 'error' },
  { label: 'Warning', value: 'warn' },
  { label: 'Info', value: 'info' },
  { label: 'Debug', value: 'debug' },
  { label: 'Trace', value: 'trace' },
];

const selectedLogLevelOption = ref<LogLevelOption | null>(logLevelOptions[0]!);

const filteredLogs = computed(() => {
  if (!selectedLogLevelOption.value || !selectedLogLevelOption.value.value) {
    return storeLogs.value;
  }
  return storeLogs.value.filter((log) => log.level === selectedLogLevelOption.value?.value);
});

const getLogPosition = (index: number): number => {
  if (!selectedLogLevelOption.value) {
    return storeLogs.value.length - index;
  }
  const log = filteredLogs.value[index];
  if (!log) return 0;

  const originalIndex = storeLogs.value.indexOf(log);
  return storeLogs.value.length - originalIndex;
};

const getErrorLogText = (): string => {
  return errorLogText.value;
};

defineExpose({
  getErrorLogText,
});
</script>

<style scoped lang="scss">
.logs {
  & {
    height: 100%;
  }
}

.error-log-card {
  @include fit;

  & {
    overflow-y: auto;
  }

  :deep(.card-content) {
    flex-direction: column;
    align-items: stretch;
  }
}

.store-errors {
  margin-bottom: var(--margin-lg);

  &:last-child {
    margin-bottom: 0;
  }
}

.store-errors-header {
  & {
    margin-bottom: var(--margin-md);
  }

  @include mobile {
    flex-direction: column;
    align-items: flex-start;
  }
}

.log-filter {
  width: 100%;
}

.section-title {
  @include fontify(var(--font-size-lg), var(--font-weight-bold), var(--fg));

  & {
    margin: 0 0 var(--margin-md) 0;
    padding-bottom: var(--padding-xs);
    border-bottom: 2px solid var(--border-default);
  }
}

.log-list {
  display: flex;
  flex-direction: column;
}

.no-errors,
.no-filtered-logs {
  @include fontify(var(--font-size-base), var(--font-weight-normal), var(--fg-muted));

  & {
    margin: 0;
    font-style: italic;
    text-align: center;
    padding: var(--padding-lg);
  }
}
</style>
