<template>
  <app-flex class="file-manager" :class="{ compact }" column start align-start gap="md">
    <div class="actions">
      <action-buttons v-if="selectionMode && !pickDir" horizontal position="left">
        <command-action-button :command="DefaultCommands.COPY_FILE" :size="iconSize" />
        <command-action-button :command="DefaultCommands.MOVE_FILE" :size="iconSize" />
        <command-action-button :command="DefaultCommands.DELETE_FILE" :size="iconSize" />
        <command-action-button :command="DefaultCommands.DESELECT_ALL_FILES" :size="iconSize" />
      </action-buttons>
      <action-buttons v-else horizontal :position="compact ? 'left' : 'right'">
        <command-action-button
          v-if="pendingOperation"
          :command="DefaultCommands.EXECUTE_PENDING_FILE_OPERATION"
          :size="iconSize"
        />
        <command-action-button
          v-if="pendingOperation"
          :command="DefaultCommands.CANCEL_PENDING_FILE_OPERATION"
          :size="iconSize"
        />
        <action-button
          @click="emits('dirPicked', targetPath)"
          v-if="pickDir"
          icon="sym_o_folder_check_2"
        >
          <template #text>{{ t(I18N.PICK_FOLDER) }}</template>
        </action-button>

        <command-action-button
          v-if="compact"
          :command="DefaultCommands.MAXIMIZE_FILE_MANAGER"
          :size="iconSize"
        >
        </command-action-button>
        <command-action-button
          v-if="!compact"
          :command="DefaultCommands.CREATE_NOTE"
          :size="iconSize"
        ></command-action-button>
        <command-action-button :command="DefaultCommands.CREATE_FOLDER" :size="iconSize">
        </command-action-button>
        <command-action-button :command="DefaultCommands.SORT_FILES" :size="iconSize" />
        <action-button @click="emits('close')" v-if="closable" icon="close" :size="iconSize" />
      </action-buttons>
    </div>
    <div class="file-manager-wrapper">
      <div v-if="showHeaderSearch" class="file-manager-header">
        <search-input
          appearance="field"
          icon="search"
          :size="compact ? 'xs' : 'sm'"
          v-model="searchQuery"
          :placeholder="I18N.SEARCH"
        />
      </div>
      <div ref="fileList" class="file-list">
        <menu-group :title="targetPath ?? '/'">
          <div v-if="isLoading" class="loading-wrapper" :class="{ compact }">
            <loading-dots />
          </div>
          <template v-else>
            <file-manager-item
              v-if="targetPath && targetPath !== '/'"
              @click="moveUp"
              root
              :size="menuItemSize"
            />
            <file-manager-item
              v-for="f of searchFiles"
              :key="f.path"
              v-memo="[
                f,
                searchHighlightKeywords,
                menuItemSize,
                isActiveFile(f),
                selectionMode,
                selectedFiles.has(f.path),
              ]"
              :highlight="searchHighlightKeywords"
              :file="f"
              :size="menuItemSize"
              :active="isActiveFile(f)"
              :selection-mode="selectionMode"
              :selected="selectedFiles.has(f.path)"
              @click="handleFileClick(f, $event)"
              @toggle-selection="fm.toggleSelection(f.path)"
            />
          </template>
        </menu-group>
      </div>
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import type { StyleSize } from 'orgnote-api';
import { DefaultCommands, getParentDir, I18N, join, parseBufferUri, withRoot } from 'orgnote-api';
import type { DiskFile } from 'orgnote-api';
import { api } from 'src/boot/api';
import FileManagerItem from './FileManagerItem.vue';
import SearchInput from 'src/components/SearchInput.vue';
import ActionButtons from 'src/components/ActionButtons.vue';
import { computed, nextTick, ref, watch } from 'vue';
import CommandActionButton from './CommandActionButton.vue';
import ActionButton from 'src/components/ActionButton.vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import AppFlex from 'src/components/AppFlex.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import LoadingDots from 'src/components/LoadingDots.vue';

const props = defineProps<{
  path?: string;
  tree?: boolean;
  compact?: boolean;
  pickDir?: boolean;
  closable?: boolean;
}>();

