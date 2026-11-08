<template>
  <page-wrapper centered>
    <app-flex column center align-center gap="md" full-width>
      <app-title :level="2" center capitalize>
        {{ t(I18N.CHOOSE_FILE_SYSTEM) }}
      </app-title>
      <storage-picker hide-warning />
    </app-flex>
  </page-wrapper>
</template>

<script lang="ts" setup>
import PageWrapper from 'src/components/PageWrapper.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppTitle from 'src/components/AppTitle.vue';
import StoragePicker from 'src/containers/StoragePicker.vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import { storeToRefs } from 'pinia';
import { computed, onMounted } from 'vue';

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const fsManager = api.core.useFileSystemManager();
const { currentFsName, fileSystems } = storeToRefs(fsManager);

const canProceed = computed(() => !!currentFsName.value);

onMounted(() => {
  if (currentFsName.value) return;
  if (fileSystems.value.length !== 1) return;
  void fsManager.useFs(fileSystems.value[0]!.name);
});

defineExpose({ canProceed });
</script>
