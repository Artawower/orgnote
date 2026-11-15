<template>
  <tab-overview-mobile @selected="modal.close" />
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';
import TabOverviewMobile from './TabOverviewMobile.vue';
import { watch } from 'vue';

const modal = api.ui.useModal();

const { desktopAbove } = api.ui.useScreenDetection();

watch(desktopAbove, (desktopAbove) => {
  if (!desktopAbove) {
    return;
  }
  modal.close();
});
</script>
