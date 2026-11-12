<template>
  <modal-dialog v-if="activeModal" :key="activeModal.id" :modal-data="activeModal" />
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import ModalDialog from './ModalDialog.vue';
import { KEYBINDING_CONTEXTS } from 'orgnote-api';

const { modals } = storeToRefs(api.ui.useModal());
const keybindings = api.core.useKeybindings();

const syncModalContext = (newLen: number, oldLen = 0): void => {
  const delta = newLen - oldLen;
  const action = delta > 0 ? keybindings.pushContext : keybindings.popContext;
  Array.from({ length: Math.abs(delta) }).forEach(() => action(KEYBINDING_CONTEXTS.MODAL));
};

watch(() => modals.value.length, syncModalContext);

const activeModal = computed(() => modals.value[modals.value.length - 1]);
</script>
