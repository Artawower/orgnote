<template>
  <page-wrapper centered>
    <app-flex column center align-center gap="md" full-width>
      <app-title :level="2" center>
        {{ t(I18N.ONBOARDING_EMACS_TITLE) }}
      </app-title>
      <app-description center>
        {{ t(I18N.ONBOARDING_EMACS_DESCRIPTION) }}
      </app-description>
      <app-description center>
        {{ t(I18N.ONBOARDING_EMACS_CONFIG_CONTENT) }}
      </app-description>
      <app-code :code="installationScript" />
      <menu-group>
        <menu-item @click="copyConfig" type="info">
          {{ t(I18N.EMACS_USE_PACKAGE_COPY_CONFIG) }}
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
import AppCode from 'src/components/AppCode.vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import { useInteractiveClipboard } from 'src/composables/use-interactive-clipboard';
import { getUsePackageInstructions } from 'src/constants/install-scripts';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const { safeCopyToClipboard } = useInteractiveClipboard();

const installationScript = getUsePackageInstructions();

const copyConfig = (): void => {
  safeCopyToClipboard(installationScript);
};
</script>
