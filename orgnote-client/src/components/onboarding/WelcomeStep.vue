<template>
  <page-wrapper centered>
    <app-flex column center align-center gap="xl" class="welcome">
      <app-logo :size="120" />
      <app-title :level="2" center>
        {{ t(I18N.ONBOARDING_WELCOME_TITLE) }}
      </app-title>
      <app-description center>
        {{ t(I18N.ONBOARDING_WELCOME_DESCRIPTION) }}
      </app-description>
    </app-flex>
  </page-wrapper>
</template>

<script lang="ts" setup>
import PageWrapper from 'src/components/PageWrapper.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppLogo from 'src/components/AppLogo.vue';
import AppDescription from 'src/components/AppDescription.vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import AppTitle from '../AppTitle.vue';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
</script>
