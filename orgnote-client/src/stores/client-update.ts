import { defineStore } from 'pinia';
import type { Changelog, ChangelogRecord, ClientUpdateStore } from 'orgnote-api';
import { computed, ref, type Ref } from 'vue';
import { version as currentClientVersion } from '../../package.json';
import { sdk } from 'src/boot/axios';
import { isPresent, to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';

const isNonNullRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && isPresent(value);

const isValidChangelog = (value: unknown): value is Changelog => {
  if (!isNonNullRecord(value)) {
    return false;
  }

  return (
    typeof value.version === 'string' &&
    value.version.trim().length > 0 &&
    typeof value.changeLog === 'string' &&
    value.changeLog.trim().length > 0 &&
    typeof value.url === 'string' &&
    value.url.trim().length > 0
  );
};

interface ClientUpdateStoreState extends ClientUpdateStore {
  lastSeenVersion: Ref<string | null>;
  lastReadVersion: Ref<string | null>;
  latestChangelog: Ref<ChangelogRecord | null>;
}

const createChangelogRecord = (
  changelog: Changelog,
  fromVersion?: string,
): ChangelogRecord => ({
  version: changelog.version,
  changeLog: changelog.changeLog,
  url: changelog.url,
  fromVersion,
  detectedAt: new Date().toISOString(),
});

export const useClientUpdateStore = defineStore<'client-update', ClientUpdateStoreState>(
  'client-update',
  (): ClientUpdateStoreState => {
    const lastSeenVersion = ref<string | null>(null);
    const lastReadVersion = ref<string | null>(null);
    const latestChangelog = ref<ChangelogRecord | null>(null);
    const isRefreshing = ref(false);

    const updateChangelog = computed(() => latestChangelog.value);

    const unreadUpdateChangelog = computed(() => {
      if (!latestChangelog.value) {
        return null;
      }

      if (latestChangelog.value.version === lastReadVersion.value) {
        return null;
      }

      return latestChangelog.value;
    });

    const fetchChangelogByVersionDiff = async (
      fromVersion: string,
      currentVersion: string,
    ): Promise<ChangelogRecord | null> => {
      const result = await to(sdk.systemInfo.systemInfoClientUpdateVersionGet)(fromVersion);
      if (result.isErr()) {
        reporter.reportWarning(
          new Error(`Failed to detect client update from ${fromVersion}`, { cause: result.error }),
        );
        return null;
      }

      const changelog = result.value.data;
      if (!isValidChangelog(changelog)) {
        return null;
      }

      if (changelog.version !== currentVersion) {
        return null;
      }

      return createChangelogRecord(changelog, fromVersion);
    };

    const syncUpdateChangelog = async (): Promise<void> => {
      if (isRefreshing.value) return;

      isRefreshing.value = true;

      if (!lastSeenVersion.value) {
        lastSeenVersion.value = currentClientVersion;
        isRefreshing.value = false;
        return;
      }

      if (lastSeenVersion.value === currentClientVersion) {
        isRefreshing.value = false;
        return;
      }

      const fromVersion = lastSeenVersion.value;
      const result = await to(fetchChangelogByVersionDiff)(fromVersion, currentClientVersion);
      lastSeenVersion.value = currentClientVersion;
      isRefreshing.value = false;

      if (result.isErr()) {
        reporter.reportWarning(
          new Error(`Failed to sync changelog from ${fromVersion}`, { cause: result.error }),
        );
        return;
      }

      if (result.value) latestChangelog.value = result.value;
    };

    const hasCurrentVersionChangelog = (): boolean =>
      !!latestChangelog.value && latestChangelog.value.version === currentClientVersion;

    const loadLatestChangelog = async (
      options: { forceRefresh?: boolean } = {},
    ): Promise<ChangelogRecord | null> => {
      if (!options.forceRefresh && hasCurrentVersionChangelog()) {
        return latestChangelog.value;
      }

      const result = await to(sdk.systemInfo.systemInfoClientUpdateLatestGet)();
      if (result.isErr()) {
        reporter.reportWarning(new Error('Failed to fetch latest changelog', { cause: result.error }));
        return options.forceRefresh ? null : latestChangelog.value;
      }

      const changelog = result.value.data;
      if (!isValidChangelog(changelog)) {
        return options.forceRefresh ? null : latestChangelog.value;
      }

      const nextChangelog = createChangelogRecord(changelog);
      latestChangelog.value = nextChangelog;
      return nextChangelog;
    };

    const markChangelogAsRead = (): void => {
      if (!latestChangelog.value) {
        return;
      }

      lastReadVersion.value = latestChangelog.value.version;
      latestChangelog.value = {
        ...latestChangelog.value,
        viewedAt: new Date().toISOString(),
      };
    };

    return {
      lastSeenVersion,
      lastReadVersion,
      latestChangelog,
      updateChangelog,
      unreadUpdateChangelog,
      syncUpdateChangelog,
      loadLatestChangelog,
      markChangelogAsRead,
    };
  },
  {
    persist: {
      pick: ['lastSeenVersion', 'lastReadVersion', 'latestChangelog'],
    },
  },
);
