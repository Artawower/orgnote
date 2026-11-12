<template>
  <router-view />
</template>
<script setup lang="ts">
import { nextTick, onMounted } from 'vue';
import { api } from './boot/api';
import { BOOT_SCOPE, recordEvent } from './boot/perf-timer';
import { useBodyClasses } from './composables/use-body-classes';
import { useViewportBehavior } from './composables/use-viewport-behavior';
import { useUrlCommandHandler } from './composables/use-url-command-handler';

const waitForAnimationFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
};

api.ui.useBackgroundSettings().setBackground();
useBodyClasses();
useViewportBehavior();
useUrlCommandHandler();

onMounted(async () => {
  recordEvent(BOOT_SCOPE, 'app-mounted');
  await nextTick();
  await waitForAnimationFrame();
  await api.ui.useSplashScreen().hide();
  recordEvent(BOOT_SCOPE, 'splash-hidden');
});
</script>
