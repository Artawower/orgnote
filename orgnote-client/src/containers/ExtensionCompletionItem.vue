<template>
  <app-flex class="extension-item" row start align-center gap="md" full-width>
    <app-icon name="sym_o_extension" size="sm" />
    <span class="extension-name text-medium color-main line-limit-1">
      {{ extension.manifest.name }}
    </span>
    <span class="extension-description text-italic color-secondary line-limit-1">
      {{ extension.manifest.description }}
    </span>
    <app-flex class="extension-actions" row end align-center gap="sm" @click.stop>
      <action-button
        v-if="hasSettings"
        class="settings-action"
        icon="sym_o_settings"
        size="sm"
        color="fg"
        :tooltip="t(I18N.EXTENSION_SETTINGS)"
        @click.stop="openSettings"
      />
      <toggle-button
        class="toggle-action"
        :model-value="isActive"
        @update:model-value="toggleExtension"
      />
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import {
  DefaultCommands,
  I18N,
  type CompletionItemRendererProps,
  type ExtensionMeta,
} from 'orgnote-api';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppIcon from 'src/components/AppIcon.vue';
import ToggleButton from 'src/components/ToggleButton.vue';

const props = defineProps<CompletionItemRendererProps<ExtensionMeta>>();
const extensions = api.core.useExtensions();
const commands = api.core.useCommands();
const { t } = useI18n();

const extension = computed(() => props.candidate.data);
const extensionName = computed(() => extension.value.manifest.name);
const isActive = computed(() => Boolean(extension.value.active));
const hasSettings = computed(() => extensions.hasExtensionSettings(extensionName.value));

const toggleExtension = (): void => props.onSelect();

const openSettings = async (): Promise<void> => {
  await commands.execute(DefaultCommands.OPEN_EXTENSION_SETTINGS, {
    extensionName: extensionName.value,
  });
};
</script>

<style lang="scss" scoped>
.extension-item {
  --extension-actions-width: calc(
    var(--btn-action-sm-size) + var(--gap-sm) + var(--toggle-width)
  );

  height: 100%;
  min-width: 0;
  padding: var(--completion-item-padding);
  text-align: left;
}

.extension-name {
  min-width: 0;
  flex: 1;
}

.extension-description {
  min-width: 0;
  flex: 0 1 45%;
}

.extension-actions {
  flex: 0 0 var(--extension-actions-width);
}

@include mobile {
  .extension-description {
    display: none;
  }
}
</style>
