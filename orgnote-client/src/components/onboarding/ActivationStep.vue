<template>
  <page-wrapper centered>
    <app-flex column center align-center gap="md" full-width>
      <app-title :level="2" center>
        {{ t(I18N.AUTH_ENTER_ACTIVATION_KEY) }}
      </app-title>
      <app-description center>
        {{ t(I18N.ONBOARDING_SERVER_SUBSCRIPTION_NOTE) }}
      </app-description>

      <menu-group>
        <menu-item @click="inputRef?.focus()">
          <app-input
            v-model="activationKey"
            ref="inputRef"
            :placeholder="t(I18N.SUBSCRIPTION_KEY)"
          />
        </menu-item>
        <menu-item @click="activate" :disabled="!activationKey || activating" type="info">
          <div class="capitalize text-medium">{{ activating ? '...' : t(I18N.ACTIVATE) }}</div>
        </menu-item>
      </menu-group>

      <app-card v-if="errorMessage" type="danger">
        {{ errorMessage }}
      </app-card>

      <app-card type="info">
        <template #cardTitle>
          <div class="capitalize">{{ t(I18N.WANT_SUBSCRIPTION) }}</div>
        </template>
        <app-description>
          <ul>
            <li>
              <app-link href="https://about.org-note.com" class="capitalize">
                {{ t(I18N.SIGNUP_FOR_BETA) }}
              </app-link>
              {{ t(I18N.ACTIVE_TESTERS_KEY) }}
            </li>
            <li class="capitalize">{{ t(I18N.OPEN_SOURCE_DEVELOPER_WRITE) }}</li>
            <li class="capitalize">{{ t(I18N.TRY_OWN_SERVER) }}</li>
            <li>
              <app-link :href="PATREON_LINK">{{ t(I18N.SUBSCRIBE_PATREON) }}</app-link>
            </li>
          </ul>
        </app-description>
      </app-card>
    </app-flex>
  </page-wrapper>
</template>

<script lang="ts" setup>
import PageWrapper from 'src/components/PageWrapper.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppTitle from 'src/components/AppTitle.vue';
import AppDescription from 'src/components/AppDescription.vue';
import AppInput from 'src/components/AppInput.vue';
import AppCard from 'src/components/AppCard.vue';
import AppLink from 'src/components/AppLink.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import { ref } from 'vue';
import { PATREON_LINK } from 'src/constants/external-link';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const authStore = api.core.useAuth();
const inputRef = ref<typeof AppInput | undefined>();
const activationKey = ref('');
const activating = ref(false);
const errorMessage = ref('');

const activate = async (): Promise<void> => {
  if (!activationKey.value) return;

  errorMessage.value = '';
  activating.value = true;
  const success = await authStore.subscribe(activationKey.value);
  activating.value = false;

  if (success) return;
  errorMessage.value = t(I18N.ACTIVATION_FAILED);
};
</script>
