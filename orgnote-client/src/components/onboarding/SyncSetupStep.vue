<template>
  <page-wrapper centered>
    <app-flex column center align-center gap="md" full-width>
      <app-title :level="2" center>
        {{ t(I18N.ONBOARDING_SYNC_TITLE) }}
      </app-title>
      <app-description center>
        {{ t(I18N.ONBOARDING_SYNC_DESCRIPTION) }}
      </app-description>
      <sync-setup-controls center-descriptions />
    </app-flex>
  </page-wrapper>
</template>

<script lang="ts" setup>
import { I18N } from 'orgnote-api';
import PageWrapper from 'src/components/PageWrapper.vue';
import AppDescription from 'src/components/AppDescription.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppTitle from 'src/components/AppTitle.vue';
import SyncSetupControls from 'src/containers/SyncSetupControls.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
</script>
