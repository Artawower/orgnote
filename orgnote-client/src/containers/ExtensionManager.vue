<template>
  <file-uploader @uploaded="onUploaded" :accept="['js', 'json']" label="Drop extension here">
    <container-layout gap="md">
      <template #header>
        <app-flex between gap="md">
          <app-dropdown
            v-model="selectedTab"
            :options="tabOptions"
            option-label="label"
            :clearable="false"
            :use-input="false"
          />

          <action-button
            @click="refresh"
            color="fg"
            size="sm"
            outline
            border
            icon="sym_o_refresh"
            :tooltip="t(i18n.REFRESH)"
          />
        </app-flex>
      </template>

      <template #body>
        <app-flex column gap="sm" class="extensions-list">
          <app-flex v-if="isLoading" class="loading-container" center align-center>
            <loading-dots :text="t(i18n.LOADING)" />
          </app-flex>
          <empty-state v-else-if="displayedExtensions.length === 0" :title="t(emptyMessageKey)" />
          <extension-item
            v-else
            v-for="ext in displayedExtensions"
            :key="'manifest' in ext ? ext.manifest.name : ext.name"
            :extension="ext"
            :mode="currentMode"
            @enable="enableExtension"
            @disable="disableExtension"
            @delete="confirmDeleteExtension"
            @install="installExtension"
            @openSettings="openExtensionSettings"
          />
        </app-flex>
      </template>

      <template #footer>
        <menu-group>
          <menu-item type="info" @click="handleImportExtension" icon="sym_o_upload">
            {{ t(i18n.IMPORT_EXTENSION) }}
          </menu-item>
          <menu-item type="info" @click="openInstallFromUrl" icon="sym_o_link">
            {{ t(i18n.INSTALL_FROM_URL) }}
          </menu-item>
        </menu-group>
      </template>
    </container-layout>
  </file-uploader>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import type { ExtensionMeta, ExtensionManifest, GitSource } from 'orgnote-api';
import { DefaultCommands, i18n } from 'orgnote-api';
import MenuGroup from 'src/components/MenuGroup.vue';
import ActionButton from 'src/components/ActionButton.vue';
import AppDropdown from 'src/components/AppDropdown.vue';
import ExtensionItem from 'src/components/ExtensionItem.vue';
import MenuItem from './MenuItem.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import AppFlex from 'src/components/AppFlex.vue';
import EmptyState from 'src/components/EmptyState.vue';
import LoadingDots from 'src/components/LoadingDots.vue';
import FileUploader from 'src/components/FileUploader.vue';
import type { FileSystemFileEntry } from 'src/utils/file-traversal';
import { readFile } from 'src/utils/file-traversal';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import ExtensionConfigSettings from './ExtensionConfigSettings.vue';

interface TabOption {
  label: string;
  value: 'installed' | 'all';
}

const { t } = useI18n();

const tabOptions = computed<TabOption[]>(() => [
  { label: t(i18n.INSTALLED), value: 'installed' },
  { label: t(i18n.ALL_AVAILABLE), value: 'all' },
]);

const extensionStore = api.core.useExtensions();
const extensionRegistry = api.core.useExtensionRegistry();
const notifications = api.core.useNotifications();
const confirmationModal = api.ui.useConfirmationModal();

const selectedTab = ref<TabOption>(tabOptions.value[0]!);

const installedExtensions = computed(() => extensionStore.extensions ?? []);
const availableExtensions = computed(() => extensionRegistry.availableExtensions ?? []);

const displayedExtensions = computed<(ExtensionMeta | ExtensionManifest)[]>(() => {
  if (selectedTab.value.value === 'installed') {
    return installedExtensions.value;
  }
  return availableExtensions.value;
});

const currentMode = computed(() =>
  selectedTab.value.value === 'installed' ? 'installed' : 'available',
);

const isLoading = computed(() => {
  if (selectedTab.value.value !== 'all') {
    return false;
  }
  return extensionRegistry.loading;
});

const emptyMessageKey = computed(() => {
  if (selectedTab.value.value === 'installed') {
    return i18n.NO_EXTENSIONS_INSTALLED;
  }
  return i18n.NO_EXTENSIONS_AVAILABLE;
});

const refresh = async () => {
  await extensionStore.sync();
  await ensureAvailabileExtensions();
};

const ensureAvailabileExtensions = async (): Promise<void> => {
  if (availableExtensions.value.length) {
    return;
  }
  await extensionRegistry.refresh();
};

const modal = api.ui.useModal();

const openExtensionSettings = (extensionName: string): void => {
  modal.open(ExtensionConfigSettings, {
    title: extensionName,
    closable: true,
    wide: true,
    modalProps: { extensionName },
  });
};

const enableExtension = async (name: string) => {
  await extensionStore.enableExtension(name);
};

const disableExtension = async (name: string) => {
  await extensionStore.disableExtension(name);
};

const confirmDeleteExtension = async (name: string) => {
  const confirmed = await confirmationModal.confirm({
    title: i18n.DELETE_EXTENSION,
    message: i18n.CONFIRM_DELETE_EXTENSION,
    confirmText: i18n.DELETE,
    cancelText: i18n.CANCEL,
  });

  if (!confirmed) {
    return;
  }

  await extensionStore.deleteExtension(name);
};

const installExtension = async (manifest: ExtensionManifest) => {
  if (manifest.source.type !== 'git') {
    notifications.notify({ message: t(i18n.ONLY_GIT_EXTENSIONS_SUPPORTED), level: 'warning' });
    return;
  }
  await extensionStore.installExtension(manifest.source as GitSource);
  notifications.notify({ message: t(i18n.EXTENSION_INSTALLED), level: 'info' });
};

const handleImportExtension = () => {
  api.core.useCommands().execute(DefaultCommands.IMPORT_EXTENSION);
};

const openInstallFromUrl = async () => {
  const completion = api.core.useCompletion();

  const url = await completion.open<void, string>({
    type: 'input',
    placeholder: t(i18n.ENTER_GIT_REPO_URL),
    itemsGetter: () => ({ result: [], total: 0 }),
  });

  if (!url) {
    return;
  }

  const gitSource = { type: 'git' as const, repo: url };
  await extensionStore.installExtension(gitSource);
  notifications.notify({
    message: t(i18n.EXTENSION_INSTALLED_FROM_URL),
    level: 'info',
  });
};

const importExtension = async (entry: FileSystemFileEntry): Promise<void> => {
  const file = await readFile(entry);
  await extensionStore.importExtension(file);
  notifications.notify({ message: `Extension ${file.name} imported` });
};

const onUploaded = async (fileEntries: FileSystemFileEntry[]) => {
  const promises = fileEntries.map(async (entry) => {
    const result = await to(importExtension)(entry);
    if (result.isErr()) {
      reporter.reportError(new Error(`Failed to import ${entry.name}`, { cause: result.error }));
    }
  });

  await Promise.allSettled(promises);
};

onMounted(() => {
  refresh();
});
</script>

<style lang="scss" scoped>
.extensions-list {
  height: 100%;
  overflow-y: auto;
}

.loading-container {
  height: 100%;
  min-height: 200px;
}
</style>
