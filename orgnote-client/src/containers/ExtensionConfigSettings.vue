<template>
  <empty-state v-if="!hasSettings" :title="t(i18n.NO_EXTENSION_SETTINGS)" />
  <settings-scheme
    v-else
    :scheme="settingsSchema!"
    path="extension"
    :model-value="configValue"
    @update:model-value="onConfigUpdate"
  />
</template>

<script lang="ts" setup>
import { computed, provide, toRaw } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import { i18n } from 'orgnote-api';
import { valibotScheme } from 'src/models/valibot-scheme';
import SettingsScheme from './SettingsScheme.vue';
import EmptyState from 'src/components/EmptyState.vue';
import type { SectionAccessor } from 'src/models/settings-section-accessor';
import { SETTINGS_SECTION_INJECT_KEY } from 'src/models/settings-section-accessor';

const { extensionName } = defineProps<{ extensionName: string }>();
const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const extensionStore = api.core.useExtensions();

const settingsSchema = computed(() => {
  const schema = extensionStore.getActiveExtensionModule(extensionName)?.settingsSchema;
  return schema ? valibotScheme(schema) : null;
});

const hasSettings = computed(() => !!settingsSchema.value);

const extensionConfig = extensionStore.getExtensionConfig(extensionName);
const configValue = computed(
  () => structuredClone(toRaw(extensionConfig.value)) as Record<string, unknown>,
);

provide<SectionAccessor>(SETTINGS_SECTION_INJECT_KEY, {
  get: (key) => extensionConfig.value[key],
  set: (key, val) =>
    extensionStore.setExtensionConfig(extensionName, {
      ...toRaw(extensionConfig.value),
      [key]: val,
    }),
});

const onConfigUpdate = async (newConfig: Record<string, unknown>): Promise<void> => {
  await extensionStore.setExtensionConfig(extensionName, newConfig);
};
</script>
