<template>
  <page-wrapper centered>
    <app-flex column center align-center gap="md" full-width>
      <app-title :level="2" center>
        {{ t(I18N.ONBOARDING_AUTH_TITLE) }}
      </app-title>
      <app-description center>
        {{ t(I18N.ONBOARDING_AUTH_DESCRIPTION) }}
      </app-description>
      <menu-group>
        <menu-item type="info" @click="signIn">
          {{ t(I18N.ONBOARDING_AUTH_GITHUB) }}
        </menu-item>
      </menu-group>
    </app-flex>
  </page-wrapper>
</template>

<script lang="ts" setup>
import PageWrapper from 'src/components/PageWrapper.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppTitle from 'src/components/AppTitle.vue';
import AppDescription from 'src/components/AppDescription.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { buildOrgNoteUrl } from 'src/utils/build-orgnote-url';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const signIn = async (): Promise<void> => {
  const authStore = api.core.useAuth();
  const result = await to(() =>
    authStore.auth({
      provider: 'github',
      redirectUrl: buildOrgNoteUrl('onboarding'),
    }),
  )();
  if (result.isErr()) reporter.reportError(result.error);
};
</script>
