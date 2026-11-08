<template>
  <div v-if="isPlatformMatched">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Platform } from 'quasar';

interface Props {
  mobile?: boolean;
  desktop?: boolean;
  ios?: boolean;
  android?: boolean;
}

const props = defineProps<Props>();

const isPlatformMatched = computed(
  () =>
    (props.mobile && Platform.is.mobile) ||
    (props.desktop && Platform.is.desktop) ||
    (props.ios && Platform.is.ios) ||
    (props.android && Platform.is.android),
);
</script>