const emits = defineEmits<{
  (e: 'close'): void;
  (e: 'dirPicked', path: string): void;
}>();

const menuItemSize = computed(() => (props.compact ? 'md' : 'auto'));

const fm = api.core.useFileManager();
const {
  path: targetPath,
  searchQuery,
  selectionMode,
  selectedFiles,
  pendingOperation,
  sortedFiles,
  files,
} = storeToRefs(fm);
if (props.path) {
  targetPath.value = props.path;
}

const searchHighlightKeywords = computed(() =>
  searchQuery.value.split(' ').filter((keyword) => keyword.trim().length > 0),
);
const normalizedQuery = computed(() => searchQuery.value.toLowerCase());
const searchFiles = computed(() =>
  sortedFiles.value.filter(
    (f) => !normalizedQuery.value || f.name.toLowerCase().includes(normalizedQuery.value),
  ),
);
const isLoading = ref(true);

const bufferViewer = api.core.useBufferViewer();
const configStore = api.core.useConfig();
const sidebar = api.ui.useSidebar();
const paneStore = api.core.usePane();

const handleFileClick = async (f: DiskFile, event?: MouseEvent) => {
  if (event?.ctrlKey || event?.metaKey) {
    fm.toggleSelection(f.path);
    return;
  }

  if (selectionMode.value) {
    fm.toggleSelection(f.path);
    return;
  }

  if (f.type === 'directory') {
    targetPath.value = withRoot(join(targetPath.value, f.name));
    return;
  }

  bufferViewer.open(f.path);
  closeMobileSidebar();
};

const { tabletBelow } = api.ui.useScreenDetection();

const showHeaderSearch = computed(() => !props.compact || !tabletBelow.value);

const closeMobileSidebar = () => {
  if (tabletBelow.value) {
    sidebar.close();
  }
};

const moveUp = () => {
  targetPath.value = withRoot(getParentDir(targetPath.value));
};

const iconSize = computed<StyleSize>(() => (props.compact ? 'sm' : 'md'));

const activeFilePath = computed<string | undefined>(() => {
  const uri = paneStore.activeBufferUri;
  if (!uri) return;
  const parsedUri = parseBufferUri(uri);
  if (parsedUri.scheme !== 'file') return;
  return parsedUri.path;
});

const isActiveFile = (file: DiskFile): boolean => {
  if (file.type !== 'file' || !activeFilePath.value) return false;
  return file.path === activeFilePath.value;
};

const ACTIVE_FILE_SELECTOR = '[data-file-manager-active]';
const fileList = ref<HTMLElement>();
const followActiveBuffer = computed(
  () => !!configStore.config.ui.followActiveBufferInSidebar && sidebar.opened,
);
const scrollToActiveFile = async (): Promise<void> => {
  if (!followActiveBuffer.value || !activeFilePath.value) return;
  await nextTick();
  const activeFile = fileList.value?.querySelector<HTMLElement>(ACTIVE_FILE_SELECTOR);
  activeFile?.scrollIntoView({ block: 'nearest' });
};

watch([activeFilePath, searchFiles, followActiveBuffer], scrollToActiveFile, {
  flush: 'post',
  immediate: true,
});

watch(
  targetPath,
  () => {
    isLoading.value = true;
  },
  { immediate: true },
);

watch(
  files,
  () => {
    isLoading.value = false;
  },
  { immediate: true },
);

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>

<style lang="scss" scoped>
.file-manager-header,
.file-list {
  padding: 0 var(--padding-lg);
}

.actions {
  padding: var(--sidebar-padding);
}

.file-list {
  padding-bottom: var(--scroll-bottom-padding, 0);
}

.file-manager-wrapper {
  @include flexify(column, flex-start, center, var(--gap-md));

  overflow: hidden;
}

.file-manager {
  & {
    @include fit;
  }

  div {
    width: 100%;
  }
}

.file-list {
  overflow: auto;
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--menu-item-height);
  padding: var(--menu-item-padding);

  &.compact {
    min-height: var(--menu-item-height-md);
    padding: var(--padding-sm) calc(var(--padding-sm) * 2);
  }
}
</style>
