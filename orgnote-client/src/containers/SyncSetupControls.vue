<template>
  <app-flex column start align-start gap="md" full-width>
    <settings-scheme class="sync-scheme" :scheme="syncScheme" path="synchronization" />
    <api-settings v-if="syncAvailable" />

    <template v-if="syncAvailable">
      <app-description :center="centerDescriptions">
        {{ t(I18N.CLI_INSTALL_DESCRIPTION) }}
      </app-description>
      <app-code :code="cliInstallInstructions" />
      <menu-group>
        <command-menu-item :command="DefaultCommands.COPY_CLI_INSTALL_COMMAND" />
      </menu-group>
    </template>

    <template v-if="canCopySyncProfile">
      <app-description :center="centerDescriptions">
        {{ t(I18N.SYNC_PROFILE_CONFIG_DESCRIPTION) }}
      </app-description>
      <menu-group>
        <command-menu-item :command="DefaultCommands.EXPORT_LOCAL_SYNC_CONFIG" />
        <command-menu-item :command="DefaultCommands.DOWNLOAD_LOCAL_SYNC_CONFIG" />
        <command-menu-item :command="DefaultCommands.COPY_EMACS_USE_PACKAGE_CONFIG" />
      </menu-group>
    </template>

    <app-description v-else-if="showUnavailable" :center="centerDescriptions" padded>
      {{ t(I18N.SYNC_PROFILE_CONFIG_UNAVAILABLE) }}
    </app-description>
  </app-flex>
</template>

<script lang="ts" setup>
import { DefaultCommands, I18N, ORG_NOTE_CONFIG_SCHEMA } from 'orgnote-api';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import AppDescription from 'src/components/AppDescription.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppCode from 'src/components/AppCode.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import ApiSettings from 'src/containers/ApiSettings.vue';
import CommandMenuItem from 'src/containers/CommandMenuItem.vue';
import SettingsScheme from 'src/containers/SettingsScheme.vue';
import { getCliInstallInstructions } from 'src/constants/cli-install-scripts';
import { valibotScheme } from 'src/models/valibot-scheme';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServerEnvironmentStore } from 'src/stores/server-environment';
import { canUseRemoteAccountFeatures } from 'src/utils/server-capabilities';

const props = withDefaults(
  defineProps<{
    centerDescriptions?: boolean;
    requireActiveUserForUnavailable?: boolean;
  }>(),
  {
    centerDescriptions: false,
    requireActiveUserForUnavailable: false,
  },
);

const syncScheme = valibotScheme(ORG_NOTE_CONFIG_SCHEMA.entries.synchronization);
const settings = api.core.useSettings();
settings.loadApiTokens();

const authStore = api.core.useAuth();
const { user } = storeToRefs(authStore);
const { isSelfHosted } = storeToRefs(useServerEnvironmentStore());
const { tokens } = storeToRefs(settings);
const { config } = storeToRefs(api.core.useConfig());
const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const cliInstallInstructions = getCliInstallInstructions();

const syncAvailable = computed(
  () => config.value.synchronization.type && config.value.synchronization.type !== 'none',
);

const canCopySyncProfile = computed(() => syncAvailable.value && tokens.value.length > 0);
const canUseRemoteFeatures = computed(() =>
  canUseRemoteAccountFeatures(user.value, isSelfHosted.value),
);
const showUnavailable = computed(
  () => !props.requireActiveUserForUnavailable || canUseRemoteFeatures.value,
);
</script>

<style lang="scss" scoped>
.sync-scheme {
  width: 100%;
}
</style>
