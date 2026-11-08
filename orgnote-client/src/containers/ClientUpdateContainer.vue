<template>
  <safe-area fit>
    <container-layout gap="md">
      <app-flex column start align-stretch gap="md">
        <card-wrapper padding class="change-log-card">
          <app-flex column start align-stretch gap="md">
            <app-title :level="5">
              {{ t(I18N.UPDATED_TO_VERSION, { version: props.update.version }) }}
              <template v-if="props.update.fromVersion">
                {{ t(I18N.UPDATED_FROM_VERSION, { version: props.update.fromVersion }) }}
              </template>
            </app-title>
            <div class="change-log">
              <markdown-preview-editor :content="props.update.changeLog" />
            </div>
          </app-flex>
        </card-wrapper>
      </app-flex>

      <template v-if="props.update.url" #footer>
        <menu-group>
          <menu-item type="info" icon="open_in_new" @click="openReleaseNotes">
            {{ t(I18N.OPEN_RELEASE_NOTES) }}
          </menu-item>
        </menu-group>
      </template>
    </container-layout>
  </safe-area>
</template>

<script setup lang="ts">
import type { ChangelogRecord } from 'orgnote-api';
import { I18N } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';
import AppTitle from 'src/components/AppTitle.vue';
import CardWrapper from 'src/components/CardWrapper.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import SafeArea from 'src/components/SafeArea.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import MarkdownPreviewEditor from 'src/containers/SourceCodeEditor/MarkdownPreviewEditor.vue';
import { openExternalUrl } from 'src/utils/open-external-url';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  update: ChangelogRecord;
}>();

const { t } = useI18n({ useScope: 'global', inheritLocale: true });

const openReleaseNotes = (): void => {
  openExternalUrl(props.update.url);
};
</script>

<style scoped lang="scss">
.change-log-card {
  min-height: 0;
}

.change-log {
  max-height: var(--changelog-max-height, 50vh);
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: var(--line-height-md);
}
</style>
