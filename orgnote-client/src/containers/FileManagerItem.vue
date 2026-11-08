<template>
  <context-menu
    :group="contextMenuGroup"
    :data="{ path: file?.path }"
    :disabled="isSystemPath"
    @open="handleContextMenuOpen"
  >
    <menu-item :data-file-manager-active="active || undefined" :size="size" :active="active">
      <app-flex class="file-info" row start align-center gap="sm">
        <app-checkbox
          v-if="selectionMode && !root"
          :model-value="selected ?? false"
          @change="emits('toggleSelection')"
          @click.stop
        />
        <app-icon
          :name="file?.type === 'directory' || root ? 'sym_o_folder' : 'sym_o_draft'"
          size="sm"
        />
        <div class="name">
          <span v-if="root"> .. </span>
          <template v-else>
            <highlighter
              v-if="hasHighlight"
              class="my-highlight"
              highlightClassName="highlight"
              :searchWords="highlight ?? []"
              :autoEscape="true"
              :textToHighlight="file?.name ?? ''"
            />
            <span v-else>{{ file?.name ?? '' }}</span>
            <q-tooltip v-if="file?.name" :delay="tooltipDelay">{{ file.name }}</q-tooltip>
          </template>
        </div>
      </app-flex>
    </menu-item>
  </context-menu>
</template>

<script lang="ts" setup>
import { ORGNOTE_SYSTEM_ROOT_PATH, type DiskFile, type MenuGroup, type StyleSize } from 'orgnote-api';
import AppCheckbox from 'src/components/AppCheckbox.vue';
import AppIcon from 'src/components/AppIcon.vue';
import MenuItem from './MenuItem.vue';
import Highlighter from 'vue-highlight-words';
import ContextMenu from 'src/components/ContextMenu.vue';
import { computed } from 'vue';
import { api } from 'src/boot/api';
import AppFlex from 'src/components/AppFlex.vue';
import { useConfigStore } from 'src/stores/config';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  highlight?: string[];
  file?: DiskFile;
  root?: boolean;
  size?: StyleSize;
  active?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
}>();

const emits = defineEmits<{
  (e: 'toggleSelection'): void;
}>();

const fm = api.core.useFileManager();
const { config } = storeToRefs(useConfigStore());

const hasHighlight = computed(() =>
  (props.highlight ?? []).some((keyword) => keyword.trim().length > 0),
);
const tooltipDelay = computed(() => config.value.ui.tooltipDelay);

const contextMenuGroup = computed<MenuGroup>(() =>
  props.file?.type === 'directory' ? 'dir' : 'file',
);

const isSystemPath = computed(() =>
  props.file?.path?.startsWith(`/${ORGNOTE_SYSTEM_ROOT_PATH}`),
);

const handleContextMenuOpen = () => {
  if (!props.file) {
    return;
  }
  fm.focusFile = props.file;
};
</script>

<style lang="scss" scoped>
:deep(.left) {
  overflow: hidden;
}

.file-info {
  min-width: 0;
  overflow: hidden;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
