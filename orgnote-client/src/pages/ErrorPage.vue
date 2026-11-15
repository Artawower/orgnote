<template>
  <page-wrapper padding constrained centered class="error-page">
    <safe-area class="error-surface" fit>
      <content-frame padding full-height>
        <container-layout gap="lg" :body-scroll="false">
          <template #header>
            <info-card
              icon="sym_o_error"
              :title="$t(I18N.CRITICAL_ERROR)"
              :description="$t(I18N.ERROR_DESCRIPTION)"
              type="danger"
            />
          </template>

          <app-logs />

          <template #footer>
            <menu-group class="error-actions">
              <menu-item type="info" @click="safeCopyToClipboard(errorLogText)">
                {{ $t(I18N.COPY_LOG) }}
              </menu-item>
              <menu-item type="danger" @click="reload">
                {{ $t(I18N.RELOAD) }}
              </menu-item>
            </menu-group>
          </template>
        </container-layout>
      </content-frame>
    </safe-area>
  </page-wrapper>
</template>

<script setup lang="ts">
import PageWrapper from 'src/components/PageWrapper.vue';
import ContentFrame from 'src/components/ContentFrame.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import InfoCard from 'src/components/InfoCard.vue';
import AppLogs from 'src/containers/AppLogs.vue';
import { I18N } from 'orgnote-api';
import { useAppLogs } from 'src/composables/useAppLogs';
import MenuItem from 'src/containers/MenuItem.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import SafeArea from 'src/components/SafeArea.vue';
import { useInteractiveClipboard } from 'src/composables/use-interactive-clipboard';

const { errorLogText } = useAppLogs();
const { safeCopyToClipboard } = useInteractiveClipboard();

const reload = (): void => {
  window.location.assign('/');
};
</script>

<style lang="scss" scoped>
.error-page {
  background: var(--error-page-bg, var(--bg-secondary));
}

.error-surface {
  --safe-area-top: var(--app-top-inset);
  --card-bg: transparent;

  @include fit;

  background: var(--error-page-content-bg, var(--bg));
  border-radius: var(--error-page-radius, var(--border-radius-md));
  overflow: hidden;
}

.error-actions {
  --menu-group-bg: var(--error-page-content-bg, var(--bg));

  position: relative;
  z-index: 1;
}
</style>
