<template>
  <menu-item @click="pickPath" type="info">
    {{ t(folder ? I18N.PICK_FOLDER : I18N.PICK_FILE) }}
  </menu-item>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import MenuItem from './MenuItem.vue';
import { I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import FileManager from './FileManager.vue';

defineProps<{
  folder?: boolean;
  multiFiles?: boolean;
}>();

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const modal = api.ui.useModal();

const emits = defineEmits<{
  (e: 'picked', path: string): void;
}>();

const pickPath = () => {
  modal.open(FileManager, {
    modalProps: {
      path: '/',
      pickDir: true,
      closable: true,
    },
    modalEmits: {
      close: () => modal.close(),
      dirPicked,
    },
  });
};

const dirPicked = (dirPath: string) => {
  emits('picked', dirPath);
  modal.close();
};
</script>
