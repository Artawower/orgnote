<template>
  <page-wrapper centered>
    <app-card type="warning">
      <template #cardTitle>{{ t(I18N.NO_FILE_READER_FOR) }}</template>
      <app-code v-if="path" :code="path" />
    </app-card>
  </page-wrapper>
</template>

<script lang="ts" setup>
import { I18N } from 'orgnote-api';
import { useI18n } from 'vue-i18n';
import AppCard from './AppCard.vue';
import AppCode from './AppCode.vue';
import PageWrapper from './PageWrapper.vue';

defineProps<{
  path?: string;
}>();

const { t } = useI18n();
</script>
