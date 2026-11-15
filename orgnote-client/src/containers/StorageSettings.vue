<template>
  <storage-picker>
    <template #header>
      <app-description>
        {{ t(I18N.CHOOSE_FILE_SYSTEM) }}
      </app-description>
    </template>
  </storage-picker>
</template>

<script lang="ts" setup>
import StoragePicker from './StoragePicker.vue';
import AppDescription from 'src/components/AppDescription.vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
</script>
