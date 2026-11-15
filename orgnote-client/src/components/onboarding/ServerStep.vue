<template>
  <page-wrapper centered>
    <app-flex column center align-center gap="lg" full-width>
      <app-title :level="2" center>
        {{ t(I18N.ONBOARDING_SERVER_TITLE) }}
      </app-title>
      <app-description center>
        {{ t(I18N.ONBOARDING_SERVER_DESCRIPTION) }}
      </app-description>
      <app-input
        disable
        outlined
        model-value=""
        placeholder="https://orgnote.com"
        class="server-input"
      />
      <app-description type="info" center>
        {{ t(I18N.ONBOARDING_SERVER_COMING_SOON) }}
      </app-description>
      <app-description center class="disclaimer">
        {{ t(I18N.ONBOARDING_SERVER_SUBSCRIPTION_NOTE) }}
      </app-description>
    </app-flex>
  </page-wrapper>
</template>

<script lang="ts" setup>
import PageWrapper from 'src/components/PageWrapper.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppTitle from 'src/components/AppTitle.vue';
import AppDescription from 'src/components/AppDescription.vue';
import AppInput from 'src/components/AppInput.vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
</script>

<style lang="scss" scoped>
.server-input {
  width: 100%;
  text-align: center;
}

.disclaimer {
  font-style: italic;
}
</style>
