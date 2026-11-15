<template>
  <action-button @click="returnBack" color="blue" icon="sym_o_chevron_left" size="sm" />
</template>

<script lang="ts" setup>
import type { Router } from 'vue-router';
import { useRouter } from 'vue-router';
import ActionButton from './ActionButton.vue';

const props = defineProps<{
  to?: string;
  router?: Router;
  onReturnBack?: () => void;
}>();

const router = props.router ?? useRouter();

const returnBack = () => {
  if (props.onReturnBack) {
    props.onReturnBack();
    return;
  }

  if (props.to) {
    router.push(props.to);
  } else {
    router.back();
  }
};
</script>

<style lang="scss" scoped></style>
