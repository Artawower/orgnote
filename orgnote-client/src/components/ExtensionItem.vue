<template>
  <card-wrapper class="extension-item" padding>
    <app-flex row between align-start gap="md">
      <app-flex gap="md" align-start>
        <app-icon :name="categoryIcon" color="accent" size="md" />

        <app-flex column gap="xs" align-start>
          <span class="extension-name">{{ manifest.name }}</span>
          <span class="extension-subtitle">
            <template v-if="manifest.version">v{{ manifest.version }}</template>
            <template v-if="sourceLabel"> ({{ sourceLabel }})</template>
          </span>
        </app-flex>
      </app-flex>

      <app-flex gap="sm" align="center" class="extension-actions">
        <template v-if="isInstalled">
          <action-button
            v-if="isActive && extensionStore.hasExtensionSettings(manifest.name)"
            @click.stop="$emit('openSettings', manifest.name)"
            size="sm"
            color="fg"
            icon="sym_o_settings"
            :tooltip="t(i18n.EXTENSION_SETTINGS)"
          />
          <toggle-button :model-value="isActive" @update:model-value="toggleActive" />
          <action-button
            v-if="!isBuiltin"
            @click.stop="$emit('delete', manifest.name)"
            size="sm"
            color="red"
            icon="sym_o_delete"
            :tooltip="t(i18n.DELETE_EXTENSION)"
          />
        </template>

        <action-button
          v-else
          @click.stop="handleInstall"
          size="sm"
          color="green"
          outline
          border
          icon="sym_o_download"
          :tooltip="t(i18n.INSTALL_EXTENSION)"
        />
      </app-flex>
    </app-flex>

    <app-description v-if="manifest.description" class="extension-description">
      {{ manifest.description }}
    </app-description>

    <app-flex
      v-if="manifest.keywords?.length"
      gap="xs"
      class="extension-keywords"
      wrap
      justify="start"
    >
      <span class="keywords-label">{{ t(i18n.KEYWORDS) }}:</span>
      <app-badge v-for="keyword in manifest.keywords" :key="keyword" color="fg-muted" size="xs">
        {{ keyword }}
      </app-badge>
    </app-flex>
  </card-wrapper>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { api } from 'src/boot/api';
import { useI18n } from 'vue-i18n';
import type { ExtensionMeta, ExtensionManifest } from 'orgnote-api';
import { i18n } from 'orgnote-api';
import AppIcon from './AppIcon.vue';
import AppBadge from './AppBadge.vue';
import AppDescription from './AppDescription.vue';
import CardWrapper from './CardWrapper.vue';
import AppFlex from './AppFlex.vue';
import ToggleButton from './ToggleButton.vue';
import ActionButton from './ActionButton.vue';
import { EXTENSION_CATEGORY_ICONS, DEFAULT_EXTENSION_ICON } from 'src/constants/extension-category';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    extension: ExtensionMeta | ExtensionManifest;
    mode?: 'installed' | 'available';
  }>(),
  {
    mode: 'installed',
  },
);

const emit = defineEmits<{
  (e: 'enable', name: string): void;
  (e: 'disable', name: string): void;
  (e: 'delete', name: string): void;
  (e: 'install', manifest: ExtensionManifest): void;
  (e: 'openSettings', name: string): void;
}>();

const extensionStore = api.core.useExtensions();

const manifest = computed((): ExtensionManifest => {
  if ('manifest' in props.extension) {
    return props.extension.manifest;
  }
  return props.extension;
});

const isInstalled = computed(() => props.mode === 'installed');

const categoryIcon = computed(() => {
  return EXTENSION_CATEGORY_ICONS[manifest.value.category] ?? DEFAULT_EXTENSION_ICON;
});

const isActive = computed(() => {
  if (!isInstalled.value) {
    return false;
  }
  return (props.extension as ExtensionMeta).active ?? false;
});

const isBuiltin = computed(() => manifest.value.source.type === 'builtin');

const sourceLabel = computed(() => {
  const source = manifest.value.source;
  return source.type ?? '';
});

const toggleActive = (value: boolean) => {
  const name = manifest.value.name;
  if (value) {
    emit('enable', name);
    return;
  }
  emit('disable', name);
};

const handleInstall = () => {
  emit('install', manifest.value);
};
</script>

<style lang="scss" scoped>
.extension-item {
  width: 100%;
}

.extension-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--fg);
  line-height: var(--line-height-sm);
}

.extension-subtitle {
  font-size: var(--font-size-xs);
  color: var(--fg-muted);
  line-height: var(--line-height-sm);
}

.extension-description {
  margin-top: var(--padding-sm);
  font-size: var(--font-size-sm);
  color: var(--fg);
  line-height: var(--line-height-md);
}

.extension-keywords {
  margin-top: var(--padding-sm);
  align-items: center;
}

.keywords-label {
  font-size: var(--font-size-xs);
  color: var(--fg-muted);
  text-transform: uppercase;
  font-weight: var(--font-weight-medium);
}

.extension-actions {
  flex-shrink: 0;
}
</style>
