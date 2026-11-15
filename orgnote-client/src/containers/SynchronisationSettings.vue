<template>
  <app-flex column start align-start gap="md">
    <sync-setup-controls require-active-user-for-unavailable />
    <template v-if="syncAvailable">
      <app-description v-if="!user" padded>
        <div class="capitalize">{{ t(I18N.AVAILABLE_FOR_SUBSCRIPTION) }}</div>
      </app-description>

      <menu-group v-if="user && !canUseRemoteFeatures">
        <menu-item type="warning" icon="warning">
          {{ t(I18N.AVAILABLE_FOR_SUBSCRIPTION) }}
        </menu-item>
        <command-menu-item :command="DefaultCommands.SUBSCRIPTION_SETTINGS" />
      </menu-group>

      <menu-group>
        <command-menu-item
          :command="DefaultCommands.SYNC_FILES"
          type="danger"
          :disabled="!canUseRemoteFeatures"
        >
          <div class="capitalize text-medium">{{ t(I18N.FORCE_SYNC) }}</div>
        </command-menu-item>
      </menu-group>
      <app-description>{{ t(I18N.FORCE_SYNC_DESCRIPTION) }}</app-description>
    </template>
  </app-flex>
</template>

<script lang="ts" setup>
import { DefaultCommands, I18N } from 'orgnote-api';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import AppDescription from 'src/components/AppDescription.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServerEnvironmentStore } from 'src/stores/server-environment';
import { canUseRemoteAccountFeatures } from 'src/utils/server-capabilities';
import CommandMenuItem from './CommandMenuItem.vue';
import MenuItem from './MenuItem.vue';
import AppFlex from 'src/components/AppFlex.vue';
import SyncSetupControls from './SyncSetupControls.vue';

const authStore = api.core.useAuth();
const { user } = storeToRefs(authStore);
const { isSelfHosted } = storeToRefs(useServerEnvironmentStore());
const { config } = storeToRefs(api.core.useConfig());

const canUseRemoteFeatures = computed(() =>
  canUseRemoteAccountFeatures(user.value, isSelfHosted.value),
);

const syncAvailable = computed(
  () => config.value.synchronization.type && config.value.synchronization.type !== 'none',
);

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>
