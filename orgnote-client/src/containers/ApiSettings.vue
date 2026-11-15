<template>
  <app-flex class="api-settings" column start align-start gap="md">
    <menu-group v-if="canManageTokens && tokens.length">
      <menu-item v-for="token of tokens" :key="token.id" type="plain" :capitalize="false">
        <span class="token-text">{{ token.token }}</span>
        <template #right>
          <app-flex class="actions" row start align-center gap="sm">
            <action-button
              @click="copyToken(token)"
              icon="content_copy"
              color="fg-muted"
              fire-icon="done"
              size="sm"
              fire-color="green"
              outline
              border
            />
            <action-button
              @click="removeToken(token)"
              color="red"
              icon="delete"
              size="sm"
              outline
              border
            />
          </app-flex>
        </template>
      </menu-item>
    </menu-group>

    <menu-group>
      <menu-item @click="createToken" type="info" :disabled="!canManageTokens">
        <div class="capitalize">{{ t(I18N.CREATE_NEW_TOKEN) }}</div>
      </menu-item>
    </menu-group>
  </app-flex>
</template>

<script lang="ts" setup>
import type { ModelsAPIToken } from 'orgnote-api/remote-api';
import { I18N } from 'orgnote-api';
import { useI18n } from 'vue-i18n';
import MenuItem from './MenuItem.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { computed } from 'vue';
import { useServerEnvironmentStore } from 'src/stores/server-environment';
import { canUseRemoteAccountFeatures } from 'src/utils/server-capabilities';

const settingsStore = api.core.useSettings();
const authStore = api.core.useAuth();
const { tokens } = storeToRefs(settingsStore);
const { user } = storeToRefs(authStore);
const { isSelfHosted } = storeToRefs(useServerEnvironmentStore());

const canManageTokens = computed(() =>
  canUseRemoteAccountFeatures(user.value, isSelfHosted.value),
);

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const copyToken = (token: ModelsAPIToken) => {
  api.utils.copyToClipboard(token.token ?? '');
};

const removeToken = (token: ModelsAPIToken) => {
  settingsStore.removeApiToken(token);
};

const createToken = () => {
  settingsStore.createApiToken();
};
</script>

<style lang="scss" scoped>
.api-settings {
  & {
    width: 100%;
  }
}

.token-text {
  font-family: monospace;
  font-size: 0.85em;
}

.actions {
  & {
    opacity: 0;
  }
}

.menu-item {
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      .actions {
        opacity: 1;
      }
    }
  }
}
</style>
