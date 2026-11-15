<template>
  <safe-area fit>
    <container-layout gap="md" :body-scroll="true">
      <app-flex column start align-stretch gap="md">
        <card-wrapper padding>
          <app-flex column start align-stretch gap="xs">
            <h2 class="note-title">{{ noteInfo.title }}</h2>
            <div v-if="noteInfo.description" class="note-description">
              {{ noteInfo.description }}
            </div>
            <div class="info-key">{{ noteInfo.filePath }}</div>
          </app-flex>
        </card-wrapper>

        <card-wrapper padding>
          <app-flex column start align-stretch gap="sm">
            <app-flex
              v-for="item in detailItems"
              :key="item.label"
              row
              between
              align-center
              gap="md"
            >
              <span class="info-key">{{ t(item.label) }}</span>
              <span>{{ item.value }}</span>
            </app-flex>
          </app-flex>
        </card-wrapper>

        <card-wrapper v-if="normalizedTags.length" padding>
          <org-tags :tags="normalizedTags" :clickable="false" badge-size="xs" />
        </card-wrapper>
      </app-flex>

      <template #footer>
        <menu-group>
          <menu-item type="info" @click="copyInfo">{{ t(I18N.COPY) }}</menu-item>
        </menu-group>
      </template>
    </container-layout>
  </safe-area>
</template>

<script lang="ts" setup>
import { I18N } from 'orgnote-api';
import { computed } from 'vue';
import { api } from 'src/boot/api';
import { usePrettyDate } from 'src/composables/use-pretty-date';
import type { NoteInfoModalData } from 'src/utils/current-note-info';
import AppFlex from 'src/components/AppFlex.vue';
import CardWrapper from 'src/components/CardWrapper.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import OrgTags from 'src/components/org-nodes/OrgTags.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import SafeArea from 'src/components/SafeArea.vue';
import MenuItem from 'src/containers/MenuItem.vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  noteInfo: NoteInfoModalData;
}>();

const { prettyDate } = usePrettyDate();

const normalizeDate = (value?: string): string => {
  if (!value) {
    return '-';
  }

  return prettyDate(value);
};

const detailItems = computed(() => {
  return [
    { label: I18N.NOTE_INFO_TAGS, value: String(props.noteInfo.tags.length) },
    { label: I18N.NOTE_INFO_LINKS, value: String(props.noteInfo.linksCount) },
    { label: I18N.NOTE_INFO_BACKLINKS, value: String(props.noteInfo.backlinksCount) },
    { label: I18N.NOTE_INFO_CREATED, value: normalizeDate(props.noteInfo.createdAt) },
    { label: I18N.NOTE_INFO_UPDATED, value: normalizeDate(props.noteInfo.updatedAt) },
    { label: I18N.NOTE_INFO_LAST_OPENED, value: normalizeDate(props.noteInfo.touchedAt) },
    { label: I18N.NOTE_INFO_LAST_SYNC, value: normalizeDate(props.noteInfo.lastSyncAt) },
  ];
});

const normalizedTags = computed(() =>
  props.noteInfo.tags.filter((tag) => tag.trim().length > 0).map((tag) => `#${tag}`),
);

const copyInfo = async () => {
  await api.utils.copyToClipboard(
    JSON.stringify(
      {
        ...props.noteInfo,
      },
      null,
      2,
    ),
  );
  api.core.useNotifications().notify({
    message: I18N.COPIED_TO_CLIPBOARD,
    level: 'info',
  });
};

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.note-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.note-description {
  color: var(--fg);
  line-height: var(--line-height-md);
}

.info-key {
  color: var(--fg-muted);
}
</style>
